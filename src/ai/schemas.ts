/**
 * JSON-Schema für Aufgabenvorschläge der KI.
 *
 * Wird im Strict Mode an das Modell geschickt. Der Vorschlag enthält bewusst
 * KEIN Feld für die richtige Antwort: die KI kann strukturell nicht liefern,
 * welche Antwort richtig ist. Diese Information holt sich später die
 * Rechen-Engine aus der Faktenbasis.
 *
 * FORM, die Groq im Strict Mode verlangt: Auf jeder Objektebene müssen alle
 * Eigenschaften in `required` stehen. optionale Angaben werden als
 * Typ-Vereinigung mit `null` ausgedrückt – `type: ['string', 'null']` statt
 * eines fehlenden `required`. Vereine ohne `null` (etwa `['number', 'string']`)
 * lehnt Groq mit 400 ab; genau das war der Fehler der ersten Fassung.
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
    'hinweis',
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
        required: ['id', 'text', 'begruendungWennFalsch'],
        properties: {
          id: { type: 'string', enum: ['a', 'b', 'c'] },
          text: { type: 'string' },
          /** Begründung, warum diese Option falsch ist – bei der richtigen null. */
          begruendungWennFalsch: { type: ['string', 'null'] },
        },
      },
    },
    factRefs: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['factId', 'value'],
        properties: {
          factId: { type: 'string' },
          /** Verwendeter Wert, wenn die Aufgabe ihn nennt – sonst null. */
          value: { type: ['number', 'string', 'null'] },
        },
      },
      description: 'Nur tatsächlich existierende Fakten-IDs aus der Faktenbasis.',
    },
    learningGoal: {
      type: 'string',
      description: 'Was der Prüfling nach der Aufgabe können muss.',
    },
    hinweis: {
      type: ['string', 'null'],
      description: 'Optionaler Einstieg in die Lösung, ein Satz – sonst null.',
    },
    berechnung: {
      type: 'object',
      additionalProperties: false,
      required: [
        'art',
        'u0FactId',
        'idnFactId',
        'factId',
        'querschnittMm2',
        'weg',
        'leistungW',
        'cosPhi',
        'laengeM',
        'stromA',
        'inA',
        'kennlinie',
      ],
      description:
        'WIE die richtige Antwort berechnet wird. Du gibst nie die Antwort an, ' +
        'sondern das Rechenrezept. Die Engine führt es aus und ermittelt die ' +
        'richtige Option. Ohne Rezept wird die Aufgabe verworfen. Felder, die ' +
        'zum gewählten art nicht gehören, sind null.',
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
        u0FactId: { type: ['string', 'null'] },
        idnFactId: { type: ['string', 'null'] },
        factId: { type: ['string', 'null'] },
        querschnittMm2: { type: ['number', 'null'] },
        weg: { enum: ['referenz-iz', 'schultabelle', null] },
        leistungW: { type: ['number', 'null'] },
        cosPhi: { type: ['number', 'null'] },
        laengeM: { type: ['number', 'null'] },
        stromA: { type: ['number', 'null'] },
        inA: { type: ['number', 'null'] },
        kennlinie: { enum: ['B', 'C', 'D', null] },
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

/** Schemata für die Zweitprüfung – dieselben Formregeln wie oben. */
export const ZWEITPRUEFUNG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdacht', 'begruendung', 'korrigiert'],
  properties: {
    verdacht: {
      type: 'string',
      enum: ['kein', 'fachlich', 'mehrdeutig', 'formulierung'],
      description: 'fachlich = vermutlich inhaltlich falsch, mehrdeutig = zwei Antworten könnten stimmen',
    },
    begruendung: { type: 'string' },
    korrigiert: {
      type: ['object', 'null'],
      description: 'Nur bei Beanstandung: korrigierter Aufgabentext – sonst null.',
      additionalProperties: false,
      required: ['prompt', 'optionIds'],
      properties: {
        prompt: { type: 'string' },
        optionIds: { type: 'array', items: { type: 'string' } },
      },
    },
  },
} as const;
