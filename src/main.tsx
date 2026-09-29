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
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Ohne Service Worker läuft die App normal weiter – kein Grund für einen Abbruch.
    });
  });
}
