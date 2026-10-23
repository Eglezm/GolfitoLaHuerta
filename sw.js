// Service worker: guarda el juego para jugar sin señal. Sube VERSION cada vez que cambie el juego.
const VERSION = 'golfito-v7';
const CORE = ['./', 'index.html', 'three.min.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin === location.origin && (e.request.mode === 'navigate' || url.pathname.endsWith('.html'))) {
    // Página: primero la red (para recibir cambios), si no hay señal la copia guardada
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(k => k.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
    return;
  }
  // Resto (Three.js, íconos, tipografías): copia guardada y si no, red
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(VERSION).then(k => k.put(e.request, c)); }
    return res;
  })));
});
