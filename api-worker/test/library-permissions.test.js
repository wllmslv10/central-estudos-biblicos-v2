import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import worker from '../worker.js';

const ownerId = '00000000-0000-4000-8000-000000000001';
const otherId = '00000000-0000-4000-8000-000000000002';
const studyId = '00000000-0000-4000-8000-000000000003';
async function requestAs(role, method, { scope = 'general', owner = false, body } = {}) {
  const original = { connect: pg.Client.prototype.connect, query: pg.Client.prototype.query, end: pg.Client.prototype.end };
  const queries = [];
  pg.Client.prototype.connect = async () => {};
  pg.Client.prototype.end = async () => {};
  pg.Client.prototype.query = async function (sql, params = []) {
    queries.push({ sql, params });
    if (sql.includes('FROM public.ceb_sessions')) return { rows: [{ id: owner ? ownerId : otherId, app_role: role, must_change_password: false }] };
    if (sql.includes('SELECT owner_user_id, content')) return { rowCount: 1, rows: [{ owner_user_id: ownerId, content: { libraryScope: scope } }] };
    if (sql.includes('UPDATE public.ceb_studies') || sql.includes('INSERT INTO public.ceb_studies')) return { rowCount: 1, rows: [{ id: studyId, content: JSON.parse(params[sql.includes('UPDATE') ? 1 : 2]) }] };
    if (sql.includes('DELETE FROM public.ceb_studies')) return { rowCount: 1, rows: [{ id: studyId }] };
    if (sql.includes('FROM public.ceb_studies')) return { rows: [] };
    throw new Error('Unexpected query');
  };
  try {
    const path = method === 'GET' || method === 'POST' ? '/studies' : `/studies/${studyId}`;
    const response = await worker.fetch(new Request(`https://api.test${path}`, { method, headers: { Authorization: 'Bearer test-session', Origin: 'https://wllmslv10.github.io', 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }), { HYPERDRIVE: { connectionString: 'postgresql://test.invalid/db' } });
    return { response, payload: await response.json(), queries };
  } finally { Object.assign(pg.Client.prototype, original); }
}

for (const role of ['admin', 'user']) test(`listagem usa papel autenticado: ${role}`, async () => {
  const { response, queries } = await requestAs(role, 'GET');
  assert.equal(response.status, 200);
  const q = queries.find(q => q.sql.includes('FROM public.ceb_studies'));
  assert.deepEqual(q.params, [otherId, role === 'admin']);
});
for (const scope of ['private', 'particular']) for (const method of ['PUT', 'DELETE']) test(`administrador não altera material ${scope} de outro: ${method}`, async () => {
  const { response, queries } = await requestAs('admin', method, { scope, body: method === 'PUT' ? { title: 'Teste', content: {} } : undefined });
  assert.equal(response.status, 403);
  assert.equal(queries.some(q => /UPDATE public|DELETE FROM public/.test(q.sql)), false);
});
test('administrador edita material geral de outro administrador', async () => {
  const { response } = await requestAs('admin', 'PUT', { body: { title: 'Teste', content: { libraryScope: 'general' } } });
  assert.equal(response.status, 200);
});
test('aluno não edita material geral de outra pessoa', async () => {
  const { response } = await requestAs('user', 'PUT', { body: { title: 'Teste', content: {} } });
  assert.equal(response.status, 403);
});
test('aluno não consegue publicar material geral', async () => {
  const { response, payload } = await requestAs('user', 'POST', { body: { title: 'Teste', content: { libraryScope: 'general' }, status: 'published' } });
  assert.equal(response.status, 201);
  assert.equal(payload.study.content.libraryScope, 'private');
});
test('proprietário edita seu material particular', async () => {
  const { response } = await requestAs('admin', 'PUT', { owner: true, scope: 'private', body: { title: 'Teste', content: { libraryScope: 'private' } } });
  assert.equal(response.status, 200);
});
