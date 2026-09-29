import { describe, expect, it } from 'vitest';
import type { TopicStateRecord } from '../src/domain/types.ts';
import {
  FENSTER_GROESSE,
  leererZustand,
  reifegrad,
  verfallFaktor,
  istVerfallen,
  wendeVersuchAn,
  HALBWERTSZEIT_TAGE,
  VERFALL_KARENZ_TAGE,
} from '../src/domain/stateMachine.ts';
import { abdeckung } from '../src/content/curriculum/index.ts';

/**
 * Reife muss in beide Richtungen gehen.
 *
 * Eine Kennzahl, die nur steigt, ist keine Messung, sondern eine Belohnung.
 * Diese Tests halten beide Bewegungen fest: nach unten bei schlechter
 * Leistung, nach unten bei Stillstand.
 */

const T0 = new Date('2026-06-01T09:00:00.000Z');
const tage = (n: number): Date => new Date(T0.getTime() + n * 86_400_000);

/** Baut einen Datensatz durch eine Folge von Versuchen auf. */
function ueben(
  folge: ('richtig' | 'falsch')[],
  sicherheit: 'sicher' | 'geraten' = 'sicher',
  start = T0,
): TopicStateRecord {
  let record = leererZustand('test-01');
  folge.forEach((art, i) => {
    record = wendeVersuchAn(
      record,
      { type: art, sicherheit },
      new Date(start.getTime() + i * 86_400_000),
    );
  });
  return record;
}

describe('Reife reagiert auf frische Fehler', () => {
  it('sinkt, wenn zuletzt mehrere Antworten falsch waren', () => {
    // Zwanzig richtige, dann vier falsche: vorher bewegte sich hier nichts,
    // weil Trefferquote und Sicherheit Mittelwerte über alles sind.
    const stark = ueben([...Array(20).fill('richtig')] as 'richtig'[]);
    const danach = ueben(
      [...Array(20).fill('richtig'), 'falsch', 'falsch', 'falsch', 'falsch'] as (
        | 'richtig'
        | 'falsch'
      )[],
    );

    const vorher = reifegrad(stark, tage(20));
    const nachher = reifegrad(danach, tage(24));

    expect(vorher).toBeGreaterThan(0.85);
    expect(nachher).toBeLessThan(vorher - 0.15);
  });

  it('erholt sich, sobald die Fehler aus dem Fenster fallen', () => {
    const gefallen = ueben([
      ...Array(15).fill('richtig'),
      'falsch',
      'falsch',
    ] as ('richtig' | 'falsch')[]);
    // Fünf richtige schieben beide Fehler aus dem Fünf-Versuche-Fenster.
    const erholt = ueben([
      ...Array(15).fill('richtig'),
      'falsch',
      'falsch',
      'richtig',
      'richtig',
      'richtig',
      'richtig',
      'richtig',
    ] as ('richtig' | 'falsch')[]);

    expect(reifegrad(erholt, tage(22))).toBeGreaterThan(reifegrad(gefallen, tage(16)));
  });

  it('führt höchstens fünf Versuche im Fenster', () => {
    const record = ueben(Array(9).fill('richtig') as 'richtig'[]);
    expect(record.fenster).toHaveLength(FENSTER_GROESSE);
    expect(record.fenster?.every(Boolean)).toBe(true);
  });

  it('nimmt einen geratenen Treffer nicht ins Wissen auf', () => {
    const sicher = ueben(Array(6).fill('richtig') as 'richtig'[], 'sicher');
    const geraten = ueben(Array(6).fill('richtig') as 'richtig'[], 'geraten');

    // Sechsmal richtig geraten darf nicht als Beherrschung durchgehen.
    expect(reifegrad(geraten, tage(6))).toBeLessThan(reifegrad(sicher, tage(6)) * 0.8);
  });
});

