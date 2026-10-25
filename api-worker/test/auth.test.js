import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import worker from "../worker.js";
import { hashPassword, verifyPassword } from "../auth.js";

test("preflight CORS permite o cabeçalho de bootstrap", async () => {
  const response = await worker.fetch(new Request("https://api.example.test/admin/bootstrap", {
    method: "OPTIONS",
    headers: {
      Origin: "https://wllmslv10.github.io",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,x-ceb-bootstrap-secret",
    },
  }), {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://wllmslv10.github.io");
  assert.match(response.headers.get("Access-Control-Allow-Headers") || "", /X-CEB-Bootstrap-Secret/i);
});

test("troca de senha valida a senha atual antes de atualizar", async () => {
  const source = await readFile(new URL("../worker.js", import.meta.url), "utf8");
  assert.match(source, /current_password/);
  assert.match(source, /verifyPassword\(body\.current_password, user\.password_hash\)/);
  assert.match(source, /A senha atual está incorreta/);
  assert.match(source, /A nova senha deve ser diferente da senha atual/);
});

test("hash de senha aceita a senha correta e rejeita uma senha incorreta", async () => {
  const hash = await hashPassword("Senha-de-teste-123!");
  assert.equal(await verifyPassword("Senha-de-teste-123!", hash), true);
  assert.equal(await verifyPassword("Outra-senha-456!", hash), false);
});

test("login completo autentica usuário ativo e cria sessão sem banco real", async () => {
  const pg = (await import("pg")).default;
  const original = {
    connect: pg.Client.prototype.connect,
    query: pg.Client.prototype.query,
    end: pg.Client.prototype.end,
  };
  const password = "Senha-de-teste-123!";
  const passwordHash = await hashPassword(password);
  const queries = [];
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    username: "cebadmin",
    password_hash: passwordHash,
    display_name: "Administrador de teste",
    app_role: "admin",
    is_active: true,
    must_change_password: true,
  };
  try {
    pg.Client.prototype.connect = async function () {};
    pg.Client.prototype.end = async function () {};
    pg.Client.prototype.query = async function (sql, params = []) {
      queries.push({ sql, params });
      if (sql.includes("FROM public.ceb_login_attempts")) return { rows: [{ n: 0 }] };
      if (sql.includes("FROM public.ceb_users")) return { rows: [user] };
      if (sql.includes("INSERT INTO public.ceb_login_attempts")) return { rowCount: 1 };
      if (sql.includes("INSERT INTO public.ceb_sessions")) return { rowCount: 1 };
      throw new Error("Consulta inesperada no teste de login");
    };
    const request = new Request("https://api.example.test/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://wllmslv10.github.io" },
      body: JSON.stringify({ username: " CebAdmin ", password }),
    });
    const response = await worker.fetch(request, { HYPERDRIVE: { connectionString: "postgresql://test:test@localhost/test" } });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.user.username, "cebadmin");
    assert.equal(body.user.must_change_password, true);
    assert.equal(body.token_type, "Bearer");
    assert.ok(body.access_token);
    assert.match(response.headers.get("Set-Cookie") || "", /HttpOnly; Secure; SameSite=None/);
    assert.ok(queries.some(q => q.sql.includes("INSERT INTO public.ceb_sessions")));
    assert.ok(queries.some(q => q.sql.includes("INSERT INTO public.ceb_login_attempts") && q.params[1] === true));
  } finally {
    pg.Client.prototype.connect = original.connect;
    pg.Client.prototype.query = original.query;
    pg.Client.prototype.end = original.end;
  }
});

test("PBKDF2 WebCrypto aceita vetor conhecido e rejeita senha diferente", async () => {
  // Vetor independente de credenciais reais; detecta divergência na leitura do hash.
  const hash = "pbkdf2_sha256$310000$-d62Saf8nl5tcyhBZ-MBpA$6gQUNjC3cwLug55m0SK12zPLdQ7BI36MKTCpWzS0RyA";
  assert.equal(await verifyPassword("TesteCEB2026!", hash), true);
  assert.equal(await verifyPassword("TesteCEB2026?", hash), false);
});
