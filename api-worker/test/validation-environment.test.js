import test from 'node:test';
import assert from 'node:assert/strict';
import validationWorker, { validationEnvironment, VALIDATION_DB_HOST } from '../validation-worker.js';

const environment = () => ({
  CEB_RUNTIME: 'validation',
  CEB_VALIDATION_DATABASE_URL: `postgresql://ceb_api_user:fake-test-only@${VALIDATION_DB_HOST}/neondb?sslmode=verify-full`,
});
test('validation selects only the isolated Neon branch', () => {
  const result = validationEnvironment(environment());
  assert.equal(new URL(result.HYPERDRIVE.connectionString).hostname, VALIDATION_DB_HOST);
});
test('validation refuses other databases, insecure TLS and injected connection options', () => {
  const valid = environment().CEB_VALIDATION_DATABASE_URL;
  for (const value of [undefined, valid.replace(VALIDATION_DB_HOST, 'production.neon.tech'),
    valid.replace('verify-full', 'disable'), valid.replace('/neondb', '/other'),
    valid.replace('ceb_api_user', 'neondb_owner'), valid + '&options=-c%20role=neondb_owner',
    valid.replace(VALIDATION_DB_HOST, VALIDATION_DB_HOST + ':5433'), valid + '&sslmode=disable']) {
    assert.throws(() => validationEnvironment({ ...environment(), CEB_VALIDATION_DATABASE_URL: value }));
  }
});
test('validation never falls back to an existing Hyperdrive binding', () => {
  assert.throws(() => validationEnvironment({ ...environment(), HYPERDRIVE: { connectionString: 'production' } }));
  assert.throws(() => validationEnvironment({ ...environment(), CEB_RUNTIME: 'production' }));
});
test('validation fails closed without secrets and refuses the production hostname', async () => {
  const missing = await validationWorker.fetch(new Request('https://validation.example/health'), {});
  assert.equal(missing.status, 503);
  const production = await validationWorker.fetch(new Request('https://ceb-biblioteca-api.wllmslv10.workers.dev/health'), environment());
  assert.equal(production.status, 503);
  assert.doesNotMatch(await missing.text(), /postgres|fake-test-only/);
});
