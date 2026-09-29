/**
 * Service Worker.
 *
 * Zweck: Die App muss auf dem Telefon auch ohne Netz funktionieren. Deshalb
 * wird die Programmhülle gecacht – aber ausdrücklich NICHT:
 *   - Anfragen an die KI (die sind ohnehin nicht cachefähig)
 *   - Daten des Lernstands (die liegen in IndexedDB, nicht im HTTP-Cache)
 *
 * Der Worker speichert nichts über die App hinaus. Das ist die ganze
 * Datenschutzarchitektur in einer Datei.
 */

const CACHE = 'egt-trainer-v1';
const HUELLE = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (ereignis) => {
  ereignis.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(HUELLE)));
  self.skipWaiting();
});

self.addEventListener('activate', (ereignis) => {
  ereignis.waitUntil(
    caches
      .keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ereignis) => {
  const anfrage = ereignis.request;
  if (anfrage.method !== 'GET') return;

  const url = new URL(anfrage.url);

  // KI-Endpunkte niemals anfassen.
  if (url.pathname.includes('/api/') || url.hostname.includes('groq.com') || url.hostname.includes('workers.dev')) {
    return;
  }

  // Nur eigene Herkunft.
  if (url.origin !== self.location.origin) return;

  ereignis.respondWith(
    caches.match(anfrage).then((treffer) => {
      const netz = fetch(anfrage)
        .then((antwort) => {
          if (antwort.ok) {
            const kopie = antwort.clone();
            void caches.open(CACHE).then((cache) => cache.put(anfrage, kopie));
          }
          return antwort;
        })
        .catch(() => treffer ?? caches.match('./index.html'));
      return treffer ?? netz;
    }),
  );
});
