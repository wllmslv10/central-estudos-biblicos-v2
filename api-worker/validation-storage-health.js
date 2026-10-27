// Read-only diagnostics used solely by validation-worker.js.
import { AwsClient } from 'aws4fetch';
import { NEON_FILES_ENDPOINT, neonStorageReady } from './neon-storage.js';

export async function validationStorageHealth(env, fetcher = fetch) {
  if (!neonStorageReady(env) || env.CEB_STORAGE_PROVIDER !== 'neon') {
    return { configured: false, reachable: false, check: 'HeadBucket' };
  }
  let stage = 'sign';
  let timeout;
  try {
    const signer = new AwsClient({
      accessKeyId: env.CEB_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.CEB_STORAGE_SECRET_ACCESS_KEY,
      service: 's3', region: 'us-east-2',
    });
    const signed = await signer.sign(`${NEON_FILES_ENDPOINT}/ceb-materiais`, { method: 'HEAD' });
    stage = 'request';
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetcher(signed, { signal: controller.signal, redirect: 'manual' });
    return { configured: true, reachable: response.ok, check: 'HeadBucket', status: response.status };
  } catch (error) {
    // Do not expose signed URLs, credentials, provider bodies or raw errors.
    const errorType = ['TypeError', 'AbortError', 'TimeoutError'].includes(error?.name) ? error.name : 'Error';
    return { configured: true, reachable: false, check: 'HeadBucket', failure_stage: stage, error_type: errorType };
  } finally {
    clearTimeout(timeout);
  }
}
