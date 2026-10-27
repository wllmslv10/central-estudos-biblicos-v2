import { storageReady as r2Ready, objectStore as r2Store } from './r2-storage.js';
import { neonStorageReady, neonObjectStore } from './neon-storage.js';

// Neon is the deployment default. R2 is retained only as an explicitly selected
// adapter for the existing isolated tests. There is no fallback to another store.
export function storageReady(env) {
  return env.CEB_STORAGE_PROVIDER === 'r2' ? r2Ready(env) : neonStorageReady(env);
}
export function objectStore(env) {
  return env.CEB_STORAGE_PROVIDER === 'r2' ? r2Store(env) : neonObjectStore(env);
}
