import type { Digest } from '../memory/index.ts';
import { PRUEFUNGSBEREICHE } from '../content/syllabus/exam.ts';
import type { ExamArea } from '../domain/types.ts';
import { DRINGLICHKEIT_TEXT, dringlichkeit, naechsterTermin, tageBis } from '../domain/termine.ts';
import { frage, type AiEinstellungen } from './client.ts';

/**
 * Beratungstext.
 *
 * Zwei Wege, und der zweite ist der wichtigere:
 *
 *  1. **Mit KI** – das Modell formuliert aus dem Lernstand eine Empfehlung in
 *     ganzen Sätzen. Das liest sich besser als eine Zahlenliste.
 *  2. **Ohne KI** – eine Empfehlung, die aus demselben Lernstand direkt
 *     gerechnet wird. Sie ist kürzer und trockener, aber sie kommt immer.
 *
 * Der zweite Weg ist Absicht. Eine Beratung, die nur mit Internetverbindung,
 * einem Schlüssel und freiem Kontingent erscheint, ist keine Beratung, sondern
 * ein Glücksspiel. Wer die Seite offline öffnet, bekommt trotzdem einen
 * brauchbaren Satz – nur ohne Feinschliff.
 */

export interface Beratung {
  text: string;
  /** Woher der Text stammt – für die Nachvollziehbarkeit im UI. */
  herkunft: 'ki' | 'lokal';
  /** Nur bei `herkunft === 'lokal'`: warum nicht die KI geantwortet hat. */
  grund?: string;
  erstelltAm: string;
}

// ---------------------------------------------------------------------------
// Lokale Beratung
// ---------------------------------------------------------------------------

/**
 * Erzeugt eine Empfehlung ohne KI.
 *
 * Die Reihenfolge folgt der Dringlichkeit, nicht der Datenlage: erst der
 * Prüfungstermin, dann die Pflichtbereiche, dann die Lücken, dann die Methode.
 */
export function lokaleBeratung(digest: Digest, jetzt = new Date()): Beratung {
  const saetze: string[] = [];
  const termin = naechsterTermin();
  const resttage = termin ? tageBis(termin.datum, jetzt) : null;

  if (termin && resttage !== null && resttage > 0) {
    saetze.push(
      `${termin.titel} in ${resttage} Tagen – ${DRINGLICHKEIT_TEXT[dringlichkeit(termin.datum, jetzt)]}.`,
    );
  }

  if (digest.beantwortetGesamt === 0) {
    saetze.push(
      'Du hast noch nichts bearbeitet. Fang mit dem Lernpfad an: ein Kapitel, ' +
        'eine Aufgabe, dann weiter – nicht alles auf einmal.',
    );
    return {
      text: saetze.join(' '),
      herkunft: 'lokal',
      erstelltAm: jetzt.toISOString(),
    };
  }

  // Pflichtbereich zuerst: Ohne Kundenauftrag ist die Prüfung nicht bestanden,
  // egal wie gut alles andere läuft.
  const ka = PRUEFUNGSBEREICHE.kundenauftrag.label;
  const kaReife = digest.reife.kundenauftrag ?? 0;
  if (kaReife < 0.5) {
    saetze.push(
      `Der ${ka} steht bei ${Math.round(kaReife * 100)} % und ist der einzige Bereich, ` +
        'der für sich mindestens ausreichend sein muss. Er hat Vorrang vor allem anderen.',
    );
  }

  if (digest.themenVerfallen > 0) {
    saetze.push(
      `${digest.themenVerfallen} Thema${digest.themenVerfallen === 1 ? '' : 'en'} ` +
        'sind verfallen – das saß schon einmal und ist wieder weg. Wiederhole diese ' +
        'zuerst, sie kommen schneller zurück als Neues.',
    );
  }

  if (digest.haeufigsteFehler.length > 0) {
    const top = digest.haeufigsteFehler
      .slice(0, 3)
      .map((f) => `${f.titel} (${Math.round((1 - f.quote) * 100)} % falsch)`)
      .join(', ');
    saetze.push(`Deine drei hartnäckigsten Baustellen: ${top}.`);
  }

  const reihenfolge = (['kundenauftrag', 'systementwurf', 'funktionsanalyse', 'wiso'] as ExamArea[])
    .map((b) => ({ b, r: digest.reife[b] ?? 0 }))
    .sort((a, b) => a.r - b.r);

  const schwaechster = reihenfolge[0];
  if (schwaechster) {
    saetze.push(
      `Am schwächsten steht ${PRUEFUNGSBEREICHE[schwaechster.b].label} bei ` +
        `${Math.round(schwaechster.r * 100)} % – dort bringt eine Runde am meisten.`,
    );
  }

  saetze.push(
    `Abdeckung insgesamt ${Math.round(digest.abdeckungQuote * 100)} %. ` +
      (digest.abdeckungQuote < 0.4
        ? 'Arbeite erst in die Breite, damit keine ganze Kapitel unbesehen bleiben.'
        : 'Die Breite steht. Jetzt geht es um die Tiefe der Rechen- und Fallaufgaben.'),
  );

  return { text: saetze.join(' '), herkunft: 'lokal', erstelltAm: jetzt.toISOString() };
}

