/**
 * Domänen-Typen.
 *
 * Kernidee: `TaskProposal` hat bewusst KEIN Feld für einen Lösungswert.
 * Ein gültiges `Task` entsteht ausschließlich über `engine.solve()` +
 * Validierung. Diese Trennung wird vom Typensystem erzwungen
 * (siehe `validation/pipeline.ts`).
 */

// ---------------------------------------------------------------------------
// Prüfungsstruktur
// ---------------------------------------------------------------------------

/** Prüfungsbereiche der Gesellenprüfung Teil 2 (ElekAusbV 2021, § 10). */
export type ExamArea =
  | 'kundenauftrag'
  | 'systementwurf'
  | 'funktionsanalyse'
  | 'wiso'
  | 'teil1';

export interface ExamAreaInfo {
  id: ExamArea;
  label: string;
  /** Prüfungszeit in Minuten. Für 2a: 16 h Gesamtdauer, davon 20 min Fachgespräch. */
  minutes: number;
  /** Gewichtung in Prozent (§ 15 ElekAusbV). */
  weightPercent: number;
  /** Rechtsgrundlage in der Verordnung. */
  paragraph: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Aufgaben
// ---------------------------------------------------------------------------

/** Aufwandsstufe. Steuert, was der Sitzungs-Baukasten in ein Zeitbudget legt. */
export type Aufgabenstufe = 1 | 2 | 3 | 4 | 5;

export const STUFEN_BESCHRIBUNG: Record<Aufgabenstufe, string> = {
  1: 'Sekunde – Multiple Choice, richtig/falsch, Fehler im Bild',
  2: 'Minute – Begriff, Maß, Zuordnung, Vorschrift',
  3: 'Kleiner Fall – Situationsbeschreibung mit Folgefragen',
  4: 'Rechnen – mit eingeblendeter Formel und mitgelieferten Tabellenwerten',
  5: 'Tiefe – Entwurf, Simulationsaufgabe',
};

/** Antwortformat. Deckt die Formate der echten Prüfung und die Übungsformen ab. */
export type TaskFormat =
  | 'mc'
  | 'multi'
  | 'wahr-falsch'
  | 'zuordnung'
  | 'reihenfolge'
  | 'zahl'
  | 'luecke'
  | 'strukturiert'
  | 'offen'
  | 'fall'
  | 'simulation';

export interface TaskOption {
  id: string;
  text: string;
  /** Begründung, warum diese Option falsch ist. */
  begruendungWennFalsch?: string;
}

// ---------------------------------------------------------------------------
// Interaktive Antwortformate
// ---------------------------------------------------------------------------

/** Die Formate, in denen der Lernende antwortet – nicht nur Ankreuzen. */
export type InteraktivesFormat =
  | 'multi'
  | 'wahr-falsch'
  | 'zuordnung'
  | 'reihenfolge'
  | 'zahl'
  | 'luecke';

/** Ein Paar für Zuordnungsaufgaben. */
export interface ZuordnungsPaar {
  links: string;
  rechts: string;
}

/** Eine Lücke im Aufgabentext mit ihrer Lösung. */
export interface Luecke {
  loesung: string;
  /** Schreibvarianten, die ebenfalls als richtig gelten. */
  alternativen?: string[];
}

/**
 * Die Lösung einer interaktiven Aufgabe.
 *
 * Sie steht bewusst NICHT im Vorschlag: Der Vorschlag trägt nur die Frage.
 * Die Lösung wird – wie bei Multiple Choice die richtige Kennung – getrennt
 * übergeben und erst beim Bau der Aufgabe angehängt. Damit bleibt erzwungen,
 * dass eine Aufgabe ihre Lösung nicht selbst behaupten kann.
 */
export interface InteraktiveLoesung {
  format: InteraktivesFormat;
  /** Bei `multi`: die Kennungen aller richtigen Optionen. */
  richtigIds?: string[];
  /** Bei `wahr-falsch`: ob die Aussage stimmt. */
  richtigWahr?: boolean;
  /** Bei `zuordnung`: die Paare in beliebiger Reihenfolge. */
  paare?: ZuordnungsPaar[];
  /** Bei `reihenfolge`: die Schritte in der richtigen Reihenfolge. */
  schritte?: string[];
  /** Bei `zahl`: der exakte Wert. */
  wert?: number;
  einheit?: string;
  /** Erlaubte relative Abweichung, Standard 1 %. */
  toleranz?: number;
  /** Formeln, die beim Rechnen eingeblendet werden. */
  formeln?: string[];
  /** Bei `luecke`: die Lösungen in der Reihenfolge der Lücken im Text. */
  luecken?: Luecke[];
}

/**
 * Die interaktive Aufgabe, wie sie im Task steht.
 *
 * Fasst Anzeige- und Lösungsdaten zusammen. Die Anzeige kommt aus dem
 * Vorschlag (Optionen), die Lösung aus `InteraktiveLoesung`.
 */
export interface InteraktiveAufgabe extends InteraktiveLoesung {
  /** Optionen bei `multi` – aus dem Vorschlag übernommen. */
  optionen?: TaskOption[];
}

export interface FactRef {
  factId: string;
  /** Konkreter Wert aus der Faktenbasis, den die Aufgabe zitiert. */
  value?: number | string;
  note?: string;
}

/**
 * Der Aufgabenvorschlag – die Vorstufe einer Aufgabe.
 *
 * Absichtlich ohne `answerKey`, `correctOptionId` oder `solution`.
 * Wer eine korrekte Antwort erzeugen will, muss durch die Rechen-Engine.
 */
export interface TaskProposal {
  proposalId: string;
  format: TaskFormat;
  stufe: Aufgabenstufe;
  estimatedSeconds: number;
  examArea: ExamArea;
  topicIds: string[];
  prompt: string;
  options?: TaskOption[];
  /**
   * Frage- und Lösungsdaten der interaktiven Formate.
   *
   * Trägt die Anzeige (Paare, Schritte, Lücken) UND die Lösung. Beides steht
   * hier zusammen, weil sich eine Zuordnung oder Reihenfolge nicht in
   * Ankreuzoptionen zerlegen lässt. Für `mc` bleibt `options` maßgeblich.
   */
  interaktiv?: InteraktiveLoesung;
  factRefs: FactRef[];
  learningGoal: string;
  /** Einstiegshilfe, z. B. "Identifiziere zuerst den Stromkreis." */
  hint?: string;
  /** Bei format 'offen'/'strukturiert': Stichworte, die als vollständig gelten. */
  expectedKeywords?: string[];
  /**
   * Wie die richtige Antwort berechnet wird.
   *
   * Wichtig: Der Vorschlag sagt NICHT, welche Option richtig ist. Er beschreibt
   * nur das Rezept, das die Engine ausführt. Damit ist die Lösung an die
   * Rechnung gebunden und nicht an den Vorschlag.
   */
  berechnung?: unknown;
  origin: 'ki' | 'statisch';
}

/** Ein Rechenschritt der Lösung – immer mit Formel und Normbezug. */
export interface SolutionStep {
  label: string;
  formula?: string;
  substitution?: string;
  result: string;
  factId?: string;
  ruleId?: string;
}

export type ValidationCheckId =
  | 'schema'
  | 'faktenbindung'
  | 'keine-freien-zahlen'
  | 'berechnung-ok'
  | 'duplikat'
  | 'zweitpruefung'
  | 'gueltiger-zeitraum';

export interface ValidationCheck {
  id: ValidationCheckId;
  passed: boolean;
  detail: string;
}

export interface ValidationRecord {
  checks: ValidationCheck[];
  passedAt: string;
  validatorVersion: string;
}

/**
 * Eine geprüfte, prüfbare Aufgabe.
 * Entsteht nur über die Validierungspipeline, nie direkt aus einem Rohvorschlag.
 */
export interface Task {
  taskId: string;
  proposal: TaskProposal;
  /**
   * Herkunftshinweis aus dem kuratierten Bestand, z. B. die Berufsbildposition.
   *
   * Steht bewusst NEBEN dem Aufgabentext und nicht darin: Eine Quellenangabe
   * ist keine Prüfungsangabe. Stünde sie im Aufgabentext, müsste die
   * Faktenbindung ihre Zahlen als Sachwerte akzeptieren – und genau dadurch
   * verlöre sie ihre Schutzwirkung.
   */
  verweis?: string;
  /** Herkunft der einzelnen Ausgangsdaten, aus der Aufgabenstellung gelöst. */
  herkunft?: { bezeichnung: string; quelle: string }[];
  /** Bei 'mc': die richtige Option. */
  correctOptionId?: string;
  /**
   * Bei interaktiven Formaten: Frage und Lösung.
   *
   * Für 'mc' bleibt `correctOptionId` maßgeblich; für 'multi',
   * 'wahr-falsch', 'zuordnung', 'reihenfolge', 'zahl' und 'luecke' steht die
   * Lösung hier.
   */
  interaktiv?: InteraktiveAufgabe;
  /** Warum die anderen Optionen falsch sind – für das Feedback nach der Antwort. */
  optionRationale?: Record<string, string>;
  /** Bei 'offen'/'strukturiert': Musterlösung. */
  solutionText?: string;
  solutionSteps: SolutionStep[];
  /** Ein-Satz-Erklärung für die 5-Minuten-Session. */
  explanation: string;
  factVersion: string;
  ruleVersion: string;
  engineVersion: string;
  validation: ValidationRecord;
  approved: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Lernzustand
// ---------------------------------------------------------------------------

/**
 * Zustandsautomat pro Thema.
 * `ueberfaellig` entsteht, wenn `nextDue` überschritten oder wiederholt falsch
 * beantwortet wurde – Beherschung verfällt also.
 */
export type TopicState =
  | 'neu'
  | 'gesehen'
  | 'unsicher'
  | 'gefestigt'
  | 'pruefungsreif'
  | 'ueberfaellig';

export type LernEreignis =
  | { type: 'richtig' }
  | { type: 'falsch' }
  | { type: 'geraten' }
  | { type: 'ueberfaellig' };

export interface TopicStateRecord {
  topicId: string;
  state: TopicState;
  /** Wie oft in Folge richtig beantwortet. */
  correctStreak: number;
  /** 0..1 – wie oft richtig, unabhängig vom Raten. */
  hitRate: number;
  /** 0..1 – Anteil der als "sicher" eingeschätzten richtigen Antworten. */
  confidenceRate: number;
  answered: number;
  lastSeen: string | null;
  /** Beginn des aktuellen Erfolgsstrangs – Grundlage für die 3-Tage-Regel. */
  streakStartedAt: string | null;
  nextDue: string | null;
  /**
   * Die letzten fünf Versuche als Wahrheitswerte (neueste zuletzt).
   *
   * Nur damit reagiert die Reife auf einen schlechten Tag. Trefferquote und
   * Sicherheit sind Mittelwerte über alle Versuche – nach fünfzig Antworten
   * bewegt sich daran praktisch nichts mehr, und genau das war unehrlich.
   * Ältere Datensätze kennen das Feld nicht; es wird dann als leer gelesen.
   */
  fenster?: boolean[];
}

// ---------------------------------------------------------------------------
// Versuche und Sitzungen
// ---------------------------------------------------------------------------

export type Fehlerklasse = 'wissen' | 'rechnen' | 'lesen' | 'strategie' | 'keine';

export interface Attempt {
  attemptId: string;
  taskId: string;
  sessionId: string | null;
  topicIds: string[];
  examArea: ExamArea;
  correct: boolean;
  partialCredit: number;
  timeSpentMs: number;
  /** Vom Nutzer markierte Selbsteinschätzung. */
  sicherheit: 'sicher' | 'geraten' | 'unsicher' | null;
  fehlerklasse: Fehlerklasse;
  factVersion: string;
  ruleVersion: string;
  engineVersion: string;
  createdAt: string;
}

export type SessionMode = 'pause' | 'normal' | 'pruefung';

export interface Session {
  sessionId: string;
  mode: SessionMode;
  budgetSeconds: number;
  startedAt: string;
  endedAt: string | null;
  taskIds: string[];
}

// ---------------------------------------------------------------------------
// Fakten
// ---------------------------------------------------------------------------

export type Pruefungsrelevanz =
  | 'ElekAusbV'
  | 'IHK-PAL'
  | 'ZVEH'
  | 'Norm'
  | 'Rechtsvorschrift'
  | 'Berufsschule';

export interface Quelle {
  id: string;
  titel: string;
  herausgeber: string;
  kennung: string;
  ausgabe: string | null;
  url: string | null;
  abgerufen: string;
}

/**
 * `verification: 'offen'` bedeutet: Der Wert ist eingetragen, aber die Quelle
 * wurde noch nicht am Original geprüft. Offene Fakten werden im UI und im
 * Prüfbericht ausgewiesen und nicht als gesichert dargestellt.
 */
export interface Fact {
  id: string;
  version: string;
  kategorie: string;
  bezeichnung: string;
  /** Formel als Text, wenn es sich um eine Formel handelt. */
  formel?: string;
  wert?: number;
  einheit?: string;
  quelleId: string;
  gueltigAb: string;
  gueltigBis: string | null;
  ersetztDurch: string | null;
  pruefungsrelevanz: Pruefungsrelevanz[];
  region: string | null;
  jahrgang: string | null;
  bemerkung: string | null;
  verification: 'geprueft' | 'offen';
  tags: string[];
}
