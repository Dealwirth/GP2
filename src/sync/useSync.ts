import { useCallback, useEffect, useRef, useState } from 'react';
import type { Store } from '../ui/store.ts';
import { holeLokalenStand, schreibeLokalenStand, signatur } from './lokal.ts';
import { holeFerne, loescheFerne, schreibeFerne, SyncNichtMoeglich } from './transport.ts';
import { standKennzahlen, vereinigeStand, type SyncStand } from './typen.ts';
import {
  ausVerbindungscode,
  holeVerbindung,
  LEERE_VERBINDUNG,
  neueKennung,
  pruefeWorkerUrl,
  speichereVerbindung,
  type SyncVerbindung,
} from './verbindung.ts';

/**
 * Dauerhafte Speicherung, die man einschalten muss.
 *
 * Was das leistet: Der Lernstand liegt nicht mehr nur in diesem Browser,
 * sondern zusätzlich – verschlüsselt – beim eigenen Cloudflare-Worker. Auf
 * einem zweiten Gerät trägt man Verbindungscode und Passwort ein und hat dort
 * denselben Stand. Und weil der Stand einen eigenen Formatnamen mit
 * Versionsnummer hat, überlebt er auch Verbesserungen am Code.
 *
 * Was das **nicht** tut: Es schaltet sich nicht von selbst ein, und es
 * überträgt nichts, was nicht ausdrücklich als Lernstand gekennzeichnet ist.
 * Ohne Verbindung passiert gar nichts.
 *
 * Der Ablauf eines Abgleichs ist immer derselbe, und die Reihenfolge ist der
 * eigentliche Inhalt dieser Datei:
 *
 *   1. lokalen Stand lesen
 *   2. fernen Stand holen  (fehlt er, ist das kein Fehler)
 *   3. **beide zusammenführen** – nie eines durch das andere ersetzen
 *   4. nur schreiben, wo sich wirklich etwas geändert hat
 *
 * Schritt 3 ist der Grund, warum hier nichts verloren gehen kann: Es gibt
 * keinen Pfad in dieser Datei, der einen Stand überschreibt, ohne ihn vorher
 * gelesen zu haben.
 */

export type SyncZustand =
  | { art: 'aus' }
  | { art: 'laeuft' }
  | { art: 'ok'; zeit: string; herkunft: string; kennzahlen: ReturnType<typeof standKennzahlen> }
  | { art: 'fehler'; grund: string; naechsterSchritt: string };

export interface VerbindungsEingabe {
  /** Adresse des Workers. Entfällt, wenn ein Code eingetragen wird. */
  workerUrl?: string;
  /** Verbindungscode vom anderen Gerät. Bringt Adresse und Kennung mit. */
  code?: string;
  /** Statt eines Codes eine frische Kennung anlegen (erstes Gerät). */
  neuAnlegen?: boolean;
  passwort: string;
}

export interface SyncSteuerung {
  verbindung: SyncVerbindung;
  zustand: SyncZustand;
  /** Setzt die Verbindung auf und führt sofort einen Abgleich aus. */
  verbinden: (eingabe: VerbindungsEingabe) => Promise<{ ok: true } | { ok: false; grund: string }>;
  /** Beendet die Synchronisation. `loeschen` entfernt zusätzlich den Stand im Netz. */
  trennen: (loeschen?: boolean) => Promise<void>;
  /** Manueller Abgleich – dieselbe Funktion, die auch der Zeitgeber aufruft. */
  jetztAbgleichen: () => Promise<void>;
}

/** Wartezeit, nachdem sich lokal etwas geändert hat, bevor hochgeladen wird. */
const RUHEZEIT_MS = 4_000;
/** Wie oft auch ohne Änderung nachgesehen wird, ob ein anderes Gerät geschrieben hat. */
const TAKT_MS = 60_000;

