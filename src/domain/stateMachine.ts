import type { LernEreignis, TopicState, TopicStateRecord } from './types.ts';

export function leererZustand(topicId: string): TopicStateRecord {
  return {
    topicId,
    state: 'neu',
    correctStreak: 0,
    hitRate: 0,
    confidenceRate: 0,
    answered: 0,
    lastSeen: null,
    streakStartedAt: null,
    nextDue: null,
    labSolved: false,
    fenster: [],
  };
}

/**
 * Reiner Zustandsübergang für ein einzelnes Ereignis.
 *
 * Die Beförderung zu `gefestigt` hängt am Erfolgsstrang und wird deshalb in
 * `wendeVersuchAn` vorgenommen – dieser Übergang kennt nur den Zustand.
 * Hier gilt die Grundregel: eine falsche Antwort widerlegt den Zustand.
 */
export function naechsterZustand(
  aktuell: TopicState,
  ereignisTyp: LernEreignis['type'],
): TopicState {
  switch (ereignisTyp) {
    case 'richtig':
      return 'gesehen';
    case 'falsch':
      // Alles fällt zurück. "Prüfungsreif" wird auf "gefestigt" abgestuft.
      return aktuell === 'pruefungsreif' ? 'gefestigt' : 'unsicher';
    case 'geraten':
      // Richtig, aber geraten: Fortschritt, aber noch keine Festigung.
      return 'gesehen';
    case 'ueberfaellig':
      return 'ueberfaellig';
    case 'laborErfolg':
      return aktuell;
  }
}

/** Richtig in Folge, ab dem ein Thema als gefestigt gilt. */
export const GEFESTIGT_MINDEST_ERREICHT = 3;
/** Mindestabstand zwischen der ersten und der letzten richtigen Antwort. */
export const GEFESTIGT_MINDEST_ABSTAND_TAGE = 3;

/**
 * Größe des frischen Fensters.
 *
 * Fünf Versuche sind die kürzeste Spanne, in der ein schlechter Tag sichtbar
 * wird, ohne dass ein einzelner Ausrutscher alles umwirft.
 */
export const FENSTER_GROESSE = 5;

export function istGefestigt(record: TopicStateRecord): boolean {
  return record.state === 'gefestigt' || record.state === 'pruefungsreif';
}

// ---------------------------------------------------------------------------
// Verfall
// ---------------------------------------------------------------------------

/**
 * Tage ohne Wiederholung, in denen noch nichts verfällt.
 *
 * Ohne Karenz würde ein Thema am Tag nach dem Lernen rechnerisch schlechter
 * dastehen, obwohl sich nichts geändert hat. Zwei Tage decken den normalen
 * Rhythmus aus „heute lernen, in ein bis zwei Tagen wiederholen" ab.
 */
export const VERFALL_KARENZ_TAGE = 2;

/**
 * Halbwertszeit des Verfalls in Tagen, je nach Zustand.
 *
 * Die Werte bilden den Unterschied zwischen „einmal gesehen" und „wirklich
 * gefestigt" ab: frisch Gelerntes ist nach einer Woche zur Hälfte weg,
 * prüfungsreifes Wissen trägt auch einen Monat Pause. Das ist keine
 * Verzierung – ohne diesen Unterschied würde ein Thema, das du einmal
 * angeschaut hast, genauso viel zählen wie eines, das du beherrschst.
 */
export const HALBWERTSZEIT_TAGE: Record<TopicState, number> = {
  neu: 7,
  gesehen: 7,
  unsicher: 7,
  ueberfaellig: 5,
  gefestigt: 21,
  pruefungsreif: 45,
};

/**
 * Faktor 0..1, mit dem die Reife nach längerer Pause abnimmt.
 *
 * Exponentieller Verfall mit zustandsabhängiger Halbwertszeit. Gibt es noch
 * keinen Zeitstempel, ist der Faktor 1 – ein Thema, das nie bearbeitet wurde,
 * soll nicht zusätzlich bestraft werden.
 */
export function verfallFaktor(record: TopicStateRecord, jetzt: Date = new Date()): number {
  if (!record.lastSeen) return 1;
  const tage = (jetzt.getTime() - new Date(record.lastSeen).getTime()) / 86_400_000;
  const wirksam = tage - VERFALL_KARENZ_TAGE;
  if (wirksam <= 0) return 1;
  return Math.pow(0.5, wirksam / HALBWERTSZEIT_TAGE[record.state]);
}

