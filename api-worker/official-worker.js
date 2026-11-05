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
   return env.ASSETS.fetch(new Request(url,request));
  }
  return worker.fetch(request,env);
 }
};