// ---------------------------------------------------------------------------
// Beratung mit KI
// ---------------------------------------------------------------------------

export const BERATUNG_SYSTEM = `Du bist Ausbildungsmeister für Elektroniker der Fachrichtung \
Energie- und Gebäudetechnik und bereitest einen Auszubildenden auf die Gesellenprüfung Teil 2 vor.

Deine Aufgabe: Schreibe eine kurze, konkrete Lernberatung auf Deutsch.

Regeln:
- Höchstens fünf Sätze. Keine Aufzählung, keine Überschriften, keine Emojis.
- Sprich den Lernenden mit "du" an.
- Beziehe dich ausschließlich auf die Zahlen im Lernstand. Erfinde keine Zahlen.
- Nenne keine Normeninhalte, Formeln oder Grenzwerte. Du berätst zum Lernen, nicht zum Fachinhalt.
- Wenn der Kundenauftrag unter 50 % steht, sag das an erster Stelle: er ist der einzige Bereich,
  der für sich mindestens ausreichend sein muss.
- Sei nüchtern und konkret. Keine Motivation, keine Floskeln.`;

/** Baut den Nutzerteil der Anfrage aus dem Lernstand. */
export function beratungAnfrage(digest: Digest): string {
  const bereiche = (['kundenauftrag', 'systementwurf', 'funktionsanalyse', 'wiso'] as ExamArea[])
    .map((b) => `${PRUEFUNGSBEREICHE[b].label}: ${Math.round((digest.reife[b] ?? 0) * 100)} %`)
    .join('\n');

  const fehler =
    digest.haeufigsteFehler.length > 0
      ? digest.haeufigsteFehler
          .slice(0, 5)
          .map((f) => `${f.titel}: ${Math.round((1 - f.quote) * 100)} % falsch`)
          .join('\n')
      : 'keine';

  const termin = naechsterTermin();
  const resttage = termin ? tageBis(termin.datum) : null;

  return [
    `Lernstand vom ${digest.erstelltAm.slice(0, 10)}`,
    termin && resttage !== null ? `Nächster Termin: ${termin.titel} in ${resttage} Tagen` : '',
    `Beantwortet insgesamt: ${digest.beantwortetGesamt}`,
    `Themen begonnen: ${digest.themenBegonnen}, gefestigt: ${digest.themenGefestigt}, verfallen: ${digest.themenVerfallen}`,
    `Abdeckung: ${Math.round(digest.abdeckungQuote * 100)} %`,
    `Fehlerquote: ${Math.round(digest.fehlerquote * 100)} %`,
    `Reife je Prüfungsbereich:\n${bereiche}`,
    `Themen mit den meisten Fehlern:\n${fehler}`,
    `Jetzt fällig: ${digest.faelligeThemen.length} Themen`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Holt eine Beratung. Schlägt die KI fehl, kommt die lokale Beratung – mit
 * Begründung, damit im UI sichtbar ist, woher der Text stammt.
 */
export async function holeBeratung(
  einstellungen: AiEinstellungen,
  digest: Digest,
  signal?: AbortSignal,
): Promise<Beratung> {
  const lokal = lokaleBeratung(digest);

  if (!einstellungen.aktiv) {
    return {
      ...lokal,
      grund: 'Die KI ist nicht eingerichtet. Unter „Einstellungen" lässt sich das ändern.',
    };
  }

  try {
    const text = await frage(
      einstellungen,
      { system: BERATUNG_SYSTEM, nutzer: beratungAnfrage(digest), temperatur: 0.4 },
      signal,
    );
    const sauber = text.trim();
    if (sauber.length < 20) {
      return { ...lokal, grund: 'Die Antwort der KI war zu kurz, um brauchbar zu sein.' };
    }
    return { text: sauber, herkunft: 'ki', erstelltAm: new Date().toISOString() };
  } catch (fehler) {
    return {
      ...lokal,
      grund: fehler instanceof Error ? fehler.message : 'Die KI war nicht erreichbar.',
    };
  }
}
