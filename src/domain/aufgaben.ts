import type { FactRef, Aufgabenstufe, ExamArea } from './types.ts';

/**
 * Rezepte und interaktive Aufgabenformate.
 *
 * Ein Rezept beschreibt, was die Rechen-Engine ausführt. Es steht deshalb
 * hier bei der Domäne, zusammen mit den Antwortformaten der interaktiven
 * Aufgaben.
 */

/** Rezept-Typen, die die Rechen-Engine ausführen kann. */
export type RezeptArt =
  | 'abschaltbedingung'
  | 'strombelastbarkeit'
  | 'strombelastbarkeit-korrigiert'
  | 'absicherung-waehlen'
  | 'strom-einphasig'
  | 'strom-drehstrom'
  | 'spannungsfall'
  | 'spannungsfall-drehstrom'
  | 'querschnitt-spannungsfall'
  | 'schleifenwiderstand'
  | 'faktenwert'
  | 'leistung-einphasig'
  | 'leistung-drehstrom'
  | 'scheinleistung'
  | 'blindleistung'
  | 'leistungsfaktor'
  | 'widerstand-leiter'
  | 'widerstand-temperatur'
  | 'energiearbeit'
  | 'stromkosten'
  | 'amortisation'
  | 'waermepumpe-strombedarf'
  | 'pv-ertrag'
  | 'prozentwert'
  | 'motorstrom'
  | 'rcd-strom';

export interface Rezept {
  art: RezeptArt;
  u0FactId?: string;
  idnFactId?: string;
  factId?: string;
  querschnittMm2?: number;
  weg?: 'referenz-iz' | 'schultabelle';
  verlegeart?: string;
  stromkreise?: number;
  temperaturC?: number;
  leistungW?: number;
  leistungKW?: number;
  cosPhi?: number;
  wirkungsgrad?: number;
  laengeM?: number;
  stromA?: number;
  inA?: number;
  kennlinie?: 'B' | 'C' | 'D';
  widerstand20?: number;
  grenzProzent?: number;
  drehstrom?: boolean;
  stunden?: number;
  kWh?: number;
  centProKwh?: number;
  investitionEuro?: number;
  jahresersparnisEuro?: number;
  heizlastKW?: number;
  vollbenutzungsstunden?: number;
  jaz?: number;
  leistungKWp?: number;
  ertragProKWp?: number;
  wert?: number;
  bezug?: number;
  milliampere?: number;
}

// ---------------------------------------------------------------------------
// Interaktive Antwortformate
// ---------------------------------------------------------------------------

/** Ein Paar für Zuordnungsaufgaben: links der Begriff, rechts die Zuordnung. */
export interface ZuordnungsPaar {
  links: string;
  rechts: string;
}

/** Ein Schritt für Reihenfolge-/Sortieraufgaben. */
export interface ReihenfolgeSchritt {
  text: string;
  /** Die richtige Position, 1-basiert. */
  position: number;
}

/**
 * Die Antwortlogik einer Aufgabe.
 *
 * Bewusst getrennt von den Optionen: Eine Zuordnung, eine Reihenfolge oder eine
 * Zahleneingabe lässt sich nicht als Liste von Ankreuzoptionen darstellen.
 * Jede Aufgabe trägt genau eine dieser Formen.
 */
export type Antwort =
  | { art: 'mc'; optionen: { id: string; text: string }[]; richtig: string }
  | { art: 'multi'; optionen: { id: string; text: string }[]; richtig: string[] }
  | { art: 'wahr-falsch'; aussage: string; richtig: boolean }
  | { art: 'zuordnung'; paare: ZuordnungsPaar[] }
  | { art: 'reihenfolge'; schritte: string[]; richtig: number[] }
  | {
      art: 'zahl';
      /** Der exakte Wert. */
      wert: number;
      einheit: string;
      /** Erlaubte relative Abweichung, Standard 1 %. */
      toleranz?: number;
      /** Formeln, die beim Rechnen eingeblendet werden. */
      formeln?: string[];
    }
  | { art: 'luecke'; text: string; luecken: { loesung: string; alternativen?: string[] }[] };

/**
 * Ein kuratierter Aufgabensatz für ein Thema.
 *
 * Der Kern des neuen Bestands: Fragen, die von Hand geschrieben und fachlich
 * geprüft sind – nicht aus einer Vorlage erzeugt. Jeder Satz trägt seinen
 * Themenbezug, damit der Lernfortschritt weiterhin am Thema hängt.
 */
export interface AufgabenSatz {
  id: string;
  /** Themen-ID aus dem Lernpfad. */
  thema: string;
  /** Prüfungsbereich, abgeleitet aus dem Thema. */
  bereich: ExamArea;
  /** Aufwandsstufe 1 (Sekunde) bis 5 (Entwurf). */
  stufe: Aufgabenstufe;
  /** Ein Satz, der sagt, was die Aufgabe verlangt. */
  prompt: string;
  antwort: Antwort;
  /** Warum die richtige Antwort stimmt – die Erklärung nach dem Antworten. */
  erklaerung: string;
  /** Woran man sich erinnern sollte – die Prüfungsregel in einem Satz. */
  regel?: string;
  /** Einstiegshilfe, wenn man hängt. */
  tipp?: string;
  /** Belege aus der Faktenbasis. */
  factRefs?: FactRef[];
  /** Verfahrens- oder Normverweis, z. B. „VDE 0100-410“. */
  verweis?: string;
}
