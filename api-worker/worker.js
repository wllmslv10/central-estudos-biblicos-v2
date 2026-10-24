import pg from "pg";
import {
  hashPassword,
  verifyPassword,
  newSessionToken,
  hashSessionToken,
  sessionExpiry,
} from "./auth.js";

const { Client } = pg;
const ALLOWED_ORIGIN = "https://wllmslv10.github.io";
const SESSION_COOKIE = "ceb_session";
const MAX_BODY_BYTES = 16_384;
const LOGIN_WINDOW_MINUTES = 15;
const MAX_LOGIN_ATTEMPTS = 8;

function json(data, status = 200, origin = "", extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  };
  if (origin === ALLOWED_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Vary"] = "Origin";
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function cookie(token, maxAge) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}`;
}

function clearCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`;
}

function getToken(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (match) return match[1];
  const auth = request.headers.get("Authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
}

async function readBody(request) {
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  try { return JSON.parse(text); } catch { throw new Error("INVALID_JSON"); }
}

function validUsername(username) {
  return typeof username === "string" && /^[A-Za-z0-9._-]{3,32}$/.test(username);
}

function validPassword(password) {
  return typeof password === "string" && password.length >= 12 && password.length <= 200;
}

async function db(env) {
  if (!env.HYPERDRIVE?.connectionString) throw new Error("DATABASE_NOT_CONFIGURED");
  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    connectionTimeoutMillis: 5000,
    query_timeout: 8000,
    application_name: "ceb-biblioteca-api",
  });
  await client.connect();
  return client;
}

async function currentUser(client, request) {
  const token = getToken(request);
  if (!token || token.length > 200) return null;
  const tokenHash = await hashSessionToken(token);
  const result = await client.query(
    `SELECT u.id, u.username, u.display_name, u.app_role, u.must_change_password
       FROM public.ceb_sessions s
       JOIN public.ceb_users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > NOW()
        AND u.is_active = TRUE
      LIMIT 1`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.app_role,
    must_change_password: user.must_change_password,
  };
}