/**
 * Ab welcher Verfallshöhe der Zustand auf `ueberfaellig` umschlägt.
 *
 * 0,5 bedeutet: Der Zustand ist auf die Hälfte des Ausgangswerts gefallen.
 * Das entspricht bei gefestigtem Wissen rund 21 Tagen, bei einmal Gesehenem
 * rund 7 Tagen ohne Wiederholung – nah an der Halbwertszeit, aber bewusst
 * erst dort: In der Karenzzeit und kurz danach bleibt alles, wie es war.
 */
export const VERFALL_SCHWELLE = 0.5;

/**
 * Leitet den Verfall aus dem Kalender ab, statt auf ein Ereignis zu warten.
 *
 * Vorher blieb `ueberfaellig` unerreichbar: Der Zustand wurde nur gesetzt,
 * wenn jemand ausdrücklich das Ereignis `ueberfaellig` auslöste – und das tat
 * keine Stelle. Folge: „X Themen verfallen" stand immer auf null, der Coach
 * meldete es nie, und der Wiederholungsbonus im Sitzungs-Baukasten war toter
 * Code. Die Anzeige war da, die Zahl dahinter nicht.
 *
 * Der Zustand ist eine reine Funktion aus Zustand und letztem Kontakt. Er
 * wird beim Lesen berechnet und nirgends gespeichert: Ein gespeicherter Wert
 * würde nur den Stand vom letzten Schreibvorgang zeigen, und der Lernstand
 * verfällt gerade dann, wenn gar nichts geschrieben wird.
 *
 * Der gespeicherte Zustand bleibt unangetastet – `pruefungsreif` geht durch
 * Stillstand nicht verloren. Er wird nur so lange als `ueberfaellig`
 * angezeigt, bis wieder geübt wird; dann greift der gespeicherte Wert erneut.
 */
export function effektiverZustand(
  record: TopicStateRecord,
  jetzt: Date = new Date(),
): TopicState {
  if (record.state === 'neu' || record.answered === 0) return record.state;
  if (record.state === 'ueberfaellig') return 'ueberfaellig';
  return verfallFaktor(record, jetzt) < VERFALL_SCHWELLE ? 'ueberfaellig' : record.state;
}

/**
 * Reifegrad eines Themas als Zahl 0..1 – für Abdeckung und Prognose.
 *
 * Drei Bestandteile, und jeder hat einen Grund:
 *
 *  1. **Langfristig** (Trefferquote und Sicherheit über alle Versuche).
 *     Das ist die belastbare Basis.
 *  2. **Frisch** (die letzten fünf Versuche). Ohne diesen Anteil bewegte sich
 *     die Reife nach fünfzig Antworten praktisch nicht mehr – ein Thema mit
 *     90 % Trefferquote blieb „reif", egal wie viele Fehler zuletzt kamen.
 *     Genau das war falsch: Wer gerade schlecht ist, muss das sehen.
 *  3. **Verfall** nach Tagen ohne Wiederholung. Wissen, das nicht abgerufen
 *     wird, ist nicht mehr verfügbar – auch wenn es einmal saß.
 *
 * Das Ergebnis ist bewusst nie 100 %. Wer ein Thema wirklich beherrscht,
 * landet bei etwa 0,95 – der Rest ist die ehrliche Unsicherheit einer
 * Selbsteinschätzung.
 */
export function reifegrad(record: TopicStateRecord, jetzt: Date = new Date()): number {
  if (record.answered === 0) return 0;

  const langfristig = 0.6 * record.hitRate + 0.4 * record.confidenceRate;
  const frisch = fensterQuote(record, langfristig);
  const basis = 0.65 * langfristig + 0.35 * frisch;

  // Der Verfall folgt der Halbwertszeit des gespeicherten Zustands. Der
  // abgeleitete Zustand `ueberfaellig` steuert Anzeige und Auswahl, nicht die
  // Rechnung – würde er auch die Halbwertszeit umschalten, spränge die Reife
  // an der Schwelle an einem Tag von rund 0,44 auf 0,02. Ein solcher Sprung
  // sähe wie ein Fehler aus und wäre auch einer.
  return Math.max(0, Math.min(0.98, basis * verfallFaktor(record, jetzt)));
}

/** Anteil richtiger Antworten im frischen Fenster; ohne Fenster die Basis. */
function fensterQuote(record: TopicStateRecord, ersatz: number): number {
  const fenster = record.fenster ?? [];
  if (fenster.length === 0) return ersatz;
  return fenster.filter(Boolean).length / fenster.length;
}

/**
 * Ist das Thema durch Stillstand oder Fehler aus dem festen Zustand gefallen?
 *
 * Wird für die Kennzahl „verfallen" verwendet. Bewusst nicht nur der Zustand
 * `ueberfaellig`: Ein Thema kann formal noch `gefestigt` heißen und trotzdem
 * so weit abgefallen sein, dass es nicht mehr als gesichert gelten darf.
 */
