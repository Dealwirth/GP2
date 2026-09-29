import type { Attempt, Session, TopicStateRecord } from '../domain/types.ts';
import type { Pruefungsergebnis } from '../domain/exam/simulation.ts';

/**
 * Der Stand, der zwischen Geräten wandert.
 *
 * Warum ein eigener Typ und nicht einfach „die Datenbank": Die Datenbankform
 * darf sich mit jeder Verbesserung des Codes ändern. Der Sync-Stand ist ein
 * **Format mit Versionsnummer** und einer Normalisierung, die fehlende Felder
 * ergänzt. Nur so gilt beides gleichzeitig: Der Code darf weiterentwickelt
 * werden, und der abgelegte Lernstand bleibt lesbar.
 *
 * Und warum hier *nur* Lernstand steht: Alles, was in diesem Typ fehlt, ist
 * geräteabhängig. Die zuletzt geöffnete Seite, ein laufender Prüfungsdurchgang
 * mit Restzeit, die Fensterbreite – das auf ein zweites Gerät zu übertragen
 * wäre kein Fortschritt, sondern Verwirrung. Was hier steht, ist genau das,
 * was „mein Lernstand" bedeutet: Themenzustände, Versuche, Sitzungen,
 * Prüfungsergebnisse.
 *
 * Kein Feld ist optional. Wer den Stand liest, findet immer ein Array vor und
 * muss nicht an jeder Stelle prüfen, ob etwas fehlt.
 */
export interface SyncStand {
  formatVersion: number;
  /** Wann dieser Stand zuletzt geschrieben wurde (ISO). */
  standAm: string;
  /** Die Gerätekennung, die zuletzt geschrieben hat – nur zur Anzeige. */
  geraet: string;
  zustaende: TopicStateRecord[];
  versuche: Attempt[];
  sitzungen: Session[];
  ergebnisse: Pruefungsergebnis[];
}

/** Aktuelles Standformat. Erhöhen, wenn sich die Struktur ändert. */
export const SYNC_FORMAT = 1;

/** Ein leerer Stand – Ausgangspunkt für ein frisches Konto. */
export function leererStand(standAm = new Date().toISOString(), geraet = ''): SyncStand {
  return {
    formatVersion: SYNC_FORMAT,
    standAm,
    geraet,
    zustaende: [],
    versuche: [],
    sitzungen: [],
    ergebnisse: [],
  };
}

function textOder(wert: unknown, ersatz: string): string {
  return typeof wert === 'string' ? wert : ersatz;
}

/**
 * Bringt beliebige gelesene Daten in die aktuelle Form.
 *
 * Diese Funktion ist der Grund, warum ein Update die Lerndaten nicht kostet.
 * Sie wirft nie, sie wirft nichts weg, was sie kennt, und sie ergänzt alles,
 * was fehlt – auch dann, wenn der Stand von einer neueren Fassung geschrieben
 * wurde als der, die ihn gerade liest. Unbekannte Felder werden verworfen,
 * Datensätze ohne Kennung aussortiert (ohne Kennung ließen sie sich weder
 * zusammenführen noch zuordnen).
 */
export function normalisiereStand(roh: unknown): SyncStand {
  const o = (roh && typeof roh === 'object' ? roh : {}) as Record<string, unknown>;
  const liste = <T>(wert: unknown): T[] => (Array.isArray(wert) ? (wert as T[]) : []);

  return {
    formatVersion: SYNC_FORMAT,
    standAm: textOder(o.standAm, new Date(0).toISOString()),
    geraet: textOder(o.geraet, ''),
    zustaende: liste<TopicStateRecord>(o.zustaende).filter((z) => Boolean(z?.topicId)),
    versuche: liste<Attempt>(o.versuche).filter((v) => Boolean(v?.attemptId)),
    sitzungen: liste<Session>(o.sitzungen).filter((s) => Boolean(s?.sessionId)),
    ergebnisse: liste<Pruefungsergebnis>(o.ergebnisse).filter((e) => Boolean(e?.pruefungId)),
  };
}

/** Der neuere von zwei Zeitstempeln. Leere und ungültige Werte verlieren. */
function spaeter(a: string | null | undefined, b: string | null | undefined): string | null {
  const zeit = (t: string | null | undefined): number => {
    if (!t) return Number.NEGATIVE_INFINITY;
    const ms = new Date(t).getTime();
    return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY;
  };
  return zeit(b) > zeit(a) ? (b ?? null) : (a ?? null);
}

