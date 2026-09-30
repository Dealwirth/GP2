/**
 * Termine und Fristen.
 *
 * ---------------------------------------------------------------------------
 * Wer prüft dich überhaupt?
 * ---------------------------------------------------------------------------
 *
 * Das ist die wichtigste Unterscheidung in dieser Datei, und sie wurde hier
 * lange falsch dargestellt:
 *
 *   **Elektroniker/-in für Energie- und Gebäudetechnik ist ein Handwerksberuf.**
 *   Deine Prüfung ist deshalb eine **Gesellenprüfung nach der Handwerksordnung
 *   (HwO)** – keine „Abschlussprüfung" nach dem Berufsbildungsgesetz (BBiG).
 *   Das ist kein Wortklauberei: Es sind zwei verschiedene Rechtskreise mit
 *   zwei verschiedenen zuständigen Stellen.
 *
 *   Vorbereitet wird die Prüfung von der **Elektro-Innung bzw. dem
 *   Fachverband Elektro- und Informationstechnik**; die **Handwerkskammer für
 *   Unterfranken** ist die zuständige Kammer, die Prüfungsausschüsse arbeiten
 *   dort, und Schweinfurt liegt in ihrem Bezirk. Die **IHK
 *   Würzburg-Schweinfurt ist für dich nicht zuständig.**
 *
 *   Warum die IHK-Termine hier trotzdem stehen: Sie sind der einzige
 *   öffentlich und belastbar veröffentlichte Terminplan der Region. Die
 *   Elektro-Berufe des Handwerks prüfen in Bayern in derselben Jahreszeit, oft
 *   sogar am selben Tag. Deshalb dienen die IHK-Daten als **Orientierung** –
 *   verbindlich wird dein Termin erst mit dem Einladungsschreiben deiner
 *   prüfenden Stelle. Genau so sind sie unten gekennzeichnet
 *   (`sicherheit: 'orientierung'`).
 *
 * ---------------------------------------------------------------------------
 * Belastbarkeit
 * ---------------------------------------------------------------------------
 *
 *  - `amtlich`      – aus einer Veröffentlichung der zuständigen Stelle.
 *  - `orientierung` – veröffentlicht, aber von einer anderen Kammer; für die
 *                     eigene Prüfung nicht verbindlich.
 *  - `annahme`      – Arbeitsannahme des Trainers. Muss vor der Planung gegen
 *                     das Einladungsschreiben geprüft werden.
 *
 * Nichts hier ist in Stein gemeißelt: Alle Datumsangaben stehen nur in dieser
 * Datei, und du kannst sie zusätzlich in den Einstellungen überschreiben, ohne
 * den Code anzufassen.
 */

/** Wer den Termin setzt. */
export type Traeger = 'innung' | 'hwk' | 'ihk';

/** Wie belastbar ein Datum ist. */
export type Sicherheit = 'amtlich' | 'orientierung' | 'annahme';

export interface Termin {
  id: string;
  datum: string;
  titel: string;
  art: 'anmeldung' | 'schriftlich' | 'praktisch' | 'frist' | 'meilenstein';
  beschreibung: string;
  /** Wer diesen Termin festlegt. */
  traeger: Traeger;
  /** Wie belastbar das Datum ist – siehe Kopf dieser Datei. */
  sicherheit: Sicherheit;
  /** Nur `amtlich` gilt als feststehend. Bleibt für ältere Aufrufer erhalten. */
  verbindlich: boolean;
  quelle: string;
}

/**
 * Die zuständige Stelle für Schweinfurt.
 *
 * Diese Angaben sind für die Prüfungsplanung wichtiger als jedes Datum: Wer
 * die Anmeldung verschickt, entscheidet auch über Termin, Ort und
 * Nachteilsausgleich.
 */
