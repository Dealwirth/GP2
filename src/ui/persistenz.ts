import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Dauerhafter Zustand der Oberfläche.
 *
 * Warum überhaupt: Alles, was der Lernende tut, soll ein Neuladen überleben.
 * Vorher galt das nur für den Lernstand (IndexedDB) und den Seitennamen (Hash).
 * Eine halb ausgefüllte Prüfung, ein begonnenes Messprotokoll oder ein
 * gewählter Filter waren dagegen weg, sobald die Seite neu lud – auf dem
 * Telefon passiert das ständig, wenn der Browser den Tab aus dem Speicher wirft.
 *
 * Zwei Entscheidungen, die man begründen muss:
 *
 *  1. **`localStorage`, nicht IndexedDB.** Hier liegt ausschließlich
 *     Oberflächenzustand – klein, synchron und ohne Schema. Der Lernstand
 *     bleibt in IndexedDB, wo er hingehört.
 *  2. **Nichts darf werfen.** Ein voller Speicher, ein Privatmodus oder ein
 *     alter Datenstand dürfen die App nicht anhalten. Jeder Zugriff ist
 *     eingepackt, und bei einem Fehler gilt der Startwert. Lieber ohne
 *     Wiederherstellung weiterarbeiten als gar nicht.
 */

const PRAEFIX = 'egt:';

function speicher(): Storage | null {
  try {
    // Zugriff testen – im Privatmodus wirft schon das Lesen.
    const probe = `${PRAEFIX}probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

/** Liest einen Wert. Gibt `null` zurück, wenn nichts Gespeichertes vorliegt. */
export function lies<T>(schluessel: string): T | null {
  const s = speicher();
  if (!s) return null;
  try {
    const roh = s.getItem(PRAEFIX + schluessel);
    if (roh === null) return null;
    return JSON.parse(roh) as T;
  } catch {
    // Beschädigter Eintrag: wegwerfen statt daran scheitern.
    try {
      s.removeItem(PRAEFIX + schluessel);
    } catch {
      /* egal */
    }
    return null;
  }
}

/** Schreibt einen Wert. Fehler werden geschluckt – Speichern ist Komfort. */
export function schreib<T>(schluessel: string, wert: T): void {
  const s = speicher();
  if (!s) return;
  try {
    s.setItem(PRAEFIX + schluessel, JSON.stringify(wert));
  } catch {
    /* Speicher voll oder gesperrt – die App läuft weiter. */
  }
}

/** Entfernt einen Eintrag. */
export function loesche(schluessel: string): void {
  const s = speicher();
  try {
    s?.removeItem(PRAEFIX + schluessel);
  } catch {
    /* egal */
  }
}

/**
 * Wie `useState`, aber der Wert überlebt das Neuladen.
 *
 * Der Startwert wird nur beim ersten Rendern gelesen, nicht bei jedem – sonst
 * würde ein Wechsel des Startwerts (etwa eine neu berechnete Aufgabe) den
 * gespeicherten Stand überschreiben.
 */
export function useGespeichert<T>(
  schluessel: string,
  start: T,
): [T, (wert: T | ((alt: T) => T)) => void, () => void] {
  const [wert, setWert] = useState<T>(() => lies<T>(schluessel) ?? start);
  const ersterLauf = useRef(true);

  useEffect(() => {
    // Beim ersten Rendern nicht schreiben: der gelesene Wert ist schon da.
    if (ersterLauf.current) {
      ersterLauf.current = false;
      return;
    }
    schreib(schluessel, wert);
  }, [schluessel, wert]);

  const zuruecksetzen = useCallback(() => {
    loesche(schluessel);
    setWert(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel]);

  return [wert, setWert, zuruecksetzen];
}

/**
 * Merkt sich die zuletzt geöffnete Seite.
 *
 * Der Seitennamen steht ohnehin im Hash und übersteht damit ein Neuladen. Diese
 * Ablage greift, wenn der Hash fehlt – etwa beim Öffnen der installierten App
 * über das Startsymbol oder nach einem Update. Dann landet man dort, wo man
 * aufgehört hat, statt immer auf der Startseite.
 */
export const SEITE_SCHLUESSEL = 'letzte-seite';

export function merkeSeite(seite: string): void {
  schreib(SEITE_SCHLUESSEL, seite);
}

export function letzteSeite(): string | null {
  return lies<string>(SEITE_SCHLUESSEL);
}
