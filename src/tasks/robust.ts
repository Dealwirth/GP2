/**
 * Fehlersammelstelle für den Aufgabenvorrat.
 *
 * Warum es das gibt: Wenn ein einzelner kuratierter Datensatz die
 * Validierungspipeline nicht besteht, soll er **nicht** die ganze Anwendung
 * abschießen. Ein Wurf mitten im Rendern führt zu einer leeren Seite – und
 * damit zu einer App, die stumm nichts mehr zeigt. Genau das ist passiert.
 *
 * Die Lösung ist bewusst zweiteilig:
 *   - Zur Laufzeit wird der fehlerhafte Datensatz übersprungen und der Grund
 *     protokolliert. Die App bleibt bedienbar.
 *   - Im Test wird die Liste auf leer geprüft. Ein Inhaltsfehler fällt damit
 *     in der Prüfung auf und wird nicht stillschweigend verschluckt.
 *
 * Weggucken wäre falsch, Abstürzen aber auch.
 */

export interface Sammlungfehler {
  /** Woher der Datensatz stammt, z. B. 'fall'. */
  quelle: string;
  /** Kennung des Datensatzes, sofern bekannt. */
  id: string;
  grund: string;
}

const fehler: Sammlungfehler[] = [];

/** Überspringt einen fehlerhaften Datensatz und merkt sich den Grund. */
export function ueberspringeFehlerhaft<T>(
  quelle: string,
  id: string,
  bauen: () => T,
): T | null {
  try {
    return bauen();
  } catch (ursache) {
    fehler.push({
      quelle,
      id,
      grund: ursache instanceof Error ? ursache.message : String(ursache),
    });
    return null;
  }
}

/**
 * Baut eine Sammlung Element für Element auf und überspringt fehlerhafte.
 *
 * Der Sinn liegt in der Granularität: Fällt ein Datensatz aus, bleiben die
 * übrigen erhalten. Die App zeigt dann etwas weniger Aufgaben statt gar keine.
 */
export function sammleSicher<T>(
  quelle: string,
  bauen: { id: string; erzeuge: () => T }[],
): T[] {
  const ergebnis: T[] = [];
  for (const eintrag of bauen) {
    const wert = ueberspringeFehlerhaft(quelle, eintrag.id, eintrag.erzeuge);
    if (wert !== null) ergebnis.push(wert);
  }
  return ergebnis;
}

/** Führt Sammlungen zusammen, ohne dass eine einzige den Aufbau abbricht. */
export function sammleQuellen(
  quellen: { name: string; liefere: () => unknown[] }[],
): unknown[] {
  const ergebnis: unknown[] = [];
  for (const quelle of quellen) {
    const inhalt = ueberspringeFehlerhaft(quelle.name, 'sammlung', quelle.liefere);
    if (inhalt) ergebnis.push(...inhalt);
  }
  return ergebnis;
}

/** Alle übersprungenen Datensätze – im Test muss diese Liste leer sein. */
export function sammlungfehler(): readonly Sammlungfehler[] {
  return fehler;
}

/** Setzt die Liste zurück. Nur für Tests. */
export function leereFehlerliste(): void {
  fehler.length = 0;
}