export function istVerfallen(record: TopicStateRecord, jetzt: Date = new Date()): boolean {
  if (effektiverZustand(record, jetzt) === 'ueberfaellig') return true;
  if (!istGefestigt(record)) return false;
  return verfallFaktor(record, jetzt) < VERFALL_SCHWELLE;
}

export type Versuch = LernEreignis & {
  sicherheit: 'sicher' | 'geraten' | 'unsicher' | null;
};

/**
 * Verarbeitet einen Versuch und aktualisiert den Zustand.
 *
 * Kern der Logik: eine richtige, als "sicher" eingeschätzte Antwort erhöht den
 * Erfolgsstrang. Erst ab drei solchen Antworten und über einen Zeitraum von
 * mindestens drei Tagen gilt ein Thema als gefestigt – kurzfristiges Raten
 * genügt ausdrücklich nicht.
 */
export function wendeVersuchAn(
  record: TopicStateRecord,
  versuch: Versuch,
  jetzt = new Date(),
): TopicStateRecord {
  const korrekt = versuch.type === 'richtig';
  const geraten = versuch.sicherheit === 'geraten';
  const unsicher = versuch.sicherheit === 'unsicher';

  const effektiv: LernEreignis['type'] =
    korrekt && (geraten || unsicher) ? 'geraten' : versuch.type;

  let state = naechsterZustand(record.state, effektiv);

  const answered = record.answered + 1;
  const hitRate = korrekt
    ? (record.hitRate * record.answered + 1) / answered
    : (record.hitRate * record.answered) / answered;

  // Anteil der Antworten, die als "sicher" eingeschätzt wurden.
  const sicherGewichtet = korrekt && !geraten && !unsicher ? 1 : 0;
  const confidenceRate =
    (record.confidenceRate * record.answered + sicherGewichtet) / answered;

  // Frisches Fenster fortschreiben. Nur die letzten Versuche zählen – der Rest
  // fällt hinten heraus. Das ist der Teil, der auf einen schlechten Tag reagiert.
  const fenster = [...(record.fenster ?? []), korrekt].slice(-FENSTER_GROESSE);

  // Ein falscher Versuch wirkt sofort auf den Zustand, nicht erst nach
  // mehreren. Deshalb wird der Erfolgsstrang in jedem Fall zurückgesetzt.
  const correctStreak = korrekt && !geraten && !unsicher ? record.correctStreak + 1 : 0;
  // Der Erfolgsstrang beginnt neu, sobald die Serie unterbrochen wird.
  const streakStartedAt =
    korrekt && !geraten && !unsicher
      ? (record.streakStartedAt ?? jetzt.toISOString())
      : null;

  // Beförderung: Erfolgsstrang ausreichend UND über mindestens drei Tage verteilt.
  // Der Abstand wird vom Beginn der Serie gemessen, nicht von der letzten Antwort –
  // sonst würden vier schnelle Klicks dasselbe zählen wie eine Woche Wiederholung.
  if (korrekt && !geraten && !unsicher && correctStreak >= GEFESTIGT_MINDEST_ERREICHT) {
    const abstandTage = tageZwischen(streakStartedAt, jetzt);
    if (abstandTage >= GEFESTIGT_MINDEST_ABSTAND_TAGE) {
      state = record.state === 'pruefungsreif' ? 'pruefungsreif' : 'gefestigt';
    } else if (state !== 'unsicher') {
      // Erste Durchläufe in kurzer Zeit: Streak zählt, Zustand bleibt "gesehen".
      state = record.state === 'pruefungsreif' ? 'gefestigt' : 'gesehen';
    }
  }

  return {
    ...record,
    state,
    answered,
    hitRate,
    confidenceRate,
    correctStreak,
    lastSeen: jetzt.toISOString(),
    streakStartedAt,
    fenster,
  };
}

function tageZwischen(a: string | null, b: Date): number {
  if (!a) return 0;
  return (b.getTime() - new Date(a).getTime()) / 86_400_000;
}

/** Legt den nächsten Wiederholungstermin fest (einfaches Intervallschema). */
export function berechneNaechsteFaelligkeit(
  state: TopicState,
  jetzt = new Date(),
): Date | null {
  const tage = (n: number): Date => new Date(jetzt.getTime() + n * 86_400_000);
  switch (state) {
    case 'neu':
    case 'gesehen':
      return tage(1);
    case 'unsicher':
      return tage(2);
    case 'gefestigt':
      return tage(14);
    case 'pruefungsreif':
      return tage(30);
    case 'ueberfaellig':
      return jetzt;
  }
}
