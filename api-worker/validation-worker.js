// Test-only entry point. Production continues to use worker.js unchanged.
import worker from './worker.js';
import { validationStorageHealth } from './validation-storage-health.js';
import { validationFixtures } from './validation-fixtures.js';

export const VALIDATION_DB_HOST = 'ep-falling-fog-b4uyuofc.c-6.us-east-2.aws.neon.tech';
export function validationEnvironment(env) {
  // Never accept an attached Hyperdrive or fall back to production resources.
  if (env.HYPERDRIVE || env.CEB_RUNTIME !== 'validation') throw new Error('VALIDATION_CONFIG_INVALID');
  const connection = new URL(env.CEB_VALIDATION_DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(connection.protocol)
      || connection.hostname !== VALIDATION_DB_HOST
      || (connection.port && connection.port !== '5432')
      || connection.pathname !== '/neondb'
      || decodeURIComponent(connection.username) !== 'ceb_api_user'
      || !connection.password
      || !!connection.hash
      || connection.searchParams.get('sslmode') !== 'verify-full'
      || connection.searchParams.getAll('sslmode').length !== 1
      || connection.searchParams.getAll('channel_binding').length > 1
      || [...connection.searchParams.keys()].some(k => !['sslmode', 'channel_binding'].includes(k))) {
    throw new Error('VALIDATION_DATABASE_INVALID');
  }
  return { ...env, HYPERDRIVE: { connectionString: connection.toString() } };
}

export default {
  async fetch(request, env) {
    let isolated;
    try {
      if (new URL(request.url).hostname === 'ceb-biblioteca-api.wllmslv10.workers.dev') {
        throw new Error('PRODUCTION_HOST_FORBIDDEN');
      }
      isolated = validationEnvironment(env);
    } catch {
      // Never log a connection string, secret or parser error.
      return Response.json({ error: 'Ambiente de validação indisponível. Confira a conexão isolada.' }, { status: 503 });
    }
    if (new URL(request.url).pathname === '/validation/fixtures') {
      return validationFixtures(request, isolated);
    }
    const response = await worker.fetch(request, isolated);
    if (request.method === 'GET' && new URL(request.url).pathname === '/health' && response.ok) {
      const health = await response.json();
      const storage = await validationStorageHealth(isolated);
      return Response.json({ ...health, runtime: 'validation', isolated_database: true, functional_tests: 'oidc-v2',
        uploads_enabled: isolated.CEB_UPLOADS_ENABLED === 'true', storage }, {
        status: storage.reachable ? 200 : 503,
        headers: { ...Object.fromEntries(response.headers), 'Cache-Control': 'no-store' },
      });
    }
    return response;
  },
};
