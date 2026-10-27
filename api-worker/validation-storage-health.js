// Read-only diagnostics used solely by validation-worker.js.
import { AwsClient } from 'aws4fetch';
import { NEON_FILES_ENDPOINT, neonStorageReady } from './neon-storage.js';

export async function validationStorageHealth(env, fetcher = fetch) {
  if (!neonStorageReady(env) || env.CEB_STORAGE_PROVIDER !== 'neon') {
    return { configured: false, reachable: false, check: 'HeadBucket' };
  }
  try {
    const signer = new AwsClient({
      accessKeyId: env.CEB_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.CEB_STORAGE_SECRET_ACCESS_KEY,
      service: 's3', region: 'us-east-2',
    });
    const signed = await signer.sign(`${NEON_FILES_ENDPOINT}/ceb-materiais`, { method: 'HEAD' });
    const response = await fetcher(signed, { signal: AbortSignal.timeout(8000), redirect: 'error' });
    return { configured: true, reachable: response.ok, check: 'HeadBucket', status: response.status };
  } catch {
    // Do not expose signed URLs, credentials, provider bodies or raw errors.
    return { configured: true, reachable: false, check: 'HeadBucket' };
  }
}