describe('Reife verfällt bei Stillstand', () => {
  it('lässt in der Karenzzeit nichts verfallen', () => {
    const record = ueben(Array(6).fill('richtig') as 'richtig'[]);
    const unmittelbar = reifegrad(record, tage(5));
    const inKarenz = reifegrad(record, tage(5 + VERFALL_KARENZ_TAGE));

    expect(verfallFaktor(record, tage(5 + VERFALL_KARENZ_TAGE))).toBe(1);
    expect(inKarenz).toBeCloseTo(unmittelbar, 6);
  });

  it('halbiert den Wert genau nach der Halbwertszeit des Zustands', () => {
    const record = ueben(Array(6).fill('richtig') as 'richtig'[]);
    // Der Zustand ist nach sechs sicheren Treffern "gefestigt".
    expect(record.state).toBe('gefestigt');

    // Der Verfallsfaktor selbst wird geprüft, nicht der Reifegrad: der ist
    // oben bei 0,98 gedeckelt, und diese Deckelung würde das Verhältnis
    // verfälschen. Die Deckelung ist Absicht, der Verfall aber exakt.
    const einmalHalbwertszeit = verfallFaktor(
      record,
      tage(5 + VERFALL_KARENZ_TAGE + HALBWERTSZEIT_TAGE.gefestigt),
    );
    const zweimalHalbwertszeit = verfallFaktor(
      record,
      tage(5 + VERFALL_KARENZ_TAGE + 2 * HALBWERTSZEIT_TAGE.gefestigt),
    );

    expect(einmalHalbwertszeit).toBeCloseTo(0.5, 6);
    expect(zweimalHalbwertszeit).toBeCloseTo(0.25, 6);
    // Und der Reifegrad folgt mit.
    expect(
      reifegrad(record, tage(5 + VERFALL_KARENZ_TAGE + HALBWERTSZEIT_TAGE.gefestigt)),
    ).toBeLessThan(reifegrad(record, tage(5)));
  });

  it('verfällt bei gefestigtem Wissen langsamer als bei einmal Gesehenem', () => {
    const gesehen = ueben(['richtig']);
    const gefestigt = ueben(Array(6).fill('richtig') as 'richtig'[]);

    // Einheitlicher Ausgangswert, damit nur der Verfall verglichen wird.
    const basis = (r: TopicStateRecord): number => reifegrad(r, tage(1)) / verfallFaktor(r, tage(1));
    const jetzt = tage(1 + VERFALL_KARENZ_TAGE + 14);

    const relativGesehen = reifegrad(gesehen, jetzt) / basis(gesehen);
    const relativGefestigt = reifegrad(gefestigt, jetzt) / basis(gefestigt);

    expect(relativGefestigt).toBeGreaterThan(relativGesehen);
  });

  it('erkennt Stillstand als verfallen', () => {
    const gefestigt = ueben(Array(6).fill('richtig') as 'richtig'[]);
    expect(istVerfallen(gefestigt, tage(6))).toBe(false);
    // Ein halbes Jahr ohne Wiederholung.
    expect(istVerfallen(gefestigt, tage(200))).toBe(true);
  });

  it('sinkt nie unter null und nie über den Höchstwert', () => {
    const gefestigt = ueben(Array(6).fill('richtig') as 'richtig'[]);
    expect(reifegrad(gefestigt, tage(100_000))).toBeGreaterThanOrEqual(0);
    expect(reifegrad(gefestigt, tage(0.001))).toBeLessThanOrEqual(0.98);
  });
});

describe('Abdeckung zählt verfallenes Wissen nicht als gesichert', () => {
  it('verschiebt ein Thema nach langer Pause von gefestigt zu verfallen', () => {
    const zustaende = new Map<string, TopicStateRecord>();
    // Ein echtes Atom aus dem Lernpfad, damit die Bereichsgewichtung greift.
    const atomId = 'fsa-schutzbewertung-01';
    zustaende.set(atomId, { ...ueben(Array(6).fill('richtig') as 'richtig'[]), topicId: atomId });

    const frisch = abdeckung(zustaende, undefined, tage(6));
    const spaet = abdeckung(zustaende, undefined, tage(400));

    expect(frisch.gefestigt).toBeGreaterThan(0);
    expect(frisch.verfallen).toBe(0);

    expect(spaet.gefestigt).toBe(0);
    expect(spaet.verfallen).toBe(1);
    expect(spaet.quote).toBe(0);
  });
});