/**
 * Entscheidet, welcher von zwei Zuständen zu einem Thema gewinnt.
 *
 * Regel: **Wer mehr Antworten gesehen hat, weiß mehr.** Ein Zustand ist ein
 * Aggregat – Trefferquote, Serie und Verfall sind aus den Versuchen
 * entstanden. Den kleineren Stand zu übernehmen würde Fortschritt löschen;
 * den größeren zu nehmen kostet höchstens ein paar Details.
 *
 * Bei gleicher Anzahl entscheidet der spätere Zeitpunkt. Zwei Felder werden
 * unabhängig davon zusammengelegt, weil sie Ereignisse und nicht Zustände
 * sind: `labSolved` bleibt gesetzt, wenn es auf irgendeiner Seite gesetzt war,
 * und `nextDue` nimmt den späteren Termin an – sonst würde ein Abgleich eine
 * Wiederholung vorziehen, nur weil das andere Gerät länger nichts getan hat.
 */
function besterZustand(a: TopicStateRecord, b: TopicStateRecord): TopicStateRecord {
  const gewinner =
    b.answered !== a.answered
      ? b.answered > a.answered
        ? b
        : a
      : spaeter(a.lastSeen, b.lastSeen) === b.lastSeen
        ? b
        : a;

  return {
    ...gewinner,
    labSolved: a.labSolved || b.labSolved,
    nextDue: spaeter(a.nextDue, b.nextDue),
    streakStartedAt: spaeter(a.streakStartedAt, b.streakStartedAt),
  };
}

/** Später beendete Sitzung gewinnt; eine laufende verliert gegen eine beendete. */
function bessereSitzung(a: Session, b: Session): Session {
  if (!a.endedAt && b.endedAt) return b;
  if (a.endedAt && !b.endedAt) return a;
  const links = a.endedAt ?? a.startedAt;
  const rechts = b.endedAt ?? b.startedAt;
  return spaeter(links, rechts) === rechts ? b : a;
}

function nachSchluessel<T, K extends string>(
  a: T[],
  b: T[],
  schluessel: (eintrag: T) => K,
  waehle: (links: T, rechts: T) => T,
): T[] {
  const karte = new Map<K, T>();
  for (const eintrag of a) karte.set(schluessel(eintrag), eintrag);
  for (const eintrag of b) {
    const k = schluessel(eintrag);
    const vorhanden = karte.get(k);
    karte.set(k, vorhanden ? waehle(vorhanden, eintrag) : eintrag);
  }
  return [...karte.values()];
}

/**
 * Führt zwei Stände zusammen.
 *
 * Reine Funktion, kein Netz, kein Speicher – deshalb ist sie prüfbar, und
 * deshalb ist der wichtigste Teil der Synchronisation kein Nebenprodukt,
 * sondern getestet.
 *
 * Die Zusammenführung ist absichtlich **kein** „letzter gewinnt": Bei
 * Lernständen wäre das ein Würfelspiel. Jede Datenart hat ihre eigene,
 * begründete Regel:
 *
 *  - Versuche: Vereinigung. Ein Versuch ist ein Ereignis und wird nie gelöscht.
 *  - Zustände: der Stand mit mehr Antworten (siehe `besterZustand`).
 *  - Sitzungen: die später beendete.
 *  - Prüfungsergebnisse: das später beendete.
 *
 * Das Ergebnis ist **reihenfolgeunabhängig bis auf die Gleichstände** und
 * enthält nie weniger als jeder der beiden Ausgangsstände. Genau das ist die
 * Eigenschaft, die zählt: Kein Gerät kann durch einen Abgleich verlieren, was
 * ein anderes bereits weiß.
 */
export function vereinigeStand(lokal: SyncStand, fremd: SyncStand): SyncStand {
  const versuche = nachSchluessel(
    lokal.versuche,
    fremd.versuche,
    (v) => v.attemptId,
    (a) => a,
  ).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

  return {
    formatVersion: SYNC_FORMAT,
    standAm: spaeter(lokal.standAm, fremd.standAm) ?? new Date().toISOString(),
    geraet: lokal.geraet || fremd.geraet,
    zustaende: nachSchluessel(lokal.zustaende, fremd.zustaende, (z) => z.topicId, besterZustand),
    versuche,
    sitzungen: nachSchluessel(lokal.sitzungen, fremd.sitzungen, (s) => s.sessionId, bessereSitzung),
    ergebnisse: nachSchluessel(
      lokal.ergebnisse,
      fremd.ergebnisse,
      (e) => e.pruefungId,
      (a, b) => (a.beendetAm >= b.beendetAm ? a : b),
    ),
  };
}

/**
 * Kurzfassung eines Standes für die Anzeige.
 *
 * Der Nutzer soll nach einem Abgleich sehen, dass etwas passiert ist – mit
 * Zahlen, die er schon kennt: Themen, beantwortete Fragen, Sitzungen,
 * Prüfungen.
 */
export function standKennzahlen(stand: SyncStand): {
  themen: number;
  antworten: number;
  sitzungen: number;
  pruefungen: number;
} {
  return {
    themen: stand.zustaende.length,
    antworten: stand.zustaende.reduce(
      (summe, z) => summe + (typeof z.answered === 'number' ? z.answered : 0),
      0,
    ),
    sitzungen: stand.sitzungen.length,
    pruefungen: stand.ergebnisse.length,
  };
}
