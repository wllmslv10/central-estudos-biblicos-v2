// Short-lived GitHub identity may provision ONLY synthetic accounts on the guarded test DB.
// Never imported by the production Worker. No S3/SQL credentials leave the backend.
import pg from 'pg';
export const TEST_AUDIENCE = 'https://ceb-biblioteca-api-validacao.wllmslv10.workers.dev';
const repo = 'wllmslv10/central-estudos-biblicos-v2';
const ref = 'refs/heads/work/biblioteca-nuvem-20261026';
const workflow = `${repo}/.github/workflows/functional-library.yml@${ref}`;
const decode = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
export async function githubTestIdentity(token, fetcher = fetch, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 16000) throw new Error('UNAUTHORIZED');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('UNAUTHORIZED');
  const header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
  const claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('IDENTITY_ALGORITHM');
  const expected = { iss:'https://token.actions.githubusercontent.com',aud:TEST_AUDIENCE,repository:repo,
    repository_id:'1431661344',ref,workflow_ref:workflow,event_name:'push',runner_environment:'github-hosted' };
  for (const [name,value] of Object.entries(expected)) {
    if (claims[name] !== value) throw new Error('IDENTITY_CLAIM_'+name.toUpperCase());
  }
  if (!Number.isFinite(claims.exp) || claims.exp * 1000 <= now
      || !Number.isFinite(claims.nbf) || claims.nbf * 1000 > now + 30000
      || !/^[0-9]{1,14}$/.test(claims.run_id || '') || !/^[0-9]{1,3}$/.test(claims.run_attempt || '')) throw new Error('IDENTITY_TIME_OR_RUN');
  // Fixed issuer/JWKS endpoint. Never follow a token-supplied URL or redirect.
  const response = await fetcher('https://token.actions.githubusercontent.com/.well-known/jwks', { redirect: 'manual' });
  if (!response.ok) throw new Error('IDENTITY_JWKS_HTTP');
  const jwk = (await response.json()).keys?.find(k => k.kid === header.kid && k.kty === 'RSA' && k.alg === 'RS256' && k.use === 'sig');
  if (!jwk) throw new Error('IDENTITY_KEY_NOT_FOUND');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`))) throw new Error('UNAUTHORIZED');
  return { run: claims.run_id, attempt: claims.run_attempt };
}

export async function validationFixtures(request, isolated) {
  if (request.method !== 'POST') return Response.json({ error: 'Método não permitido.' }, { status: 405 });
  let identity;
  try { identity = await githubTestIdentity((request.headers.get('Authorization') || '').replace(/^Bearer /, '')); }
  catch (error) { return Response.json({ error: 'Autorização temporária inválida.',
    code: /^IDENTITY_[A-Z_]+$/.test(error?.message || '') ? error.message : 'IDENTITY_UNAVAILABLE' }, { status: 401 }); }
  let body;
  try {
    if (Number(request.headers.get('Content-Length') || 0) > 4096) throw new Error();
    const raw = await request.text(); if (raw.length > 4096) throw new Error();
    body = JSON.parse(raw);
  } catch { return Response.json({ error: 'Dados técnicos inválidos.' }, { status: 400 }); }
  const tag = `ceb-validation:${identity.run}:${identity.attempt}`;
  const prefix = `cebtest_${identity.run}_${identity.attempt}_`;
  const roles = { a1: 'admin', a2: 'admin', s1: 'user' };
  const client = new pg.Client({ connectionString: isolated.HYPERDRIVE.connectionString, connectionTimeoutMillis: 5000, query_timeout: 8000 });
  try {
    await client.connect();
    if (body.action === 'seed' && Object.hasOwn(roles, body.slot)
        && /^pbkdf2_sha256\$100000\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/.test(body.password_hash || '')) {
      // INSERT only: a duplicate fails; no existing account is replaced or reactivated.
      const result = await client.query(`INSERT INTO public.ceb_users
        (username,display_name,password_hash,app_role,is_active,must_change_password,auth_subject)
        VALUES($1,$2,$3,$4,true,false,$5) RETURNING id,username,app_role`,
        [prefix + body.slot, `CEB teste técnico ${body.slot}`, body.password_hash, roles[body.slot], tag]);
      return Response.json({ user: result.rows[0] }, { status: 201 });
    }
    if (body.action === 'close') {
      // Deactivate only accounts created by this exact signed run; retain all test files/rows.
      await client.query('BEGIN');
      await client.query(`UPDATE public.ceb_sessions SET revoked_at=COALESCE(revoked_at,NOW()) WHERE user_id IN
        (SELECT id FROM public.ceb_users WHERE auth_subject=$1 AND username=ANY($2::text[]))`, [tag, Object.keys(roles).map(k => prefix + k)]);
      const result = await client.query('UPDATE public.ceb_users SET is_active=false WHERE auth_subject=$1 AND username=ANY($2::text[])', [tag, Object.keys(roles).map(k => prefix + k)]);
      await client.query('COMMIT');
      return Response.json({ closed: result.rowCount });
    }
    return Response.json({ error: 'Operação técnica inválida.' }, { status: 400 });
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    return Response.json({ error: 'Preparação técnica indisponível.' }, { status: 503 });
  } finally { await client.end().catch(() => {}); }
}
