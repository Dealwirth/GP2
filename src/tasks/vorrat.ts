import type { Task } from '../domain/types.ts';
import { ATOME } from '../content/curriculum/index.ts';
import { lies, schreib } from '../ui/persistenz.ts';
import { holeAlleAufgaben, merkeAufgaben } from './ablage.ts';
import { bekannteSeedTexte, merkeSeedTexte, neueSeedRunde, seedAufgabenFuerAtomNeu, seedRunde } from './seed.ts';

/**
 * Vorratslager.
 *
 * Der Vorrat hält jederzeit fertige, geprüfte Aufgaben bereit, damit der Start
 * einer Sitzung ein Zugriff ist und kein Warten. Er entsteht vollständig aus
 * dem eingebauten Aufgabenbestand – ohne Netz, ohne Kontingent, in
 * Millisekunden.
 *
 * Der Vorrat liegt in derselben Ablage wie alles andere und überlebt damit
 * ein Neuladen. Benutzte Aufgaben werden als verbraucht markiert, damit sich
 * keine Runde wiederholt.
 */

/** Wie viele fertige Aufgaben mindestens bereitliegen sollen. */
export const VORRAT_MINIMUM = 6;

/**
 * Obergrenze des Vorrats.
 *
 * Muss zur Ringpuffergröße der Ablage passen (`ablage.MAX` = 60). Steht hier
 * eine kleinere Zahl, entsteht eine Reserve, die nie genutzt wird: Aufgaben
 * werden gebaut, in die Ablage gelegt und beim nächsten Durchgang sofort
 * wieder verdrängt. Steht hier eine größere, verdrängt die Ablage genau die
 * Aufgaben, die der Vorrat noch anbieten will.
 */
export const VORRAT_MAXIMUM = 60;

/**
 * Wie viele Themen ein Seed-Durchgang höchstens anfasst.
 *
 * Jede Sitzung braucht nur wenige neue Aufgaben. Der Zeiger bleibt deshalb
 * stehen, sobald der Bedarf gedeckt ist – das nächste Mal geht es beim selben
 * Thema weiter. So wandert der Stoff langsam durch den Lehrplan, statt in
 * wenigen Tagen durchgerauscht zu sein. Die Zahl ist nur eine Obergrenze für
 * den Fall, dass ein Thema einmal nichts hergibt.
 */
const SEED_THEMEN_JE_FUELLUNG = 60;

/**
 * Wie viele noch ungestellte Aufgaben über dem Ziel auf Vorrat gebaut werden.
 *
 * Der Vorrat nützt nur, wenn er einen Verbrauchsschub abfängt. Liegt genau das
 * Ziel bereit, ist er nach einer einzigen Sitzung wieder leer und die nächste
 * Sitzung wartet auf die Erzeugung. Die Reserve kostet nichts – die Aufgaben
 * entstehen ohne Netz in Millisekunden – und hält den Betrieb auch dann auf,
 * wenn mehrere Sitzungen kurz hintereinander laufen.
 */
const SEED_RESERVE = 12;

const SEED_ROTATION_SCHLUESSEL = 'seed-rotation';

