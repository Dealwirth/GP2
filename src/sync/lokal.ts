import { storage } from '../storage/index.ts';
import { ladeErgebnisse, speichereErgebnisse } from '../storage/ergebnisse.ts';
import { lies, schreib } from '../ui/persistenz.ts';
import { leererStand, SYNC_FORMAT, type SyncStand } from './typen.ts';

/**
 * Lesen und Schreiben auf diesem Gerät.
 *
 * Getrennt vom Netz in `transport.ts` und von der Zusammenführung in
 * `typen.ts`. Der Grund ist nicht Ordnungsliebe, sondern Prüfbarkeit: Alles,
 * was hier steht, fasst Speicher an – und alles, was Speicher anfasst, lässt
 * sich in einem Test nicht so sauber nachstellen wie eine reine Funktion.
 * Was sich nicht sauber nachstellen lässt, wird auch nicht getestet, und
 * ungetesteter Code, der Lerndaten schreibt, ist genau die Sorte Code, die
 * Daten verliert.
 */

const GERAET_SCHLUESSEL = 'geraet-kennung';

/**
 * Eine kurze, stabile Kennung dieses Geräts.
 *
 * Nur für die Anzeige: „Zuletzt geschrieben von Gerät 7f3a". Damit lässt sich
 * nach einem Abgleich erkennen, ob der eigene Stand angekommen ist.
 */
export function geraeteKennung(): string {
  const vorhanden = lies<string>(GERAET_SCHLUESSEL);
  if (vorhanden && /^[a-f0-9]{4}$/.test(vorhanden)) return vorhanden;
  const bytes = crypto.getRandomValues(new Uint8Array(2));
  const neu = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  schreib(GERAET_SCHLUESSEL, neu);
  return neu;
}

/** Der aktuelle Stand dieses Geräts, in der Form, die übertragen wird. */
export async function holeLokalenStand(): Promise<SyncStand> {
  const [zustaende, versuche, sitzungen, ergebnisse] = await Promise.all([
    storage.alleZustaende(),
    storage.versuche(),
    storage.sitzungen(),
    ladeErgebnisse(),
  ]);

  return {
    formatVersion: SYNC_FORMAT,
    standAm: new Date().toISOString(),
    geraet: geraeteKennung(),
    zustaende,
    versuche,
    sitzungen,
    ergebnisse,
  };
}

/**
 * Schreibt einen Stand auf dieses Gerät.
 *
 * Bewusst **schreiben statt ersetzen**: Jeder Datensatz wird einzeln nach
 * seiner Kennung abgelegt. Ein `loescheAlles` davor wäre kürzer zu schreiben
 * und genau deshalb gefährlich – versagt der Schreibvorgang in der Mitte,
 * wäre der Lernstand halb gelöscht und halb neu. So ist ein Abbruch
 * folgenlos: Was noch nicht geschrieben wurde, fehlt eben, und der nächste
 * Abgleich holt es nach.
 *
 * Sitzungen gehen über `schreibeSitzung`, nicht über `sitzungStarten`: Sonst
 * würde der Abgleich die gerade laufende Übung dieses Geräts ersetzen.
 */
export async function schreibeLokalenStand(stand: SyncStand): Promise<void> {
  for (const zustand of stand.zustaende) await storage.schreibeZustand(zustand);
  for (const versuch of stand.versuche) await storage.protokolliereVersuch(versuch);
  for (const sitzung of stand.sitzungen) await storage.schreibeSitzung(sitzung);
  await speichereErgebnisse(stand.ergebnisse);
}

/**
 * Eine Kurzfassung des Inhalts.
 *
 * Zweck: **Nur senden, wenn sich wirklich etwas geändert hat.** Ohne diese
 * Prüfung würde jeder Sichtwechsel einen Upload auslösen. Das kostet
 * Kontingent und, schlimmer, es macht es unmöglich zu erkennen, ob ein
 * Abgleich tatsächlich etwas geändert hat – die Frage, die man sich nach
 * einem Abgleich stellt.
 *
 * Die Signatur ist absichtlich kein Hash über alles: Bei tausenden Versuchen
 * wäre das teuer und brächte nichts. Anzahl plus jüngster Zeitstempel genügt,
 * weil jeder neue Versuch die Anzahl erhöht und jeder geänderte Zustand den
 * Zeitstempel verschiebt.
 */
export function signatur(stand: SyncStand): string {
  const juengsterVersuch = stand.versuche.reduce(
    (juengster, v) => (String(v.createdAt) > juengster ? String(v.createdAt) : juengster),
    '',
  );
  const summeAntworten = stand.zustaende.reduce((summe, z) => summe + (z.answered || 0), 0);
  const spätesteSichtung = stand.zustaende.reduce(
    (spaet, z) => (String(z.lastSeen ?? '') > spaet ? String(z.lastSeen ?? '') : spaet),
    '',
  );
  const letztePruefung = stand.ergebnisse.reduce(
    (spaet, e) => (String(e.beendetAm ?? '') > spaet ? String(e.beendetAm ?? '') : spaet),
    '',
  );

  return [
    stand.zustaende.length,
    summeAntworten,
    spätesteSichtung,
    stand.versuche.length,
    juengsterVersuch,
    stand.sitzungen.length,
    stand.ergebnisse.length,
    letztePruefung,
  ].join('|');
}

/** Ein leerer Stand für Vergleiche. */
export function leereSignatur(): string {
  return signatur(leererStand());
}
