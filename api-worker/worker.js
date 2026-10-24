import pg from "pg";

const { Client } = pg;
const ALLOWED_ORIGIN = "https://wllmslv10.github.io";

function json(data, status = 200, origin = "") {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (origin === ALLOWED_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
    headers["Vary"] = "Origin";
  }
  return new Response(JSON.stringify(data), { status, headers });
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
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin",
        },
      });
    }

    if (request.method !== "GET") {
      return json({ error: "Método não permitido." }, 405, origin);
    }

    if (url.pathname === "/") {
      return json({
        api: "CEB - Central de Estudos Bíblicos",
        status: "online",
        version: "0.2.0",
      }, 200, origin);
    }

    if (url.pathname === "/health") {
      if (!env.HYPERDRIVE?.connectionString) {
        return json({ api: "online", database: "não configurado" }, 503, origin);
      }

      const client = new Client({
        connectionString: env.HYPERDRIVE.connectionString,
        connectionTimeoutMillis: 5000,
        query_timeout: 5000,
        application_name: "ceb-biblioteca-api",
      });

      try {
        await client.connect();
        const result = await client.query(`
          SELECT
            NOW() AS horario,
            to_regclass('public.ceb_users') IS NOT NULL AS tabela_usuarios,
            to_regclass('public.ceb_studies') IS NOT NULL AS tabela_estudos
        `);
        const row = result.rows[0];
        return json({
          api: "online",
          database: "conectado",
          tabelas: {
            usuarios: row.tabela_usuarios,
            estudos: row.tabela_estudos,
          },
          horario: row.horario,
        }, 200, origin);
      } catch (error) {
        console.error("Falha na conexão com Neon:", error.message);
        return json({
          api: "online",
          database: "indisponível",
          error: "Não foi possível conectar ou consultar o banco.",
        }, 503, origin);
      } finally {
        try { await client.end(); } catch {}
      }
    }

    return json({ error: "Rota não encontrada." }, 404, origin);
  },
};