/**
 * Baut den Vorrat auf – ein Fenster über die Themen, das weiterwandert.
 *
 * Warum ein Fenster und nicht alles auf einmal: Der Vorrat ist ein Ringpuffer
 * (siehe `ablage.ts`), es liegen also nie mehr als `VORRAT_MAXIMUM` Aufgaben
 * darin. Alle 1 500 Seed-Aufgaben auf einmal zu bauen, wäre reine Arbeit für
 * den Papierkorb. Stattdessen deckt jeder Durchgang ein Fenster von Themen ab
 * und rückt dann weiter. Über viele Sitzungen wandert das Fenster durch den
 * ganzen Lehrplan – der Stoff geht also nicht aus, und dieselbe Aufgabe
 * wiederholt sich nicht sofort.
 *
 * Zwei Zählweisen waren hier die Ursache eines echten Fehlers:
 *
 *  - Gemessen wird der **unbenutzte** Vorrat (`bereit`), nicht die Ablage.
 *    Eine gestellte Aufgabe bleibt in der Ablage, zählt aber nicht mehr als
 *    Vorrat. Mit der alten Zählweise (Ablagegröße) galt der Vorrat als voll,
 *    sobald 40 Aufgaben irgendwann einmal gebaut worden waren – auch wenn
 *    keine einzige davon noch bereitlag.
 *  - Der Bedarf wird gegen das **Ziel** gerechnet, nicht gegen die Obergrenze.
 *    Sonst füllte ein Aufruf bis 40, obwohl vier gewünscht waren, und die
 *    nächsten Aufrufe hatten nichts mehr zu tun.
 *
 * Der Fortschritt wird gespeichert. Nach einem Neuladen geht es dort weiter,
 * wo es aufgehört hat, statt wieder bei Thema 1 zu beginnen.
 *
 * `ziel` ist die gewünschte Zahl bereitliegender Aufgaben; gebaut wird bis
 * `ziel + SEED_RESERVE`.
 */
export function fuelleVorratMitSeed(ziel = VORRAT_MINIMUM): number {
  const bisher = lies<number>(SEED_ROTATION_SCHLUESSEL);
  let start = Number.isInteger(bisher) ? (bisher as number) : 0;
  if (start < 0 || start >= ATOME.length) start = 0;

  const bedarf = Math.max(0, ziel + SEED_RESERVE - holeVorrat().length);
  if (bedarf === 0) {
    const stand = aktualisiereZahlen();
    melde(stand);
    return stand.bereit;
  }

  const bekannt = bekannteSeedTexte();
  let runde = seedRunde();
  const aufgaben: Task[] = [];
  const themenTexte = new Set<string>();
  let themen = 0;

  // Der Zeiger bleibt stehen, sobald der Bedarf gedeckt ist. Dadurch wandert
  // der Stoff genau so schnell, wie er verbraucht wird – nicht schneller.
  //
  // `themenTexte` fängt den zweiten Wiederholungsweg ab: Ein Fragetext, der
  // bei einem Thema nichts hergibt, taucht beim nächsten Thema desselben
  // Kapitels wieder auf. Das Textgedächtnis greift erst beim nächsten Durchgang;
  // innerhalb eines Fensters braucht es diese Sperre.
  //
  // Läuft der Zeiger einmal ganz herum, ohne dass etwas dazugekommen ist, ist
  // der Stoff durchgearbeitet. Dann beginnt eine neue Runde mit anderen
  // Frageformen. Das wird ausdrücklich geprüft und nicht aus einem Zähler
  // geschlossen: Ein einzelnes Thema ohne neue Frage darf nicht die ganze
  // Runde umwerfen.
  let runden = 0;
  while (aufgaben.length < bedarf && themen < SEED_THEMEN_JE_FUELLUNG) {
    const atom = ATOME[start]!;
    for (const aufgabe of seedAufgabenFuerAtomNeu(atom, bekannt, runde)) {
      if (aufgaben.length >= bedarf) break;
      if (themenTexte.has(aufgabe.proposal.prompt)) continue;
      themenTexte.add(aufgabe.proposal.prompt);
      aufgaben.push(aufgabe);
    }
    start = (start + 1) % ATOME.length;
    themen += 1;
    if (start === 0) {
      runden += 1;
      if (aufgaben.length > 0) break;
      if (runden > 1) break; // Zwei volle Runden ohne eine einzige Aufgabe.
      neueSeedRunde();
      bekannt.clear();
      runde = seedRunde();
    }
  }

  // Erst jetzt ins Gedächtnis: Was im Vorrat liegt, ist wirklich gestellt.
  if (aufgaben.length > 0) {
    merkeAufgaben(aufgaben);
    merkeSeedTexte(aufgaben.map((t) => t.proposal.prompt));
  }

  schreib(SEED_ROTATION_SCHLUESSEL, start);

  const stand = aktualisiereZahlen();
  melde(stand);
  return stand.bereit;
}

const BENUTZT_SCHLUESSEL = 'vorrat-benutzt';