async function route(request, env, origin, url) {
  if (url.pathname === "/" && request.method === "GET") {
    return json({ api: "CEB - Central de Estudos Bíblicos", status: "online", version: "0.3.0-auth" }, 200, origin);
  }

  if (url.pathname === "/health" && request.method === "GET") {
    let client;
    try {
      client = await db(env);
      const result = await client.query(`
        SELECT NOW() AS horario,
          to_regclass('public.ceb_users') IS NOT NULL AS tabela_usuarios,
          to_regclass('public.ceb_studies') IS NOT NULL AS tabela_estudos,
          to_regclass('public.ceb_sessions') IS NOT NULL AS tabela_sessoes,
          to_regclass('public.ceb_login_attempts') IS NOT NULL AS tabela_tentativas
      `);
      const row = result.rows[0];
      return json({
        api: "online", database: "conectado",
        tabelas: {
          usuarios: row.tabela_usuarios, estudos: row.tabela_estudos,
          sessoes: row.tabela_sessoes, tentativas_login: row.tabela_tentativas,
        },
        horario: row.horario,
      }, 200, origin);
    } catch (error) {
      console.error("Health check falhou:", error.message);
      return json({ api: "online", database: "indisponível", error: "Banco ou migrações indisponíveis." }, 503, origin);
    } finally {
      if (client) try { await client.end(); } catch {}
    }
  }

  // Permitir que as rotas administrativas abaixo alcancem suas verificações de sessão e papel.
  const authRoute = url.pathname.startsWith("/auth/");
  const adminRoute = url.pathname === "/admin/users" || url.pathname.startsWith("/admin/users/");
  if (!authRoute && !adminRoute) return json({ error: "Rota não encontrada." }, 404, origin);

  let client;
  try {
    client = await db(env);

    if (url.pathname === "/auth/login" && request.method === "POST") {
      const body = await readBody(request);
      const username = typeof body.username === "string" ? body.username.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (!validUsername(username) || password.length < 1 || password.length > 200) {
        return json({ error: "Usuário ou senha inválidos." }, 400, origin);
      }
      const normalized = username.toLowerCase();
      const attempts = await client.query(
        `SELECT COUNT(*)::int AS n FROM public.ceb_login_attempts
          WHERE username_normalized = $1 AND attempted_at > NOW() - ($2 * INTERVAL '1 minute') AND succeeded = FALSE`,
        [normalized, LOGIN_WINDOW_MINUTES]
      );
      if (attempts.rows[0].n >= MAX_LOGIN_ATTEMPTS) {
        return json({ error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." }, 429, origin);
      }

      const found = await client.query(
        `SELECT id, username, password_hash, display_name, app_role, is_active, must_change_password
           FROM public.ceb_users WHERE LOWER(username) = $1 LIMIT 1`,
        [normalized]
      );
      const user = found.rows[0];
      const verified = Boolean(user && user.is_active && user.password_hash && await verifyPassword(password, user.password_hash));
      await client.query(
        "INSERT INTO public.ceb_login_attempts (username_normalized, succeeded) VALUES ($1, $2)",
        [normalized, verified]
      );
      if (!verified) return json({ error: "Usuário ou senha inválidos." }, 401, origin);

      const token = await newSessionToken();
      const expiry = sessionExpiry();
      await client.query(
        "INSERT INTO public.ceb_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        [user.id, await hashSessionToken(token), expiry]
      );
      const maxAge = Math.floor((expiry.getTime() - Date.now()) / 1000);
      return json({ user: publicUser(user), expires_at: expiry.toISOString() }, 200, origin, {
        "Set-Cookie": cookie(token, maxAge),
      });
    }

    if (url.pathname === "/auth/me" && request.method === "GET") {
      const user = await currentUser(client, request);
      if (!user) return json({ error: "Sessão inválida ou expirada." }, 401, origin, { "Set-Cookie": clearCookie() });
      return json({ user: publicUser(user) }, 200, origin);
    }

    if (url.pathname === "/auth/logout" && request.method === "POST") {
      const token = getToken(request);
      if (token) {
        await client.query(
          "UPDATE public.ceb_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL",
          [await hashSessionToken(token)]
        );
      }
      return json({ ok: true }, 200, origin, { "Set-Cookie": clearCookie() });
    }

    if (url.pathname === "/auth/change-password" && request.method === "POST") {
      const user = await currentUser(client, request);
      if (!user) return json({ error: "Sessão inválida ou expirada." }, 401, origin);
      const body = await readBody(request);
      if (!validPassword(body.new_password)) {
        return json({ error: "A nova senha deve ter entre 12 e 200 caracteres." }, 400, origin);
      }
      const token = getToken(request);
      const newHash = await hashPassword(body.new_password);
      await client.query("BEGIN");
      try {
        await client.query(
          "UPDATE public.ceb_users SET password_hash = $1, must_change_password = FALSE, updated_at = NOW() WHERE id = $2",
          [newHash, user.id]
        );
        await client.query(
          "UPDATE public.ceb_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL AND token_hash <> $2",
          [user.id, await hashSessionToken(token)]
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      return json({ ok: true, user: { ...publicUser(user), must_change_password: false } }, 200, origin);
    }

    // Bootstrap único: exige secret configurado no Worker e só funciona enquanto não houver administrador com username.
    if (url.pathname === "/admin/bootstrap" && request.method === "POST") {
      const configuredSecret = env.CEB_BOOTSTRAP_SECRET;
      const suppliedSecret = request.headers.get("X-CEB-Bootstrap-Secret") || "";
      if (!configuredSecret || suppliedSecret.length !== configuredSecret.length ||
          !crypto.subtle || suppliedSecret !== configuredSecret) {
        return json({ error: "Bootstrap não autorizado ou desativado." }, 403, origin);
      }
      const existingAdmin = await client.query(
        "SELECT 1 FROM public.ceb_users WHERE app_role = 'admin' AND username IS NOT NULL LIMIT 1"
      );
      if (existingAdmin.rowCount > 0) {
        return json({ error: "O administrador inicial já foi criado. Desative CEB_BOOTSTRAP_SECRET." }, 409, origin);
      }
      const body = await readBody(request);
      const username = typeof body.username === "string" ? body.username.trim() : "";
      const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
      const password = body.password;
      if (!validUsername(username) || !displayName || displayName.length > 120 || !validPassword(password)) {
        return json({ error: "Informe usuário válido, nome e senha com pelo menos 12 caracteres." }, 400, origin);
      }
      const passwordHash = await hashPassword(password);
      const created = await client.query(
        `INSERT INTO public.ceb_users (username, display_name, password_hash, app_role, is_active, must_change_password)
         VALUES ($1, $2, $3, 'admin', TRUE, FALSE)
         RETURNING id, username, display_name, app_role, is_active, must_change_password, created_at`,
        [username, displayName, passwordHash]
      );
      return json({ user: created.rows[0], message: "Administrador inicial criado. Remova imediatamente o secret CEB_BOOTSTRAP_SECRET das variáveis do Worker." }, 201, origin);
    }

    if (url.pathname === "/admin/users" && request.method === "POST") {
      const admin = await currentUser(client, request);
      if (!admin) return json({ error: "Sessão inválida ou expirada." }, 401, origin);
      if (admin.app_role !== "admin") return json({ error: "Acesso restrito ao administrador." }, 403, origin);
      const body = await readBody(request);
      const username = typeof body.username === "string" ? body.username.trim() : "";
      const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
      const temporaryPassword = body.temporary_password;
      const role = body.role === "admin" ? "admin" : "user";
      if (!validUsername(username) || !displayName || displayName.length > 120 || !validPassword(temporaryPassword)) {
        return json({ error: "Informe usuário válido, nome e senha temporária de pelo menos 12 caracteres." }, 400, origin);
      }
      const passwordHash = await hashPassword(temporaryPassword);
      const created = await client.query(
        `INSERT INTO public.ceb_users (username, display_name, password_hash, app_role, is_active, must_change_password)
         VALUES ($1, $2, $3, $4, TRUE, TRUE)
         RETURNING id, username, display_name, app_role, is_active, must_change_password, created_at`,
        [username, displayName, passwordHash, role]
      );
      return json({ user: created.rows[0] }, 201, origin);
    }

    if (url.pathname === "/admin/users" && request.method === "GET") {
      const admin = await currentUser(client, request);
      if (!admin) return json({ error: "Sessão inválida ou expirada." }, 401, origin);
      if (admin.app_role !== "admin") return json({ error: "Acesso restrito ao administrador." }, 403, origin);
      const result = await client.query(
        "SELECT id, username, display_name, app_role, is_active, must_change_password, created_at FROM public.ceb_users WHERE username IS NOT NULL ORDER BY display_name"
      );
      return json({ users: result.rows }, 200, origin);
    }

    if (url.pathname.startsWith("/admin/users/") && request.method === "PATCH") {
      const admin = await currentUser(client, request);
      if (!admin) return json({ error: "Sessão inválida ou expirada." }, 401, origin);
      if (admin.app_role !== "admin") return json({ error: "Acesso restrito ao administrador." }, 403, origin);
      const id = url.pathname.slice("/admin/users/".length);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Identificador inválido." }, 400, origin);
      const body = await readBody(request);
      if (typeof body.is_active !== "boolean") return json({ error: "Informe is_active como verdadeiro ou falso." }, 400, origin);
      if (id === admin.id && body.is_active === false) return json({ error: "Não é permitido desativar a própria conta." }, 400, origin);
      const result = await client.query(
        "UPDATE public.ceb_users SET is_active = $1, updated_at = NOW() WHERE id = $2 AND username IS NOT NULL RETURNING id, username, display_name, app_role, is_active, must_change_password",
        [body.is_active, id]
      );
      if (!result.rowCount) return json({ error: "Usuário não encontrado." }, 404, origin);
      if (!body.is_active) await client.query("UPDATE public.ceb_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL", [id]);
      return json({ user: result.rows[0] }, 200, origin);
    }

    return json({ error: "Rota não encontrada." }, 404, origin);
  } catch (error) {
    if (error.message === "BODY_TOO_LARGE") return json({ error: "Requisição muito grande." }, 413, origin);
    if (error.message === "INVALID_JSON") return json({ error: "JSON inválido." }, 400, origin);
    if (error.code === "23505") return json({ error: "Já existe uma conta com esse nome de usuário." }, 409, origin);
    console.error("Erro na API CEB:", error.message);
    return json({ error: "Erro interno da API. Confira se as migrações necessárias foram aplicadas." }, 500, origin);
  } finally {
    if (client) try { await client.end(); } catch {}
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (origin && origin !== ALLOWED_ORIGIN) {
      return json({ error: "Origem não autorizada." }, 403);
    }
    if (request.method === "OPTIONS") {
      if (origin !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin",
        },
      });
    }
    try {
      return await route(request, env, origin, url);
    } catch (error) {
      console.error("Falha inesperada na API:", error.message);
      return json({ error: "Erro interno da API." }, 500, origin);
    }
  },
};
