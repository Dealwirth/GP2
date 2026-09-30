import { beforeEach, describe, expect, it } from 'vitest';
import { gleicheOptionenAb, rechne, RezeptFehler } from '../src/tasks/resolve.ts';
import { erzeugeAufgaben, type AiEinstellungen } from '../src/ai/generator.ts';
import { holeAtom } from '../src/content/curriculum/index.ts';
import { leereDuplikatspeicher } from '../src/validation/pipeline.ts';
import type { Task } from '../src/domain/types.ts';

/** Vorschlag, den die KI zurückgeben könnte – ohne korrekte Antwort. */
function rohVorschlag(overrides: Record<string, unknown> = {}) {
  return {
    format: 'mc',
    stufe: 2,
    examArea: 'funktionsanalyse',
    topicIds: ['ka-verteilung-01'],
    prompt: 'Wie groß darf R_A höchstens sein, wenn U₀ = 50 V und I_Δn = 300 mA beträgt?',
    options: [
      { id: 'a', text: '166,7 Ω', begruendungWennFalsch: '' },
      { id: 'b', text: '500,0 Ω', begruendungWennFalsch: 'Zu groß.' },
      { id: 'c', text: '100,0 Ω', begruendungWennFalsch: 'Zu klein.' },
    ],
    factRefs: [{ factId: 'u0-50' }, { factId: 'idn-feuchteraum' }],
    learningGoal: 'Abschaltbedingung anwenden.',
    berechnung: { art: 'abschaltbedingung', u0FactId: 'u0-50', idnFactId: 'idn-feuchteraum' },
    ...overrides,
  };
}

