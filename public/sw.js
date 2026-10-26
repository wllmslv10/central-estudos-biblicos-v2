const CACHE_NAME = 'ceb-v2-shell-2026-10-26-v3'
const ROOT = '/central-estudos-biblicos-v2/'
const SHELL = [ROOT, ROOT + 'manifest.webmanifest', ROOT + 'icon-192.png', ROOT + 'icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('ceb-v2-shell-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(ROOT)) return

  // Páginas: tentar sempre a versão atual, com fallback apenas para a página inicial.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(ROOT)))
    return
  }

  // Recursos locais: não armazenar respostas de APIs nem conteúdo privado.
  event.respondWith(fetch(request).catch(() => caches.match(request)))
})
