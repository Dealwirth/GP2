import { useCallback } from 'react';
import { useGespeichert } from './persistenz.ts';
import { frage, type AiEinstellungen } from '../ai/client.ts';

/**
 * Zustand der KI-Verbindung – sichtbar, verständlich, mit nächstem Schritt.
 *
 * Der Grund für dieses Bauteil: Eine KI-Anbindung, die im Hintergrund
 * scheitert, ist schlimmer als keine. Man drückt einen Knopf, es passiert
 * nichts, und man weiß nicht, ob die Aufgabe falsch war oder das Netz klemmt.
 *
 * Deshalb hat jeder Zustand einen Satz, der sagt was los ist, und einen, der
 * sagt was zu tun ist. Und in jedem Fall bleibt die App vollständig nutzbar –
 * der statische Aufgabenvorrat braucht keine Verbindung.
 */

export type KiZustand =
  | { art: 'aus' }
  | { art: 'unbekannt' }
  | { art: 'prueft' }
  | { art: 'bereit'; modell: string; dauerMs: number }
  | { art: 'fehler'; grund: string; naechsterSchritt: string };

/** Übersetzt einen technischen Fehler in Klartext plus Handlung. */
export function deuteFehler(fehler: unknown): { grund: string; naechsterSchritt: string } {
  const roh = fehler instanceof Error ? fehler.message : String(fehler);

  if (/nicht eingerichtet|ausgeschaltet/i.test(roh)) {
    return {
      grund: 'Die KI ist ausgeschaltet.',
      naechsterSchritt:
        'Unter „Einstellungen" die Aufgabenerzeugung wieder einschalten. ' +
        'Alles andere funktioniert auch ohne KI.',
    };
  }
  if (/Rate-Limit|429|Zu viele Anfragen|Limit/i.test(roh)) {
    return {
      grund: 'Das kostenlose Kontingent ist für den Moment aufgebraucht.',
      naechsterSchritt:
        'Ein bis zwei Minuten warten und erneut versuchen. Der feste Aufgabenvorrat ' +
        'läuft in der Zwischenzeit ohne KI weiter.',
    };
  }
  if (/Failed to fetch|Netzwerk|NetworkError|Load failed/i.test(roh)) {
    return {
      grund: 'Groq ist von hier aus nicht erreichbar.',
      naechsterSchritt:
        'Internetverbindung prüfen. Ohne Internet arbeiten Lernpfad, Wiederholung ' +
        'und Prüfungssimulation weiter – nur die frisch erzeugten Aufgaben fehlen dann.',
    };
  }
  if (/401|403|Schlüssel|api key|Gültig|invalid_api/i.test(roh)) {
    return {
      grund: 'Der Zugangsschlüssel fehlt oder gilt nicht mehr.',
      naechsterSchritt:
        'Auf console.groq.com einen neuen Schlüssel erzeugen und in den ' +
        'Einstellungen eintragen (oder im Quellcode ersetzen).',
    };
  }
  return {
    grund: roh.slice(0, 200),
    naechsterSchritt: 'Erneut versuchen. Wenn es bleibt: Kontingent und Verbindung prüfen.',
  };
}

const ZUSTAND_SCHLUESSEL = 'ki-zustand';

export interface KiStatusWerte {
  zustand: KiZustand;
  setzeZustand: (z: KiZustand) => void;
  pruefeVerbindung: (einstellungen: AiEinstellungen) => Promise<boolean>;
}

/**
 * Verbindungszustand der KI.
 *
 * Wird gespeichert, damit der Zustand nicht bei jedem Seitenwechsel neu
 * ermittelt werden muss – sonst würde jeder Aufruf der Oberfläche eine
 * Anfrage kosten und das knappe Kontingent aufbrauchen.
 */
export function useKiStatus(): KiStatusWerte {
  const [zustand, setzeZustand] = useGespeichert<KiZustand>(ZUSTAND_SCHLUESSEL, { art: 'unbekannt' });

  const pruefeVerbindung = useCallback(
    async (einstellungen: AiEinstellungen): Promise<boolean> => {
      setzeZustand({ art: 'prueft' });
      const beginn = Date.now();
      try {
        // Eine minimale, billige Anfrage. Sie verbraucht kaum Kontingent und
        // sagt trotzdem alles, was man wissen muss: erreichbar, Schlüssel
        // gültig, Modell vorhanden.
        await frage(
          einstellungen,
          {
            system: 'Antworte mit dem Wort bereit.',
            nutzer: 'Verbindungstest.',
            temperatur: 0,
          },
          AbortSignal.timeout(20_000),
        );
        setzeZustand({
          art: 'bereit',
          modell: einstellungen.modell,
          dauerMs: Date.now() - beginn,
        });
        return true;
      } catch (fehler) {
        const { grund, naechsterSchritt } = deuteFehler(fehler);
        setzeZustand({ art: 'fehler', grund, naechsterSchritt });
        return false;
      }
    },
    [setzeZustand],
  );

  return { zustand, setzeZustand, pruefeVerbindung };
}

/** Kurztext für die Kopfzeile – eine Zeile, kein Kasten. */
export function KiKurzzeile(props: { zustand: KiZustand; onKlick?: () => void }) {
  const { zustand } = props;
  const inhalt = ((): { text: string; klasse: string } => {
    switch (zustand.art) {
      case 'bereit':
        return { text: `KI bereit · ${zustand.dauerMs} ms`, klasse: 'gruen' };
      case 'prueft':
        return { text: 'KI wird geprüft …', klasse: '' };
      case 'fehler':
        return { text: 'KI nicht erreichbar', klasse: 'rot' };
      case 'aus':
        return { text: 'KI aus', klasse: '' };
      case 'unbekannt':
        return { text: 'KI ungeprüft', klasse: '' };
    }
  })();

  return (
    <button className={`kiKurz klein ${inhalt.klasse}`} onClick={props.onKlick} type="button">
      {inhalt.text}
    </button>
  );
}

/**
 * Der ausführliche Hinweis.
 *
 * Erscheint nur, wenn wirklich etwas nicht stimmt. Ein Zustandshinweis, der
 * immer sichtbar ist, wird nach zwei Tagen nicht mehr gelesen.
 */
export function KiHinweis(props: {
  zustand: KiZustand;
  onEinstellungen: () => void;
  onErneutVersuchen: () => void;
}) {
  const { zustand } = props;
  if (zustand.art !== 'fehler') return null;

  return (
    <div className="warnung kiHinweis">
      <div className="prKopf">
        <span className="prTitel">KI nicht erreichbar</span>
        <span className="prGewicht">nächster Schritt</span>
      </div>
      <p className="klein">{zustand.grund}</p>
      <p className="klein">{zustand.naechsterSchritt}</p>
      <div className="raster raster2">
        <button onClick={props.onErneutVersuchen}>Erneut versuchen</button>
        <button onClick={props.onEinstellungen}>Zu den Einstellungen</button>
      </div>
      <p className="klein">
        Alles andere läuft weiter: Lernpfad, Wiederholung, Prüfungssimulation und
        Labor brauchen keine Verbindung.
      </p>
    </div>
  );
}
