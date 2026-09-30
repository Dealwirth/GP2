import type { Task } from '../domain/types.ts';
import type { AiEinstellungen } from '../ai/client.ts';
import { erzeugeAufgaben } from '../ai/generator.ts';
import { holeAtom } from '../content/curriculum/index.ts';
import { lies, schreib } from '../ui/persistenz.ts';
import { holeAlleAufgaben, merkeAufgaben } from './ablage.ts';
import { waehleThemen } from './session.ts';

/**
 * Vorratslager.
 *
 * Warum es das braucht: Die Aufgabenerzeugung dauert – das Modell antwortet,
 * die Engine rechnet, die Zweitprüfung urteilt. Wenn der Lernende auf „Start"
 * drückt und erst dann erzeugt wird, wartet er. Stattdessen hält die App
 * jederzeit einen Vorrat fertiger, geprüfter Aufgaben bereit und füllt ihn im
 * Hintergrund nach. Der Start einer Sitzung ist dann ein Zugriff, kein Warten.
 *
 * Der Vorrat liegt in derselben Ablage wie alles andere und überlebt damit
 * ein Neuladen. Er wird nie geleert – nur benutzte Aufgaben werden als
 * verbraucht markiert, damit sich keine Runde wiederholt.
 */

/** Wie viele fertige Aufgaben mindestens bereitliegen sollen. */
export const VORRAT_MINIMUM = 10;

/** Obergrenze: mehr als das braucht niemand, und localStorage ist knapp. */
export const VORRAT_MAXIMUM = 60;

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
 * Gibt ein Promise zurück, das aufgelöst wird, sobald der Vorrat steht oder
 * keine Aufgaben mehr nachkommen. Mehrfachaufrufe während einer laufenden
 * Füllung teilen sich dieselbe Arbeit – so kann die Anzeige gefahrlos bei
 * jedem Rendern nachfüllen lassen, ohne die KI zu fluten.
 */
export function fuelleVorratAuf(
  ai: AiEinstellungen,
  ziel = VORRAT_MINIMUM,
): Promise<void> {
  if (laufendeFuellung) return laufendeFuellung;
  laufendeFuellung = fuellung(ai, ziel).finally(() => {
    laufendeFuellung = null;
  });
  return laufendeFuellung;
}

async function fuellung(ai: AiEinstellungen, ziel: number): Promise<void> {
  if (!ai.aktiv) {
    melde({ fuelltAuf: false, fehler: null });
    return;
  }

  let bereit = holeVorrat().length;
  if (bereit >= ziel) {
    melde({ ...aktualisiereZahlen(), fuelltAuf: false, fehler: null });
    return;
  }

  melde({ fuelltAuf: true, fehler: null });

  // Themen nach demselben Maß wählen wie eine Sitzung: fällige zuerst,
  // schwache Themen zuerst, dann breiter Mix.
  const themen = await waehleThemen(Math.max(4, Math.ceil((ziel - bereit) / 2)));
  let letzterFehler: string | null = null;

  for (const topicId of themen) {
    if (bereit >= ziel || holeAlleAufgaben().length >= VORRAT_MAXIMUM) break;
    const atom = holeAtom(topicId);
    if (!atom) continue;

    try {
      const ergebnis = await erzeugeAufgaben(ai, atom, 2);
      if (ergebnis.aufgaben.length > 0) {
        merkeAufgaben(ergebnis.aufgaben);
        bereit = holeVorrat().length;
        melde(aktualisiereZahlen());
      }
      if (!ergebnis.kiAktiv) {
        letzterFehler = 'KI nicht erreichbar.';
        break;
      }
    } catch (fehler) {
      // Ein einzelnes Thema darf die Füllung nicht abbrechen. Der Grund wird
      // festgehalten und beim nächsten Anlauf erneut versucht.
      letzterFehler = fehler instanceof Error ? fehler.message : 'Unbekannter Fehler.';
    }
  }

  melde({ ...aktualisiereZahlen(), fuelltAuf: false, fehler: letzterFehler });
}
