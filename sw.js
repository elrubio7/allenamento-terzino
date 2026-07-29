'use strict';
/* Service worker: dopo il primo caricamento l'app funziona senza internet. */
const VERSIONE = 'terzino-1.13.0';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/util.js',
  './js/data.js',
  './js/state.js',
  './js/engine.js',
  './js/timer.js',
  './js/charts.js',
  './js/ui.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSIONE).then(c =>
      /* cache: 'reload' = i file si prendono SEMPRE dal server, mai dalla copia
         vecchia del telefono: è ciò che garantisce di installare la versione nuova.
         Uno per uno, così un file irraggiungibile non blocca tutto l'aggiornamento. */
      Promise.all(FILES.map(f =>
        c.add(new Request(f, { cache: 'reload' })).catch(() => {})
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSIONE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* l'app può chiedere di passare subito alla versione nuova (tasto "cerca aggiornamenti") */
self.addEventListener('message', e => {
  if (e.data === 'aggiorna-subito') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request))
  );
});
