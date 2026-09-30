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
import { KiKurzzeile, useKiStatus } from './ui/KiStatus.tsx';
import { Vorratszeile } from './ui/Vorratszeile.tsx';
/* Die Sync-Schicht ist entfernt; der Kopf zeigt nur noch den KI-Zustand. */
import { aiEinstellungenAus } from './ui/einstellungen.ts';

/**
 * Rahmen der Anwendung.
 *
 * Bewusst ohne Framework-Router und ohne globale Zustandsbibliothek: der
 * Lerncode bleibt reines TypeScript, die Oberfläche ist austauschbar.
 */
export default function App() {
  const [seite, wechsle] = useRouter();
  const store = useStore();
  const { zustand, pruefeVerbindung } = useKiStatus();
  const ai = aiEinstellungenAus(store.einstellungen);

  useEffect(() => {
    document.documentElement.dataset.seite = seite;
  }, [seite]);

  const termin = naechsterTermin();
  const bericht = faktBericht();
  const tage = termin ? tageBis(termin.datum) : null;

  return (
    <div className="huelle">
      <header className="kopf">
        <h1>EGT-Prüfungstrainer</h1>
        <span className="kopfRechts">
          <Vorratszeile store={store} />
          {/* Der KI-Zustand gehört sichtbar in den Kopf, nicht in die
              Einstellungen: Wenn nichts geht, soll man das sehen, ohne zu
              suchen. Der Klick führt direkt zur Prüfstelle. */}
          <KiKurzzeile zustand={zustand} onKlick={() => void pruefeVerbindung(ai)} />
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
