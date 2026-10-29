import { AwsClient } from 'aws4fetch';

// Dedicated Free project ceb-arquivos. No SQL/users/metadata live here.
export const NEON_FILES_ENDPOINT = 'https://br-holy-lake-b5wmosos.storage.c-7.us-east-2.aws.neon.tech';
const keyPattern = /^materials\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/original$/i;
export function neonStorageReady(env) {
  return env.CEB_STORAGE_ENDPOINT?.replace(/\/$/, '') === NEON_FILES_ENDPOINT
    && typeof env.CEB_STORAGE_ACCESS_KEY_ID === 'string' && !!env.CEB_STORAGE_ACCESS_KEY_ID.trim()
    && typeof env.CEB_STORAGE_SECRET_ACCESS_KEY === 'string' && !!env.CEB_STORAGE_SECRET_ACCESS_KEY.trim();
}
export function neonObjectStore(env, fetcher = fetch) {
  if (!neonStorageReady(env)) throw new Error('STORAGE_NOT_CONFIGURED');
  const aws = new AwsClient({ accessKeyId: env.CEB_STORAGE_ACCESS_KEY_ID, secretAccessKey: env.CEB_STORAGE_SECRET_ACCESS_KEY, service: 's3', region: 'us-east-2' });
  async function send(method, key, bytes) {
    if (typeof key !== 'string' || !keyPattern.test(key)) throw new Error('INVALID_STORAGE_KEY');
    const url = `${NEON_FILES_ENDPOINT}/ceb-materiais/${key.split('/').map(encodeURIComponent).join('/')}`;
    const signed = await aws.sign(url, { method, ...(bytes !== undefined ? { body: bytes } : {}), headers: { 'Content-Type': 'application/octet-stream' } });
    return fetcher(signed);
  }
  return {
    async put(key,bytes) { const r=await send('PUT',key,bytes); if (!r.ok) throw new Error('STORAGE_UPLOAD_FAILED'); },
    async get(key) { const r=await send('GET',key); if (!r.ok) throw new Error('STORAGE_DOWNLOAD_FAILED'); return r; },
    // Compensation of a new orphan, or confirmed admin-only permanent removal.
    // Lixeira/restoration never call this method.
    async remove(key) { const r=await send('DELETE',key); if (!r.ok && r.status!==404) throw new Error('STORAGE_DELETE_FAILED'); },
  };
}
