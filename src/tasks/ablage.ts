import type { Task } from '../domain/types.ts';
import { lies, schreib } from '../ui/persistenz.ts';

/**
 * Lokale Aufgabenablage.
 *
 * Warum es das braucht: Der statische Aufgabenvorrat lässt sich jederzeit
 * identisch neu aufbauen – eine vom Modell erzeugte Aufgabe nicht. Sie wird
 * einmal erzeugt, geprüft und dann gestellt; nach einem Neuladen wäre sie
 * verschwunden, und die laufende Sitzung hätte eine Lücke.
 *
 * Die Ablage liegt im Browser, nicht auf einem Server. Sie enthält Aufgaben,
 * keine Antworten des Lernenden – der Lernstand bleibt getrennt in IndexedDB.
 * Bewusst als Ringpuffer begrenzt: localStorage ist knapp, und alte Aufgaben
 * werden nicht mehr gebraucht.
 */

const SCHLUESSEL = 'aufgaben-ablage';

/** Wie viele Aufgaben vorgehalten werden. */
const MAX = 60;

interface Ablage {
  aufgaben: Record<string, Task>;
  /** Reihenfolge des Einfügens, älteste zuerst. */
  reihenfolge: string[];
}

function leereAblage(): Ablage {
  return { aufgaben: {}, reihenfolge: [] };
}

function lade(): Ablage {
  const roh = lies<Ablage>(SCHLUESSEL);
  if (!roh || typeof roh !== 'object' || !roh.aufgaben || !Array.isArray(roh.reihenfolge)) {
    return leereAblage();
  }
  return roh;
}

/** Legt Aufgaben ab und wirft die ältesten heraus, wenn es zu viele werden. */
export function merkeAufgaben(aufgaben: Task[]): void {
  if (aufgaben.length === 0) return;
  const ablage = lade();
  for (const aufgabe of aufgaben) {
    if (!ablage.aufgaben[aufgabe.taskId]) ablage.reihenfolge.push(aufgabe.taskId);
    ablage.aufgaben[aufgabe.taskId] = aufgabe;
  }
  while (ablage.reihenfolge.length > MAX) {
    const aeltester = ablage.reihenfolge.shift();
    if (aeltester) delete ablage.aufgaben[aeltester];
  }
  schreib(SCHLUESSEL, ablage);
}

/** Holt abgelegte Aufgaben zu den angegebenen Kennungen. */
export function holeAufgaben(ids: string[]): Task[] {
  const ablage = lade();
  return ids.map((id) => ablage.aufgaben[id]).filter((t): t is Task => Boolean(t));
}

/** Alle abgelegten Aufgaben – für Duplikatsprüfung über Sitzungen hinweg. */
export function holeAlleAufgaben(): Task[] {
  return Object.values(lade().aufgaben);
}
