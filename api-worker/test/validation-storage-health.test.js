import test from 'node:test';
import assert from 'node:assert/strict';
import { validationStorageHealth } from '../validation-storage-health.js';
import { NEON_FILES_ENDPOINT } from '../neon-storage.js';

const env = { CEB_STORAGE_PROVIDER: 'neon', CEB_STORAGE_ENDPOINT: NEON_FILES_ENDPOINT,
  CEB_STORAGE_ACCESS_KEY_ID: 'synthetic-test-key', CEB_STORAGE_SECRET_ACCESS_KEY: 'synthetic-test-secret' };
test('storage health authenticates only a read-only HEAD on the fixed private bucket', async () => {
  const result = await validationStorageHealth(env, async (request, options) => {
    assert.equal(request.method, 'HEAD');
    assert.equal(request.url, NEON_FILES_ENDPOINT + '/ceb-materiais');
    assert.match(request.headers.get('Authorization'), /^AWS4-HMAC-SHA256 /);
    assert.equal(options.redirect, 'manual');
    return new Response(null, { status: 200 });
  });
  assert.deepEqual(result, { configured: true, reachable: true, check: 'HeadBucket', status: 200 });
  assert.doesNotMatch(JSON.stringify(result), /synthetic-test/);
});
test('storage health refuses missing secrets, another provider and a foreign endpoint before network', async () => {
  for (const override of [{ CEB_STORAGE_ACCESS_KEY_ID: '' }, { CEB_STORAGE_ENDPOINT: 'https://other.example' }, { CEB_STORAGE_PROVIDER: 'r2' }]) {
    const result = await validationStorageHealth({ ...env, ...override }, () => { throw new Error('must not call network'); });
    assert.equal(result.configured, false);
    assert.equal(result.reachable, false);
  }
});
test('storage health reports denial/unsupported operations without exposing provider details', async () => {
  for (const status of [403, 404, 501]) {
    const result = await validationStorageHealth(env, async () => new Response(null, { status }));
    assert.equal(result.reachable, false);
    assert.equal(result.status, status);
  }
  const result = await validationStorageHealth(env, async () => { throw new Error('secret signed URL'); });
  assert.equal(result.reachable, false);
  assert.doesNotMatch(JSON.stringify(result), /secret signed/);
});
