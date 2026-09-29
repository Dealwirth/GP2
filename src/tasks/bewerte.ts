import type { Task } from '../domain/types.ts';

/**
 * Bewertung von Textantworten.
 *
 * Die schriftlichen Prüfungsbereiche sind überwiegend offen: Man schreibt einen
 * Aufgabenteil, keinen Buchstaben. Eine vollautomatische Bewertung ist dabei
 * nur eingeschränkt möglich – und jede Einrichtung, die vorgibt, eine
 * Freitextantwort sei „richtig", wäre eine Lüge.
 *
 * Deshalb arbeitet diese Bewertung ehrlich:
 *   - Sie zählt erwartete Begriffe, nicht Sätze.
 *   - Sie erkennt Synonyme und Wortvarianten, damit nicht die Formulierung
 *     bewertet wird, sondern das Wissen.
 *   - Sie gibt Teilpunkte und benennt ausdrücklich, was gefehlt hat.
 *   - Sie ersetzt niemals die fachliche Bewertung durch einen Menschen – das
 *     Ergebnis ist ausdrücklich eine Lernhilfe, keine Note.
 */

export interface TextUrteil {
  /** Anteil der erwarteten Begriffe, die gefunden wurden, 0..1. */
  quote: number;
  /** Teilpunkte nach der Punkteverteilung der Aufgabe. */
  punkte: number;
  maxPunkte: number;
  gefunden: { begriff: string; gefundenAls: string }[];
  fehlend: string[];
  /** Was in der Musterlösung steht, damit die Lücke sichtbar wird. */
  hinweis: string;
}

/** Normalisiert Text für den Wortvergleich. */
function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Prüft, ob ein erwarteter Begriff in der Antwort vorkommt.
 *
 * Berücksichtigt Mehrwortbegriffe und tolerant geschriebene Formen. Bei
 * Substantiven genügt der Stamm – „Leitungsschutzschalters" zählt zu
 * „Leitungsschutzschalter".
 */
export function enthaeltBegriff(antwort: string, begriff: string): { treffer: boolean; gefundenAls: string } {
  const a = normalisiere(antwort);
  const b = normalisiere(begriff);
  if (b === '') return { treffer: false, gefundenAls: '' };

  if (a.includes(b)) return { treffer: true, gefundenAls: begriff };

  // Ohne Umlaut-Umschreibung erneut prüfen: "Gebäude" steht sonst nicht in "gebaeude".
  const a2 = antwort.toLowerCase();
  const b2 = begriff.toLowerCase();
  if (a2.includes(b2)) return { treffer: true, gefundenAls: begriff };

  // Substantivstamm: letzte Silbe der Mehrzahl abschneiden.
  for (const form of [b, b.replace(/e$/, ''), b.replace(/en$/, ''), b.replace(/s$/, '')]) {
    if (form.length >= 5 && a.includes(form)) return { treffer: true, gefundenAls: begriff };
  }

  return { treffer: false, gefundenAls: '' };
}

/**
 * Bewertet eine Textantwort anhand der erwarteten Begriffe.
 *
 * `punkte` ist die Punktzahl, die bei vollständiger Beantwortung vergeben wird.
 */
export function bewerteTextantwort(
  antwort: string,
  task: Pick<Task, 'proposal' | 'solutionText'>,
  punkte: number,
): TextUrteil {
  const erwartet = task.proposal.expectedKeywords ?? [];
  if (erwartet.length === 0) {
    return {
      quote: 0,
      punkte: 0,
      maxPunkte: punkte,
      gefunden: [],
      fehlend: [],
      hinweis:
        'Zu dieser Aufgabe sind keine Stichworte hinterlegt. Sie kann deshalb nur ' +
        'gelesen, nicht automatisch bewertet werden – vergleiche sie mit der Musterlösung.',
    };
  }

  const gefunden: TextUrteil['gefunden'] = [];
  const fehlend: string[] = [];

  for (const begriff of erwartet) {
    const treffer = enthaeltBegriff(antwort, begriff);
    if (treffer.treffer) gefunden.push({ begriff, gefundenAls: treffer.gefundenAls });
    else fehlend.push(begriff);
  }

  const quote = gefunden.length / erwartet.length;
  return {
    quote,
    punkte: Math.round(quote * punkte * 10) / 10,
    maxPunkte: punkte,
    gefunden,
    fehlend,
    hinweis: task.solutionText ?? '',
  };
}

/** Vorschlagshilfen: häufige Formulierungen, die als Treffer gelten. */
export const FORMULIERUNG_HILFEN: Record<string, string[]> = {
  leitungsschutzschalter: ['LS', 'Leitungsschutz', 'SLS', 'automatischer Schutz'],
  fehlerstromschutz: ['FI', 'RCD', 'FI-Schalter', 'Fehlerstromschutzeinrichtung', 'RCMU'],
  schleifenwiderstand: ['R_A', 'RA', 'Schleifenimpedanz'],
  abschaltbedingung: ['R_A <= U0/Idn', 'Ua <= 50', 'Abschaltbedingung erfuellt'],
  durchgangsprüfung: ['Durchgang', 'Widerstandsmessung', 'Durchgangsmesstechnik'],
  funktionsprüfung: ['Funktionstest', 'Ausloesung geprueft', 'Testtaste'],
  fehlerursache: ['Ursache', 'Fehlerbild', 'Fehlersuche'],
  dokumentation: ['Protokoll', 'Dokumentation', 'Unterlagen', 'Nachweis'],
  datenschutz: ['Zweckbindung', 'Datenminimierung', 'Loeschfrist', 'personenbezogen'],
  informationssicherheit: ['Passwort', 'Zugriffsschutz', 'Verschluesselung', 'Backup'],
};

/** Formulierungshilfen anwenden – macht die Bewertung weniger streng, nicht falsch. */
export function erweitereUmFormulierungen(erwartet: string[]): string[] {
  const erweitert = new Set<string>();
  for (const begriff of erwartet) {
    erweitert.add(begriff);
    for (const hilfe of FORMULIERUNG_HILFEN[begriff.toLowerCase()] ?? []) {
      erweitert.add(hilfe);
    }
  }
  return [...erweitert];
}
