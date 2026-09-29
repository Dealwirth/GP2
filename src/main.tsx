import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles.css';

const wurzel = document.getElementById('root');
if (!wurzel) throw new Error('Kein Wurzelelement gefunden.');

createRoot(wurzel).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline-Nutzung als installierbare App. Ohne Netz bleibt alles außer der
// KI-Aufgabenerzeugung funktionsfähig.
if ('serviceWorker' in navigator && location.protocol !== 'blob:') {
  addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((reg) => {
      // Ein neu wartender Service Worker heißt: Der Server hat eine neue
      // Version. Sobald er aktiviert ist, wird diese Seite einmal neu geladen –
      // der Nutzer sieht den aktuellen Stand, ohne einen Handgriff zu tun.
      reg.addEventListener('updatefound', () => {
        const neu = reg.installing;
        if (!neu) return;
        neu.addEventListener('statechange', () => {
          if (neu.state === 'activated' && reg.active) {
            reg.active.postMessage('update-fertig');
          }
        });
      });
    }).catch(() => {
      // Ohne Service Worker läuft die App normal weiter – kein Grund für einen Abbruch.
    });
  });
}
