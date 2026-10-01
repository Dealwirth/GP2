import type { Digest } from '../memory/index.ts';
import { PRUEFUNGSBEREICHE } from '../content/syllabus/exam.ts';
import type { ExamArea } from '../domain/types.ts';
import { DRINGLICHKEIT_TEXT, dringlichkeit, naechsterTermin, tageBis } from './termine.ts';

/**
 * Beratungstext.
 *
 * Eine Empfehlung, die aus dem Lernstand direkt gerechnet wird. Sie ist kurz
 * und trocken, aber sie kommt immer – ohne Netz, ohne Schlüssel, ohne
 * Kontingent.
 *
 * Die Reihenfolge folgt der Dringlichkeit, nicht der Datenlage: erst der
 * Prüfungstermin, dann die Pflichtbereiche, dann die Lücken, dann die Methode.
 */

export interface Beratung {
  text: string;
  erstelltAm: string;
}

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
    return { text: saetze.join(' '), erstelltAm: jetzt.toISOString() };
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

  return { text: saetze.join(' '), erstelltAm: jetzt.toISOString() };
}