/** Kennungen bereits gestellter Aufgaben. */
function ladeBenutzt(): Set<string> {
  const roh = lies<string[]>(BENUTZT_SCHLUESSEL);
  return new Set(Array.isArray(roh) ? roh : []);
}

function schreibeBenutzt(menge: Set<string>): void {
  // Nur die letzten 200 behalten – ältere Aufgaben sind ohnehin aus dem
  // Ringpuffer der Ablage gefallen.
  schreib(BENUTZT_SCHLUESSEL, [...menge].slice(-200));
}

/** Markiert Aufgaben als gestellt, damit der Vorrat sie nicht erneut anbietet. */
export function markiereBenutzt(ids: string[]): void {
  if (ids.length === 0) return;
  const menge = ladeBenutzt();
  for (const id of ids) menge.add(id);
  schreibeBenutzt(menge);
}

/** Der Vorrat: fertige Aufgaben, die noch niemand gesehen hat. */
export function holeVorrat(): Task[] {
  const benutzt = ladeBenutzt();
  return holeAlleAufgaben().filter((t) => !benutzt.has(t.taskId));
}

/** Kennzahlen für die Anzeige im Kopf. */
export interface Vorratsstand {
  /** Fertige, unbenutzte Aufgaben. */
  bereit: number;
  /** Insgesamt abgelegt, auch die schon gestellten. */
  gesamt: number;
  /** Es wird gerade nachgefüllt. */
  fuelltAuf: boolean;
  /** Letzter Fehler beim Nachfüllen, sonst null. */
  fehler: string | null;
}

const leererStand: Vorratsstand = { bereit: 0, gesamt: 0, fuelltAuf: false, fehler: null };

let stand: Vorratsstand = { ...leererStand };
let laufendeFuellung: Promise<void> | null = null;
const horcher = new Set<(s: Vorratsstand) => void>();

function melde(neu: Partial<Vorratsstand>): void {
  stand = { ...stand, ...neu };
  for (const h of horcher) h(stand);
}

/** Abonniert Änderungen am Vorratsstand – für die Anzeige. */
export function beobachteVorrat(horcherFn: (s: Vorratsstand) => void): () => void {
  horcher.add(horcherFn);
  horcherFn(aktualisiereZahlen());
  return () => horcher.delete(horcherFn);
}

function aktualisiereZahlen(): Vorratsstand {
  const gesamt = holeAlleAufgaben().length;
  const bereit = holeVorrat().length;
  stand = { ...stand, gesamt, bereit };
  return stand;
}

/** Liest den aktuellen Stand, ohne ihn zu verändern. */
export function vorratsstand(): Vorratsstand {
  return aktualisiereZahlen();
}

/**
 * Füllt den Vorrat im Hintergrund auf mindestens `ziel` Aufgaben auf.
 *
 * Gibt ein Promise zurück, das aufgelöst wird, sobald der Vorrat steht. Mehr-
 * fachaufrufe während einer laufenden Füllung teilen sich dieselbe Arbeit – so
 * kann die Anzeige gefahrlos bei jedem Rendern nachfüllen lassen.
 */
export function fuelleVorratAuf(ziel = VORRAT_MINIMUM): Promise<void> {
  if (laufendeFuellung) return laufendeFuellung;
  laufendeFuellung = fuellung(ziel).finally(() => {
    laufendeFuellung = null;
  });
  return laufendeFuellung;
}

async function fuellung(ziel: number): Promise<void> {
  // Die Schleife zählt **bereitliegende** Aufgaben, nicht die Ablage. Ein
  // Ringpuffer hält alte, schon gestellte Aufgaben – mit deren Zahl galt der
  // Vorrat fälschlich als voll. Die Obergrenze verhindert, dass ein Thema ohne
  // neue Frage die Schleife endlos dreht.
  melde({ fuelltAuf: true, fehler: null });
  for (let runde = 0; runde < 6 && holeVorrat().length < ziel; runde += 1) {
    fuelleVorratMitSeed(ziel);
  }
  melde({ ...aktualisiereZahlen(), fuelltAuf: false, fehler: null });
}
