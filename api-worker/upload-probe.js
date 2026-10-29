// Temporary storage-only validation. No SQL writes or material metadata.
import fixtures from './upload-probe-manifest.json' with { type: 'json' };
import { neonObjectStore } from './neon-storage.js';
export async function uploadProbe(request, env, url, user, json, origin, storeFactory = neonObjectStore, now = Date.now()) {
  const reply = (body, status = 200) => json(body, status, origin);
  if (!user || user.app_role !== 'admin' || user.must_change_password) return reply({error:'Acesso restrito.'},403);
  let config;
  try { config = JSON.parse(env.CEB_UPLOAD_PROBE || 'null'); } catch { /* fail closed */ }
  const start = Date.parse(config?.start), end = Date.parse(config?.end);
  if (env.CEB_UPLOADS_ENABLED !== 'false' || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || end-start > 30*60*1000 || now < start || now >= end || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(config?.run || '')) return reply({error:'Teste indisponível.'},404);
  const root = '/library/_upload-probe/' + config.run;
  if (url.pathname === root && request.method === 'GET') return reply({run:config.run,end:config.end,uploads_enabled:false,files:fixtures});
  const fixture = fixtures.find(f => url.pathname === root+'/'+f.format);
  if (!fixture) return reply({error:'Destino não permitido.'},404);
  if (!['PUT','GET'].includes(request.method)) return reply({error:'Método não permitido.'},405);
  const key = `materials/${config.run}/${fixture.id}/original`;
  try {
    if (request.method === 'PUT') {
      if (request.headers.get('Content-Length') !== String(fixture.bytes)) return reply({error:'Tamanho não permitido.'},400);
      const reader = request.body?.getReader();
      if (!reader) return reply({error:'Arquivo obrigatório.'},400);
      const bytes = new Uint8Array(fixture.bytes); let offset = 0;
      for (;;) { const {done,value} = await reader.read(); if(done) break; if(offset+value.length > bytes.length) { await reader.cancel(); return reply({error:'Tamanho não permitido.'},400); } bytes.set(value,offset); offset += value.length; }
      const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
      if (offset !== fixture.bytes || digest !== fixture.sha256) return reply({error:'Arquivo não permitido.'},400);
      if (!await storeFactory(env).putIfAbsent(key,bytes)) return reply({error:'Objeto já existente; não substituído.'},409);
      return reply({ok:true,format:fixture.format},201);
    }
    const stored = await storeFactory(env).get(key);
    return new Response(stored.body,{headers:{'Content-Type':'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  } catch { return reply({error:'Falha técnica no armazenamento.'},502); }
}
