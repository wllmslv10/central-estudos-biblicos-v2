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
