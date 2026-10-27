// Fail closed for unknown explicit modes. Login/logout retain rate limits and session writes.
export function readOnly(env) {
  return env.CEB_WRITE_MODE !== undefined && env.CEB_WRITE_MODE !== 'normal';
}
export function permitsRequest(request, env) {
  if (!readOnly(env)) return true;
  const path = new URL(request.url).pathname;
  return ['GET', 'HEAD', 'OPTIONS'].includes(request.method) ||
    (request.method === 'POST' && ['/auth/login', '/auth/logout'].includes(path));
}