export const ZUSTAENDIGE_STELLE = {
  /** Rechtskreis – hier der entscheidende Unterschied zur IHK. */
  rechtsgrundlage: 'Handwerksordnung (HwO) – Gesellenprüfung, nicht BBiG-Abschlussprüfung',
  /** Wer die Prüfung durchführt und einlädt. */
  pruefendeStelle: 'Elektro-Innung bzw. Fachverband Elektro- und Informationstechnik im Bezirk Unterfranken',
  /** Kammer und Aufsicht – liefert Formulare und beruft die Prüfungsausschüsse. */
  kammer: 'Handwerkskammer für Unterfranken, Rennweger Ring 3, 97070 Würzburg',
  kontakt: 'Telefon 0931 30908-0 · prüfungswesen: 0931 30908-1186',
  /** Der Bezirk, der für Schweinfurt gilt. */
  bezirk: 'Unterfranken (Schweinfurt)',
  /**
   * Was das für die Termine bedeutet – als Satz, der in der Oberfläche
   * angezeigt werden kann, ohne dass dort etwas formuliert werden muss.
   */
  hinweis:
    'Elektroniker/-in für Energie- und Gebäudetechnik ist ein Handwerksberuf: ' +
    'Zuständig sind Elektro-Innung und Handwerkskammer für Unterfranken, nicht ' +
    'die IHK. Verbindlich wird dein Termin erst mit dem Einladungsschreiben.',
} as const;

const IHK_QUELLE = 'IHK Würzburg-Schweinfurt, Prüfungstermine gewerbliche und technische Berufe, Stand 08.09.2026';
const HWK_QUELLE = 'Handwerkskammer für Unterfranken, Prüfungen in der Ausbildung';

/**
 * Sommerprüfung 2027, Fachrichtung Energie- und Gebäudetechnik.
 *
 * Diese Liste ist der einzige Ort im Projekt, an dem Prüfungstermine stehen.
 *
 * Aufbau: Die beiden Termine, die sich planen lassen (schriftlich und Beginn
 * der praktischen Prüfung), kommen zuerst. Alles andere dient nur der
 * Erinnerung.
 */
