// The Worker receives access only to the bound private bucket. No S3 keys.
export function storageReady(env) {
  const bucket = env.CEB_MATERIAIS;
  return Boolean(bucket && typeof bucket.put === 'function' && typeof bucket.get === 'function' && typeof bucket.delete === 'function');
}
export function objectStore(env) {
  if (!storageReady(env)) throw new Error('STORAGE_NOT_CONFIGURED');
  const bucket = env.CEB_MATERIAIS;
  // Only app-generated object paths are accepted; callers cannot select a bucket.
  function validKey(key) {
    if (typeof key !== 'string' || !/^materials\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/original$/i.test(key)) throw new Error('INVALID_STORAGE_KEY');
    return key;
  }
  return {
    async put(key, bytes) {
      const saved = await bucket.put(validKey(key), bytes, { httpMetadata: { contentType: 'application/octet-stream' } });
      if (!saved) throw new Error('STORAGE_UPLOAD_FAILED');
    },
    async get(key) {
      const object = await bucket.get(validKey(key));
      if (!object) throw new Error('STORAGE_DOWNLOAD_FAILED');
      return new Response(object.body, { headers: { 'Content-Type': 'application/octet-stream' } });
    },
    // Compensation of a new orphan or confirmed admin-only permanent deletion.
    // Soft deletion/restoration preserve the original.
    async remove(key) { await bucket.delete(validKey(key)); },
  };
}
