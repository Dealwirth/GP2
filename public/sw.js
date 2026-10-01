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

const CACHE = 'egt-trainer-v3';
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

// Ein neues Programm meldet sich: Sämtliche offenen Fenster werden gebeten,
// einmal neu zu laden. So kommt ein Update beim nächsten Besuch an, ohne
// dass ein Handgriff nötig wird.
self.addEventListener('message', (ereignis) => {
  if (ereignis.data === 'update-fertig') {
    self.clients.matchAll().then((liste) => {
      for (const klient of liste) klient.navigate(klient.url);
    });
  }
});

self.addEventListener('fetch', (ereignis) => {
  const anfrage = ereignis.request;
  if (anfrage.method !== 'GET') return;

  const url = new URL(anfrage.url);

  // Nur eigene Herkunft.
  if (url.origin !== self.location.origin) return;

  ereignis.respondWith(
    // Netz zuerst: Ein neuer Stand auf dem Server kommt immer an, auch wenn
    // der Cache noch einen alten hält – die Tafel soll sich selbst erneuern.
    // Erst wenn das Netz nicht antwortet, springt der Cache ein (Offline-Fall).
    fetch(anfrage)
      .then((antwort) => {
        if (antwort.ok) {
          const kopie = antwort.clone();
          void caches.open(CACHE).then((cache) => cache.put(anfrage, kopie));
        }
        return antwort;
      })
      .catch(() => caches.match(anfrage).then((treffer) => treffer ?? caches.match('./index.html'))),
  );
});
