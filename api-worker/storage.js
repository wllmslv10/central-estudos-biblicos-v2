// Server-only storage access. Never accept endpoints or keys from the browser.
import { AwsClient } from 'aws4fetch';
export function storageReady(env) {
  return Boolean(env.CEB_STORAGE_ENDPOINT && env.CEB_STORAGE_ACCESS_KEY_ID && env.CEB_STORAGE_SECRET_ACCESS_KEY);
}
export function objectStore(env) {
  if (!storageReady(env)) throw new Error('STORAGE_NOT_CONFIGURED');
  const endpoint = new URL(env.CEB_STORAGE_ENDPOINT);
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== '/' || !endpoint.hostname.endsWith('.neon.tech')) throw new Error('INVALID_STORAGE_ENDPOINT');
  const aws = new AwsClient({ accessKeyId: env.CEB_STORAGE_ACCESS_KEY_ID, secretAccessKey: env.CEB_STORAGE_SECRET_ACCESS_KEY, service: 's3', region: 'us-east-2' });
  const url = key => `${endpoint.origin}/ceb-materiais/${key.split('/').map(encodeURIComponent).join('/')}`;
  const send = (method,key,body) => aws.fetch(url(key),{ method, ...(body ? { body } : {}), headers: { 'Content-Type': 'application/octet-stream' } });
  return {
    async put(key,bytes) { const r = await send('PUT',key,bytes); if (!r.ok) throw new Error('STORAGE_UPLOAD_FAILED'); },
    async get(key) { const r = await send('GET',key); if (!r.ok) throw new Error('STORAGE_DOWNLOAD_FAILED'); return r; },
    async remove(key) { const r = await send('DELETE',key); if (!r.ok && r.status !== 404) throw new Error('STORAGE_DELETE_FAILED'); },
  };
}
