import { useEffect } from 'react';
import { useRouter, SEITEN } from './ui/router.ts';
import { useStore } from './ui/store.ts';
import { Heute } from './ui/seiten/Heute.tsx';
import { Lernen } from './ui/seiten/Lernen.tsx';
import { Ueben } from './ui/seiten/Ueben.tsx';
import { Pruefung } from './ui/seiten/Pruefung.tsx';
import { Kundenauftrag } from './ui/seiten/Kundenauftrag.tsx';
import { Fortschritt } from './ui/seiten/Fortschritt.tsx';
import { Bericht } from './ui/seiten/Bericht.tsx';
import { Einstellungen } from './ui/seiten/Einstellungen.tsx';
import { Tabellen } from './ui/seiten/Tabellen.tsx';
import { tageBis, naechsterTermin } from './domain/termine.ts';
import { faktBericht } from './content/facts/index.ts';
import { Vorratszeile } from './ui/Vorratszeile.tsx';
import { fuelleVorratAuf, fuelleVorratMitSeed } from './tasks/vorrat.ts';

/**
 * Rahmen der Anwendung.
 *
 * Bewusst ohne Framework-Router und ohne globale Zustandsbibliothek: der
 * Lerncode bleibt reines TypeScript, die Oberfläche ist austauschbar.
 */
export default function App() {
  const [seite, wechsle] = useRouter();
  const store = useStore();

  useEffect(() => {
    document.documentElement.dataset.seite = seite;
  }, [seite]);

  // Vorrat vorwärmen, sobald der Lernstand geladen ist.
  //
  // Der Lauf wird aus dem Rendern herausgehalten. Er baut ein Fenster über
  // viele Themen und kostet je nach Datenstand einige Millisekunden – im
  // Hauptstrang verzögert das den ersten Anstrich. `requestIdleCallback`
  // schiebt ihn in die Leerlaufzeit; wo es das nicht gibt (Safari), springt
  // ein kurzer Timer ein. `fuelleVorratAuf` stößt ihn ohnehin erneut an,
  // wenn der Vorrat noch nicht steht.
  useEffect(() => {
    if (!store.geladen) return;
    const ziel = store.einstellungen.vorrat;
    const seedLauf = (): void => {
      try {
        fuelleVorratMitSeed(ziel);
      } catch {
        // Der Seed-Vorrat ist die letzte Netzstufe – scheitert er, läuft der
        // Rest weiter. Die App darf daran nicht stehenbleiben.
      }
    };
    const planer = (globalThis as { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    if (typeof planer === 'function') {
      planer(seedLauf);
    } else {
      setTimeout(seedLauf, 0);
    }

    void fuelleVorratAuf(ziel);
  }, [store.geladen, store.einstellungen]);

  const termin = naechsterTermin();
  const bericht = faktBericht();
  const tage = termin ? tageBis(termin.datum) : null;

  return (
    <div className="huelle">
      <header className="kopf">
        <h1>EGT-Prüfungstrainer</h1>
        <span className="kopfRechts">
          <Vorratszeile store={store} />
          <span className="stand">
            {termin && tage !== null ? `${tage} T` : 'Teil 2'}
          </span>
        </span>
      </header>

      {!store.geladen && <p className="klein">Lernstand wird geladen …</p>}

      <main>
        {seite === 'heute' && <Heute store={store} wechsle={wechsle} />}
        {seite === 'lernen' && <Lernen store={store} wechsle={wechsle} />}
        {seite === 'ueben' && <Ueben store={store} wechsle={wechsle} />}
        {seite === 'tabellen' && <Tabellen />}
        {seite === 'pruefung' && <Pruefung store={store} wechsle={wechsle} />}
        {seite === 'kundenauftrag' && <Kundenauftrag store={store} />}
        {seite === 'fortschritt' && <Fortschritt store={store} />}
        {seite === 'bericht' && <Bericht store={store} />}
        {seite === 'einstellungen' && <Einstellungen store={store} />}
      </main>

      <nav className="navigation">
        {SEITEN.map((s) => (
          <button
            key={s.id}
            className={seite === s.id ? 'aktiv' : ''}
            onClick={() => wechsle(s.id)}
          >
            {s.kurz}
          </button>
        ))}
      </nav>

      <footer className="fuss">
        <span className="klein">
          Faktenbasis v{bericht.version} · {bericht.offen} Werte noch offen geprüft
        </span>
      </footer>
    </div>
  );
}