export const TERMINE_2027_SOMMER: Termin[] = [
  {
    id: 'anmeldung-beginn',
    datum: '2027-01-15',
    titel: 'Anmeldung einplanen',
    art: 'anmeldung',
    traeger: 'hwk',
    sicherheit: 'annahme',
    verbindlich: false,
    beschreibung:
      'Die Anmeldeformulare kommen von der prüfenden Stelle. Rechne damit, dass ' +
      'du den Nachweis der fachlichen Unterweisung beilegen musst – sammle die ' +
      'Stunden also laufend, nicht im letzten Monat.',
    quelle: `${HWK_QUELLE} – Datum ist eine Arbeitsannahme des Trainers`,
  },
  {
    id: 'anmeldung-frist',
    datum: '2027-02-15',
    titel: 'Anmeldung spätestens abgeben',
    art: 'frist',
    traeger: 'hwk',
    sicherheit: 'annahme',
    verbindlich: false,
    beschreibung:
      'Sicherheitsreserve: Die tatsächliche Frist deiner Elektro-Innung kann ' +
      'früher liegen und steht auf dem Anmeldeformular. Gib die Anmeldung ab, ' +
      'sobald du sie hast – nicht am letzten Tag.',
    quelle: `${HWK_QUELLE} – Datum ist eine Arbeitsannahme des Trainers`,
  },
  {
    id: 'unterweisung',
    datum: '2027-03-01',
    titel: 'Unterweisungsnachweis vollständig',
    art: 'meilenstein',
    traeger: 'hwk',
    sicherheit: 'orientierung',
    verbindlich: false,
    beschreibung:
      'Der Nachweis der fachlichen Unterweisung muss spätestens zur Anmeldung ' +
      'vorliegen (§ 8 Abs. 3 ElekAusbV). Plane die Unterweisungsstunden früh – ' +
      'sie finden in der Regel im Betrieb statt.',
    quelle: '§ 8 Abs. 3 ElekAusbV',
  },
  {
    id: 'einladung',
    datum: '2027-04-13',
    titel: 'Einladung erwartet',
    art: 'meilenstein',
    traeger: 'innung',
    sicherheit: 'annahme',
    verbindlich: false,
    beschreibung:
      'Etwa vier Wochen vor der schriftlichen Prüfung kommen Einladung und ' +
      'Materialliste. Ab diesem Tag gelten die dort genannten Termine und Orte – ' +
      'trage sie hier in den Einstellungen ein.',
    quelle: 'Erfahrungswert der Kammern – Arbeitsannahme des Trainers',
  },
  {
    id: 'schriftlich',
    datum: '2027-05-11',
    titel: 'Schriftliche Prüfung',
    art: 'schriftlich',
    traeger: 'innung',
    sicherheit: 'orientierung',
    verbindlich: false,
    beschreibung:
      'Prüfungsbereiche 2 bis 4: Systementwurf, Funktions- und Systemanalyse, ' +
      'Wirtschafts- und Sozialkunde. Das Datum ist der amtlich veröffentlichte ' +
      'Termin der IHK für die industriellen Elektro-Berufe; deine Innung legt ' +
      'ihren eigenen Termin fest, üblicherweise im selben Zeitfenster.',
    quelle: IHK_QUELLE,
  },
  {
    id: 'praktisch-beginn',
    datum: '2027-06-07',
    titel: 'Praktische Prüfung beginnt',
    art: 'praktisch',
    traeger: 'innung',
    sicherheit: 'orientierung',
    verbindlich: false,
    beschreibung:
      'Kundenauftrag über zwei Tage mit situativem Fachgespräch. Wie beim ' +
      'schriftlichen Teil stammt das Datum vom IHK-Terminplan und ist für die ' +
      'Handwerksprüfung nur eine Orientierung.',
    quelle: IHK_QUELLE,
  },
  {
    id: 'pruefung-ende',
    datum: '2027-06-08',
    titel: 'Praktische Prüfung voraussichtlich beendet',
    art: 'praktisch',
    traeger: 'innung',
    sicherheit: 'annahme',
    verbindlich: false,
    beschreibung:
      'Zweiter Prüfungstag des Kundenauftrags, sofern du am ersten Tag ' +
      'eingeplant bist.',
    quelle: 'Ableitung aus dem Beginn der praktischen Prüfung',
  },
];

export const HEUTE_STAND = '2026-09-28';

export const SICHERHEIT_TEXT: Record<Sicherheit, string> = {
  amtlich: 'amtlich',
  orientierung: 'Orientierung',
  annahme: 'Annahme',
};

export const TRAEGER_TEXT: Record<Traeger, string> = {
  innung: 'Innung / Fachverband',
  hwk: 'Handwerkskammer',
  ihk: 'IHK',
};

export function sortiereTermine(termine: Termin[] = TERMINE_2027_SOMMER): Termin[] {
  return [...termine].sort((a, b) => a.datum.localeCompare(b.datum));
}

