/**
 * JSON-Schema für Aufgabenvorschläge der KI.
 *
 * Wird im Strict Mode an das Modell geschickt. Der Vorschlag enthält bewusst
 * KEIN Feld für die richtige Antwort: die KI kann strukturell nicht liefern,
 * welche Antwort richtig ist. Diese Information holt sich später die Rechen-Engine
 * aus der Faktenbasis.
 */
export const VORSCHLAG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'format',
    'stufe',
    'examArea',
    'topicIds',
    'prompt',
    'options',
    'factRefs',
    'learningGoal',
    'berechnung',
  ],
  properties: {
    format: {
      type: 'string',
      enum: ['mc', 'strukturiert', 'offen', 'fall'],
      description: 'mc = Multiple Choice, strukturiert = Teilaussagen, offen = Freitext, fall = Situationsaufgabe',
    },
    stufe: {
      type: 'integer',
      enum: [1, 2, 3, 4],
      description: '1 = Sekunde, 2 = Minute, 3 = kleiner Fall, 4 = Rechnen',
    },
    examArea: {
      type: 'string',
      enum: ['kundenauftrag', 'systementwurf', 'funktionsanalyse', 'wiso'],
    },
    topicIds: {
      type: 'array',
      minItems: 1,
      items: { type: 'string' },
      description: 'IDs der Atome aus dem vorgegebenen Curriculum-Ausschnitt',
    },
    prompt: {
      type: 'string',
      description:
        'Aufgabentext. Zahlen dürfen nur verwendet werden, wenn sie in den ' +
        'genannten factRefs stehen.',
    },
    options: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      description: 'Genau drei Antwortmöglichkeiten wie im Prüfungsbogen.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'text'],
        properties: {
          id: { type: 'string', enum: ['a', 'b', 'c'] },
          text: { type: 'string' },
          /** Begründung, warum diese Option falsch ist. */
          begruendungWennFalsch: { type: 'string' },
        },
      },
    },
    factRefs: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['factId'],
        properties: {
          factId: { type: 'string' },
          value: { type: ['number', 'string'] },
        },
      },
      description: 'Nur tatsächlich existierende Fakten-IDs aus der Faktenbasis.',
    },
    learningGoal: { type: 'string', description: 'Was der Prüfling nach der Aufgabe können muss.' },
    hinweis: { type: 'string', description: 'Optionaler Einstieg in die Lösung, ein Satz.' },
    berechnung: {
      type: 'object',
      additionalProperties: false,
      required: ['art'],
      description:
        'WIE die richtige Antwort berechnet wird. Du gibst nie die Antwort an, ' +
        'sondern das Rechenrezept. Die Engine führt es aus und ermittelt die ' +
        'richtige Option. Ohne Rezept wird die Aufgabe verworfen.',
      properties: {
        art: {
          type: 'string',
          enum: [
            'abschaltbedingung',
            'strombelastbarkeit',
            'strom-einphasig',
            'strom-drehstrom',
            'spannungsfall',
            'schleifenwiderstand',
            'faktenwert',
          ],
        },
        u0FactId: { type: 'string' },
        idnFactId: { type: 'string' },
        factId: { type: 'string', description: 'Für art=faktenwert: welcher Fakt ist gemeint.' },
        querschnittMm2: { type: 'number' },
        weg: { type: 'string', enum: ['referenz-iz', 'schultabelle'] },
        leistungW: { type: 'number' },
        cosPhi: { type: 'number' },
        laengeM: { type: 'number' },
        stromA: { type: 'number' },
        inA: { type: 'number' },
        kennlinie: { type: 'string', enum: ['B', 'C', 'D'] },
      },
    },
  },
} as const;

/** Rezept-Typen, die die Rechen-Engine ausführen kann. */
export type RezeptArt =
  | 'abschaltbedingung'
  | 'strombelastbarkeit'
  | 'strom-einphasig'
  | 'strom-drehstrom'
  | 'spannungsfall'
  | 'schleifenwiderstand'
  | 'faktenwert';

export interface Rezept {
  art: RezeptArt;
  u0FactId?: string;
  idnFactId?: string;
  factId?: string;
  querschnittMm2?: number;
  weg?: 'referenz-iz' | 'schultabelle';
  leistungW?: number;
  cosPhi?: number;
  laengeM?: number;
  stromA?: number;
  inA?: number;
  kennlinie?: 'B' | 'C' | 'D';
}

/** Schemata für die Zweitprüfung. */
export const ZWEITPRUEFUNG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdacht', 'begruendung'],
  properties: {
    verdacht: {
      type: 'string',
      enum: ['kein', 'fachlich', 'mehrdeutig', 'formulierung'],
      description: 'fachlich = vermutlich inhaltlich falsch, mehrdeutig = zwei Antworten könnten stimmen',
    },
    begruendung: { type: 'string' },
    korrigiert: {
      type: 'object',
      additionalProperties: false,
      required: ['prompt'],
      properties: {
        prompt: { type: 'string' },
        optionIds: { type: 'array', items: { type: 'string' } },
      },
    },
  },
} as const;