/** Mockt die Netzanfrage an den Worker. */
function mitAntwort(antwort: unknown, fehler = false) {
  const aufrufe: string[] = [];
  globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
    aufrufe.push(String(init?.body ?? ''));
    if (fehler) return new Response('nope', { status: 500 });
    return new Response(
      JSON.stringify({ model: 'test', choices: [{ message: { content: JSON.stringify(antwort) } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;
  return aufrufe;
}

const EINSTELLUNGEN: AiEinstellungen = {
  proxyUrl: 'https://test.invalid/v1/chat',
  // Eigener Test-Schlüssel: In CI ist der eingebaute Schlüssel nicht gesetzt,
  // und die Schicht weist Anfragen ohne Schlüssel bewusst ab.
  apiKey: 'test-schluessel',
  modell: 'openai/gpt-oss-120b',
  aktiv: true,
  // Ohne Zweitprüfung bleiben die Tests offline und deterministisch.
  zweitpruefung: false,
};

describe('Rezeptauflösung', () => {
  it('rechnet die Abschaltbedingung', () => {
    const r = rechne({ art: 'abschaltbedingung', u0FactId: 'u0-50', idnFactId: 'idn-feuchteraum' });
    expect(r.wert).toBe(166.7);
  });

  it('rechnet einen Faktwert aus', () => {
    const r = rechne({ art: 'faktenwert', factId: 'idn-personenschutz' });
    expect(r.wert).toBe(0.03);
  });

  it('lehnt ein Rezept ohne gültige Fakten ab', () => {
    expect(() => rechne({ art: 'abschaltbedingung', u0FactId: 'gibt-es-nicht', idnFactId: 'u0-50' })).toThrow(
      RezeptFehler,
    );
  });

  it('lehnt ein Rezept ohne Zahlenwert ab', () => {
    // Die Formel-Fakten haben nur einen Formeltext, keinen Zahlenwert.
    expect(() => rechne({ art: 'faktenwert', factId: 'formel-strom-einphasig' })).toThrow(
      /keinen Zahlenwert/,
    );
  });
});

describe('Optionsabgleich', () => {
  it('erkennt die passende Option', () => {
    const a = gleicheOptionenAb(
      [
        { id: 'a', text: '166,7 Ω' },
        { id: 'b', text: '100,0 Ω' },
      ],
      { wert: 166.7 },
    );
    expect(a.korrektOptionId).toBe('a');
  });

  it('erkennt eine doppelte Lösung als mehrdeutig', () => {
    const a = gleicheOptionenAb(
      [
        { id: 'a', text: '166,7 Ω' },
        { id: 'b', text: '166,8 Ω' },
      ],
      { wert: 166.7 },
    );
    expect(a.korrektOptionId).toBeNull();
    expect(a.passende).toHaveLength(2);
  });

  it('erkennt, wenn keine Option passt', () => {
    const a = gleicheOptionenAb(
      [
        { id: 'a', text: '1,0 Ω' },
        { id: 'b', text: '2,0 Ω' },
      ],
      { wert: 166.7 },
    );
    expect(a.korrektOptionId).toBeNull();
    expect(a.passende).toHaveLength(0);
  });

  it('erkennt einen kΩ-Wert auf ein Ergebnis in MΩ', () => {
    // Der Fall, an dem die Erzeugung scheiterte: Die Engine rechnet in MΩ
    // (1 MΩ), die Option nennt denselben Wert in kΩ (1000 kΩ). Beide Zahlen
    // stimmen überein, sobald der Vorsatz aufgelöst wird.
    const a = gleicheOptionenAb(
      [
        { id: 'a', text: '1 kΩ' },
        { id: 'b', text: '1000 kΩ' },
        { id: 'c', text: '0,5 MΩ' },
      ],
      { wert: 1 },
      'MΩ',
    );
    expect(a.korrektOptionId).toBe('b');
  });

  it('erkennt den Wert, wenn die Option nur die Grundeinheit nennt', () => {
    // „1000 kΩ" und „1 MΩ" sind derselbe Wert. Die Option darf in der
    // Grundeinheit stehen, die Engine rechnet in der größeren.
    const a = gleicheOptionenAb(
      [{ id: 'a', text: '1000000 Ω' }],
      { wert: 1 },
      'MΩ',
    );
    expect(a.korrektOptionId).toBe('a');
  });

  it('lehnt eine fremde Einheit trotz passender Zahl ab', () => {
    // „1 V" ist keine gültige Antwort auf ein Ergebnis in MΩ – auch wenn die
    // Zahl stimmt. Das ist der Fehler, den der Einheitenvergleich verhindert.
    const a = gleicheOptionenAb(
      [
        { id: 'a', text: '1 V' },
        { id: 'b', text: '1 A' },
      ],
      { wert: 1 },
      'MΩ',
    );
    expect(a.korrektOptionId).toBeNull();
    expect(a.passende).toHaveLength(0);
  });

  it('erkennt mA auf ein Ergebnis in A', () => {
    const a = gleicheOptionenAb(
      [
        { id: 'a', text: '16 A' },
        { id: 'b', text: '160 mA' },
        { id: 'c', text: '1,6 A' },
      ],
      { wert: 16 },
      'A',
    );
    expect(a.korrektOptionId).toBe('a');
  });

  it('erkennt mΩ auf ein Ergebnis in Ω', () => {
    const a = gleicheOptionenAb(
      [
        { id: 'a', text: '400 mΩ' },
        { id: 'b', text: '0,4 Ω' },
        { id: 'c', text: '4 Ω' },
      ],
      { wert: 0.4 },
      'Ω',
    );
    // Beide Optionen sind derselbe Wert – das ist mehrdeutig und muss auffallen.
    expect(a.korrektOptionId).toBeNull();
    expect(a.passende).toHaveLength(2);
  });
});

describe('Aufgabengenerierung mit KI', () => {
  const atom = holeAtom('ka-verteilung-01')!;

  // Die Duplikatsperre ist ein modulweiter Speicher. Ohne Zurücksetzen würde
  // der zweite Test mit identischen Parametern als Duplikat des ersten gelten
  // und die Aufgabe verschwinden – ein Testfehler, der wie ein Produktfehler
  // aussieht.
  beforeEach(() => leereDuplikatspeicher());

  it('erzeugt eine Aufgabe, deren Antwort die Engine bestimmt', async () => {
    mitAntwort([rohVorschlag()]);
    const ergebnis = await erzeugeAufgaben(EINSTELLUNGEN, atom, 1);
    expect(ergebnis.kiAktiv).toBe(true);
    expect(ergebnis.aufgaben).toHaveLength(1);
    const task = ergebnis.aufgaben[0] as Task;
    expect(task.correctOptionId).toBe('a');
    expect(task.solutionSteps.length).toBeGreaterThan(0);
    expect(task.validation.checks.every((c) => c.passed)).toBe(true);
    expect(task.proposal.origin).toBe('ki');
  });

  it('liest auch das Wurzelformat mit einem aufgaben-Feld', async () => {
    // Die Form, die Groq im Strict-Modus liefert: Wurzelobjekt mit Liste.
    mitAntwort({ aufgaben: [rohVorschlag()] });
    const ergebnis = await erzeugeAufgaben(EINSTELLUNGEN, atom, 1);
    expect(ergebnis.aufgaben).toHaveLength(1);
  });

  it('verwirft einen Vorschlag, dessen Optionen nicht zum Ergebnis passen', async () => {
    mitAntwort([
      rohVorschlag({
        options: [
          { id: 'a', text: '7,0 Ω' },
          { id: 'b', text: '9,0 Ω' },
          { id: 'c', text: '11,0 Ω' },
        ],
      }),
    ]);
    const ergebnis = await erzeugeAufgaben(EINSTELLUNGEN, atom, 1);
    expect(ergebnis.aufgaben).toHaveLength(0);
    expect(ergebnis.verworfen[0]?.grund).toMatch(/Keine Option passt/);
  });

  it('verwirft einen Vorschlag mit mehrdeutigen Optionen', async () => {
    mitAntwort([
      rohVorschlag({
        options: [
          { id: 'a', text: '166,7 Ω' },
          { id: 'b', text: '166,7 Ω' },
          { id: 'c', text: '100,0 Ω' },
        ],
      }),
    ]);
    const ergebnis = await erzeugeAufgaben(EINSTELLUNGEN, atom, 1);
    expect(ergebnis.aufgaben).toHaveLength(0);
    expect(ergebnis.verworfen[0]?.grund).toMatch(/mehrdeutig/);
  });

  it('verwirft einen Vorschlag, der eine freie Zahl erfindet', async () => {
    mitAntwort([
      rohVorschlag({
        prompt: 'Wie groß darf R_A sein, wenn der Grenzwert 137,4 Ω ist?',
      }),
    ]);
    const ergebnis = await erzeugeAufgaben(EINSTELLUNGEN, atom, 1);
    expect(ergebnis.aufgaben).toHaveLength(0);
    expect(ergebnis.verworfen[0]?.grund).toMatch(/Faktenbindung|gebunden/i);
  });

  it('verwirft ein Rezept, das nicht ausführbar ist', async () => {
    mitAntwort([rohVorschlag({ berechnung: { art: 'abschaltbedingung', u0FactId: 'erfunden' } })]);
    const ergebnis = await erzeugeAufgaben(EINSTELLUNGEN, atom, 1);
    expect(ergebnis.aufgaben).toHaveLength(0);
    expect(ergebnis.verworfen).toHaveLength(1);
  });

  it('liefert ohne KI keine Aufgaben und meldet das', async () => {
    const ergebnis = await erzeugeAufgaben({ ...EINSTELLUNGEN, aktiv: false }, atom, 3);
    expect(ergebnis.kiAktiv).toBe(false);
    expect(ergebnis.aufgaben).toHaveLength(0);
  });

  it('überlebt einen Ausfall des Workers', async () => {
    mitAntwort(null, true);
    const ergebnis = await erzeugeAufgaben(EINSTELLUNGEN, atom, 3);
    expect(ergebnis.kiAktiv).toBe(false);
    expect(ergebnis.aufgaben).toHaveLength(0);
  });
});
