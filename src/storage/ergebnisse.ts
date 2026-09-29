import type { Pruefungsergebnis } from '../domain/exam/simulation.ts';

/**
 * Abgelegte Prüfungsergebnisse.
 *
 * Sie liegen in `localStorage` und nicht in IndexedDB, weil es wenige sind und
 * sie als Ganzes gelesen werden: Die Prognose rechnet über alle Ergebnisse,
 * und die Anzeige listet sie auf. Ein Index wäre hier nur Umstand.
 *
 * Der Schlüssel hat bewusst **kein** `egt:`-Präfix. Er stammt aus der ersten
 * Fassung der Anwendung, und ihn umzubenennen hieße: Bei jedem Nutzer, der
 * schon Prüfungen geschrieben hat, wären die Ergebnisse weg. Ein
 * Schönheitsfehler ist billiger als verlorene Daten.
 *
 * Eigene Datei, weil außer dem Zustandsspeicher jetzt auch die
 * Synchronisation darauf zugreift. Über `store.ts` wäre das ein Ringbezug
 * geworden – und ein Ringbezug in dieser Größe ist der Anfang eines
 * Problems, das man monatelang nicht findet.
 */

export const ERGEBNISSE_SPEICHER = 'pruefungs-ergebnisse';

export async function ladeErgebnisse(): Promise<Pruefungsergebnis[]> {
  try {
    const roh = localStorage.getItem(ERGEBNISSE_SPEICHER);
    if (!roh) return [];
    const geparst: unknown = JSON.parse(roh);
    if (!Array.isArray(geparst)) return [];
    // Nur Einträge mit Kennung sind brauchbar – und nur solche lassen sich
    // zusammenführen.
    return (geparst as Pruefungsergebnis[]).filter((e) => Boolean(e?.pruefungId));
  } catch {
    return [];
  }
}

export async function speichereErgebnisse(ergebnisse: Pruefungsergebnis[]): Promise<void> {
  try {
    localStorage.setItem(ERGEBNISSE_SPEICHER, JSON.stringify(ergebnisse));
  } catch {
    /* Speicher voll oder gesperrt – die Anwendung läuft weiter. */
  }
}

export async function loescheErgebnisse(): Promise<void> {
  try {
    localStorage.removeItem(ERGEBNISSE_SPEICHER);
  } catch {
    /* egal */
  }
}