/** Lokales Datum als ISO-Datum – `toISOString()` würde in Mitteleuropa einen Tag zurückspringen. */
function isoDatum(datum: Date): string {
  return [
    datum.getFullYear(),
    String(datum.getMonth() + 1).padStart(2, '0'),
    String(datum.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Tage bis zu einem Termin. Negativ bedeutet: der Termin liegt zurück. */
export function tageBis(datum: string, heute = new Date()): number {
  const ziel = new Date(`${datum}T00:00:00`);
  const heuteMitternacht = new Date(heute);
  heuteMitternacht.setHours(0, 0, 0, 0);
  return Math.round((ziel.getTime() - heuteMitternacht.getTime()) / 86_400_000);
}

export type Dringlichkeit = 'vorbei' | 'dringend' | 'bald' | 'geplant';

export function dringlichkeit(datum: string, heute = new Date()): Dringlichkeit {
  const tage = tageBis(datum, heute);
  if (tage < 0) return 'vorbei';
  if (tage <= 30) return 'dringend';
  if (tage <= 90) return 'bald';
  return 'geplant';
}

export const DRINGLICHKEIT_TEXT: Record<Dringlichkeit, string> = {
  vorbei: 'vorbei',
  dringend: 'jetzt wichtig',
  bald: 'kommt näher',
  geplant: 'geplant',
};

/** Der nächste Termin, der noch nicht vorbei ist. */
export function naechsterTermin(
  heute = new Date(),
  termine: Termin[] = TERMINE_2027_SOMMER,
): Termin | undefined {
  return sortiereTermine(termine).find((t) => tageBis(t.datum, heute) >= 0);
}

/** Alle Fristen, die in den nächsten 60 Tagen fällig werden. */
export function anstehendeFristen(
  heute = new Date(),
  termine: Termin[] = TERMINE_2027_SOMMER,
): Termin[] {
  return sortiereTermine(termine).filter((t) => {
    const tage = tageBis(t.datum, heute);
    return tage >= 0 && tage <= 60;
  });
}

/**
 * Ist das ein Datum, das es wirklich gibt?
 *
 * Eine Prüfung auf `2027-13-45` würde die Ziffernform allein nicht abweisen –
 * und ein ungültiges Datum in der Terminliste hätte einen Countdown zur Folge,
 * der rückwärts läuft. Deshalb wird gegengerechnet: `Date` rollt ungültige
 * Tage stillschweigend weiter, der Rückweg fällt dann anders aus.
 */
function istIsoDatum(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const geparst = new Date(`${text}T00:00:00`);
  return !Number.isNaN(geparst.getTime()) && isoDatum(geparst) === text;
}

/**
 * Korrigiert die Termine mit den vom Nutzer eingetragenen Daten.
 *
 * Der Einladungsbrief ist die einzige verbindliche Quelle. Sobald dort ein
 * Datum steht, ersetzt es die Orientierungswerte – und zwar sichtbar: Der
 * Termin gilt dann als `amtlich`, alles andere bliebe eine Annahme.
 */
export function termineMitVorgaben(
  vorgaben: { schriftlich?: string; praktisch?: string },
  termine: Termin[] = TERMINE_2027_SOMMER,
): Termin[] {
  return termine.map((t) => {
    const vorgabe =
      t.id === 'schriftlich'
        ? vorgaben.schriftlich
        : t.id === 'praktisch-beginn'
          ? vorgaben.praktisch
          : undefined;
    if (!vorgabe || !istIsoDatum(vorgabe) || vorgabe === t.datum) return t;
    return {
      ...t,
      datum: vorgabe,
      sicherheit: 'amtlich' as Sicherheit,
      verbindlich: true,
      quelle: 'Eigene Angabe – Datum aus dem Einladungsschreiben',
      beschreibung: `${t.beschreibung} Datum stammt aus deinem Einladungsschreiben.`,
    };
  });
}

// ---------------------------------------------------------------------------
// Phasenplan
// ---------------------------------------------------------------------------

export interface Lernphase {
  id: string;
  von: string;
  bis: string;
  titel: string;
  schwerpunkt: string;
  /** Wöchentliches Ziel in Minuten. */
  zielMinutenProWoche: number;
  /** Was am Ende dieser Phase beherrscht sein muss. */
  abschlussKriterium: string;
  /** Bezug zum Prüfungsteil. */
  bereich: string;
}

/**
 * Phasenplan bis zur Prüfung.
 *
 * Die Prozentanteile sind kein Dogma, sondern eine Faustregel für einen
 * Lernstand, der in acht Monaten von null auf prüfungsreif wächst. Der Plan
 * verschiebt sich automatisch, wenn du ihn später startest – die Datumsfelder
 * lassen sich überschreiben.
 */
export function bauePhasenplan(start = new Date(), pruefung = '2027-06-07'): Lernphase[] {
  const startMs = start.getTime();
  const zielMs = new Date(`${pruefung}T00:00:00`).getTime();
  const spanne = Math.max(zielMs - startMs, 28 * 86_400_000);

  const anteile = [0.18, 0.24, 0.24, 0.2, 0.14];
  const phasen: Omit<Lernphase, 'von' | 'bis'>[] = [
    {
      id: 'grundlagen',
      titel: 'Grundlagen aufbauen',
      schwerpunkt:
        'Breite zuerst: alle Kapitel einmal sehen, Normwerte und Formeln ' +
        'sortieren, Rechnen üben. Noch keine Prüfungssimulation.',
      zielMinutenProWoche: 150,
      abschlussKriterium:
        'Jedes Kapitel des Lernpfads ist mindestens einmal bearbeitet, die ' +
        'Rechenaufgaben der Stufe 4 sitzen ohne Hilfsmittel.',
      bereich: 'Alle Bereiche',
    },
    {
      id: 'vertiefen',
      titel: 'Schwächen vertiefen',
      schwerpunkt:
        'Fehlerkorb abarbeiten, verfallene Themen zurückholen, ' +
        'Fehlerursachen analysieren statt nur die Lösung ansehen.',
      zielMinutenProWoche: 180,
      abschlussKriterium:
        'Die zehn schwächsten Themen sind dreimal in Folge richtig und ' +
        'eigenständig beantwortet.',
      bereich: 'Schwächen aus dem Lernstand',
    },
    {
      id: 'teil2-schriftlich',
      titel: 'Schriftliche Teil-2-Prüfungen trainieren',
      schwerpunkt:
        'Systementwurf und Funktions- und Systemanalyse im Zeittakt ' +
        'unter Originalbedingungen üben.',
      zielMinutenProWoche: 200,
      abschlussKriterium:
        'Zwei vollständige Simulationen je Bereich, jeweils im Zeitrahmen ' +
        'und mit mindestens 50 % der Punkte.',
      bereich: 'Systementwurf, Funktionsanalyse, Wiso',
    },
    {
      id: 'praxis',
      titel: 'Kundenauftrag üben',
      schwerpunkt:
        'Planung gegen die Engine, Arbeit nach den fünf Sicherheitsregeln, ' +
        'Prüf- und Messergebnisse und das Fachgespräch. Hier zählt ' +
        'Verlässlichkeit, nicht Schnelligkeit.',
      zielMinutenProWoche: 180,
      abschlussKriterium:
        'Einen vollständigen Kundenauftrag ohne Fehler durchlaufen und die ' +
        'Fachfragen sicher beantworten.',
      bereich: 'Kundenauftrag',
    },
    {
      id: 'generalprobe',
      titel: 'Generalprobe und Feinschliff',
      schwerpunkt:
        'Vollständige Prüfungssimulationen, danach nur noch Wiederholung ' +
        'und Ruhe. Keine neuen Themen mehr.',
      zielMinutenProWoche: 120,
      abschlussKriterium:
        'Die letzte Simulation liegt in allen Bereichen im Bestehensbereich, ' +
        'und es gibt keine ungeklärte Fehlermeldung mehr.',
      bereich: 'Gesamt',
    },
  ];

  let versatz = 0;
  return phasen.map((phase, i) => {
    const von = new Date(startMs + spanne * versatz);
    versatz += anteile[i]!;
    const bis = new Date(startMs + spanne * versatz);
    return {
      ...phase,
      von: isoDatum(von),
      bis: isoDatum(bis),
    };
  });
}

export function aktuellePhase(phasen: Lernphase[], heute = new Date()): Lernphase | undefined {
  const datum = isoDatum(heute);
  return phasen.find((p) => p.von <= datum && datum <= p.bis);
}
