import worker from './worker.js';
const HOST = 'https://ceb.ibne.workers.dev';
const PREFIX = '/central-estudos-biblicos-v2';
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (url.origin !== HOST || env.CEB_RUNTIME !== 'official-ibne') return new Response('Ambiente indisponível.', {status:503});
  if (url.pathname === '/') return Response.redirect(HOST + PREFIX + '/',302);
  if (url.pathname.startsWith(PREFIX + '/')) {
   url.pathname = url.pathname.slice(PREFIX.length);
   const response = await env.ASSETS.fetch(new Request(url,request));
   const location = response.headers.get('Location');
   if (location && response.status >= 300 && response.status < 400) {
    const target = new URL(location,url);
    if (target.origin === HOST && !target.pathname.startsWith(PREFIX + '/')) {
     target.pathname = PREFIX + target.pathname;
     const headers = new Headers(response.headers);
     headers.set('Location',target.toString());
     return new Response(response.body,{status:response.status,headers});
    }
   }
   // Public Almeida Recebida JSON is read from sandboxed presentation iframes.
   // Sandboxed srcdoc frames have an opaque origin, so this single public asset
   // needs CORS. Keep the sandbox and all API/auth routes unchanged.
   if (url.pathname === '/almeida-recebida.json' && response.ok) {
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Vary', 'Origin');
    return new Response(response.body,{status:response.status,headers});
   }
   return response;
  }
  return worker.fetch(request,env);
 }
};