export function useSync(store: Store): SyncSteuerung {
  const [verbindung, setVerbindung] = useState<SyncVerbindung>(holeVerbindung);
  // Eine eingeschaltete Verbindung gleicht beim Öffnen sofort ab – der Kopf
  // soll nicht "gesichert" behaupten, bevor es stimmt.
  const [zustand, setZustand] = useState<SyncZustand>(() =>
    holeVerbindung().aktiv ? { art: 'laeuft' } : { art: 'aus' },
  );

  const verbindungRef = useRef(verbindung);
  verbindungRef.current = verbindung;
  const laeuft = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aktualisieren = store.aktualisieren;

  const setzeVerbindung = useCallback((neu: SyncVerbindung) => {
    speichereVerbindung(neu);
    verbindungRef.current = neu;
    setVerbindung(neu);
  }, []);

  const abgleichen = useCallback(async (): Promise<void> => {
    const v = verbindungRef.current;
    if (!v.aktiv || v.workerUrl === '' || v.passwort === '') {
      setZustand({ art: 'aus' });
      return;
    }
    if (laeuft.current) return;
    laeuft.current = true;
    setZustand({ art: 'laeuft' });

    try {
      const lokal = await holeLokalenStand();
      const fern = await holeFerne(v);
      const vereinigt: SyncStand = fern ? vereinigeStand(lokal, fern) : lokal;

      const sigLokal = signatur(lokal);
      const sigFern = fern ? signatur(fern) : '';
      const sigVereinigt = signatur(vereinigt);

      // Nur schreiben, wenn wirklich etwas dazugekommen ist. Ein Schreibzugriff
      // ersetzt die Ansicht nicht, aber er kostet – und ein unnötiger
      // Schreibzugriff auf den Lernstand ist der beste Weg, ihn irgendwann
      // falsch zu schreiben.
      if (sigVereinigt !== sigLokal) {
        await schreibeLokalenStand(vereinigt);
        await aktualisieren();
      }
      if (sigVereinigt !== sigFern) {
        await schreibeFerne(v, vereinigt);
      }

      const neuerStand = { ...v, letzterAbgleich: new Date().toISOString(), letzterFehler: null };
      setzeVerbindung(neuerStand);
      setZustand({
        art: 'ok',
        zeit: neuerStand.letzterAbgleich!,
        herkunft: fern?.geraet ?? '',
        kennzahlen: standKennzahlen(vereinigt),
      });
    } catch (fehler) {
      const grund = fehler instanceof SyncNichtMoeglich ? fehler.grund : 'Abgleich fehlgeschlagen.';
      const naechsterSchritt =
        fehler instanceof SyncNichtMoeglich
          ? fehler.naechsterSchritt
          : 'Der Lernstand auf diesem Gerät bleibt erhalten. Später erneut versuchen.';
      setzeVerbindung({ ...v, letzterFehler: grund });
      setZustand({ art: 'fehler', grund, naechsterSchritt });
    } finally {
      laeuft.current = false;
    }
  }, [aktualisieren, setzeVerbindung]);

  // Der Zeitgeber: Er holt Änderungen des anderen Geräts, auch wenn hier
  // gerade nichts passiert.
  useEffect(() => {
    if (!verbindung.aktiv) return;
    const takt = setInterval(() => void abgleichen(), TAKT_MS);
    return () => clearInterval(takt);
  }, [verbindung.aktiv, abgleichen]);

  // Nach jeder Änderung am Lernstand wird kurz gewartet und dann hochgeladen.
  // Die Verzögerung ist kein Schönheitsgriff: Eine Sitzung schreibt bei jeder
  // Antwort – ohne Ruhezeit wären das zwanzig Uploads in fünf Minuten.
  useEffect(() => {
    if (!verbindung.aktiv) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void abgleichen();
    }, RUHEZEIT_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [
    verbindung.aktiv,
    abgleichen,
    store.geladen,
    store.versuche,
    store.zustaende,
    store.sitzungen,
    store.ergebnisse,
  ]);

  // Beim Wechsel in den Hintergrund noch schnell abgleichen: Auf dem Telefon
  // wird der Tab dann aus dem Speicher geworfen, und ein offener Zeitgeber
  // feuert nie mehr.
  useEffect(() => {
    if (!verbindung.aktiv) return;
    const beiWechsel = (): void => {
      if (document.visibilityState === 'hidden') void abgleichen();
    };
    document.addEventListener('visibilitychange', beiWechsel);
    return () => document.removeEventListener('visibilitychange', beiWechsel);
  }, [verbindung.aktiv, abgleichen]);

  const verbinden = useCallback(
    async (eingabe: VerbindungsEingabe): Promise<{ ok: true } | { ok: false; grund: string }> => {
      if (eingabe.passwort.length < 8) {
        return { ok: false, grund: 'Das Passwort braucht mindestens 8 Zeichen.' };
      }

      let workerUrl = (eingabe.workerUrl ?? '').trim();
      let kennung = '';

      if (eingabe.code && eingabe.code.trim() !== '') {
        const ausCode = ausVerbindungscode(eingabe.code);
        if (!ausCode) {
          return {
            ok: false,
            grund: 'Der Verbindungscode ist unvollständig. Er beginnt mit EGT1- und ist eine lange Zeile.',
          };
        }
        workerUrl = ausCode.workerUrl;
        kennung = ausCode.kennung;
      } else {
        const geprueft = pruefeWorkerUrl(workerUrl);
        if (!geprueft.ok) return { ok: false, grund: geprueft.grund };
        workerUrl = geprueft.url;
        // Die eigene Kennung behalten, wenn schon eine da ist: Sonst läge der
        // Stand nach jedem Speichern unter einem neuen Namen im Netz.
        kennung =
          eingabe.neuAnlegen || verbindungRef.current.kennung === ''
            ? neueKennung()
            : verbindungRef.current.kennung;
      }

      const geprueft = pruefeWorkerUrl(workerUrl);
      if (!geprueft.ok) return { ok: false, grund: geprueft.grund };

      const neu: SyncVerbindung = {
        aktiv: true,
        workerUrl: geprueft.url,
        kennung,
        passwort: eingabe.passwort,
        letzterAbgleich: null,
        letzterFehler: null,
      };
      setzeVerbindung(neu);
      await abgleichen();

      // Ein Tippfehler im Passwort fällt beim ersten Abgleich auf. Die
      // Verbindung bleibt dann stehen, aber sichtbar mit Fehler – so muss man
      // keine Angaben doppelt eingeben.
      const nach = holeVerbindung();
      return nach.letzterFehler ? { ok: false, grund: nach.letzterFehler } : { ok: true };
    },
    [abgleichen, setzeVerbindung],
  );

  const trennen = useCallback(
    async (loeschen = false): Promise<void> => {
      const v = verbindungRef.current;
      if (loeschen && v.aktiv && v.workerUrl !== '') {
        try {
          await loescheFerne(v);
        } catch {
          /* Netz weg: Das Löschen im Netz ist nachrangig, Trennen zählt. */
        }
      }
      setzeVerbindung({ ...LEERE_VERBINDUNG, workerUrl: v.workerUrl });
      setZustand({ art: 'aus' });
    },
    [setzeVerbindung],
  );

  const jetztAbgleichen = useCallback(async (): Promise<void> => {
    await abgleichen();
  }, [abgleichen]);

  return { verbindung, zustand, verbinden, trennen, jetztAbgleichen };
}
