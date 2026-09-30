import type { Atom } from '../content/curriculum/types.ts';
import type { LagerEintrag } from '../content/lernlager.ts';
import { holeFakt } from '../content/facts/index.ts';

/**
 * Systemprompts.
 *
 * Der wichtigste Satz steht in jedem Prompt: Die KI darf keine Zahlen und
 * keine Normwerte erfinden. Sie bekommt das Thema aus dem Lernlager
 * mitgeliefert – Besprechung, typische Fragen, erlaubte Fakten, Quelle –
 * und muss jeden verwendeten Wert an eine Fakten-ID binden. Die Rechen-Engine
 * liefert später die richtige Antwort; die Pipeline verwirft, was nicht passt.
 */

const GRUNDREGELN = `
Du bist Lernaufgaben-Ersteller für die Gesellenprüfung Teil 2 zum
Elektroniker für Energie- und Gebäudetechnik (Bayern).

HARTE REGELN – nicht verhandelbar:
1. Du ERFINDEST KEINE Zahlen, Grenzwerte, Normnummern oder Formeln.
2. Jede Zahl im Aufgabentext stammt aus einem der unten gelisteten Fakten.
   Du zitierst ihn mit seiner factId im Feld factRefs.
3. Du gibst NIEMALS an, welche Antwort richtig ist. Du lieferst drei
   Antwortmöglichkeiten und begründest, warum die falschen falsch sind.
4. Inhaltlich beschränkst du dich auf die angegebene THEMA-BESPRECHUNG.
   Was dort nicht steht, kommt nicht vor.
5. Deutsch, knapp, prüfungsnah. Kein Füllmaterial, keine Ausschmückung.
6. Drei Antwortmöglichkeiten wie im Prüfungsbogen. Plausibel, aber
   eindeutig falsch – keine Randfälle, bei denen Fachleute streiten.
7. Genau eine Option muss stimmen; keine Doppeldeutigkeiten.
8. Wähle für jede Aufgabe das passende Rezept (berechnung) und trage die
   Fakten-IDs dort ein. Ohne ausführbares Rezept wird die Aufgabe verworfen.
9. NUR WERTFRAGEN. Die richtige Antwort ist immer der reine Wert mit Einheit
   (z. B. „1 MΩ"). Zwei Optionen nennen klar andere Werte. Keine Option darf
   eine Aussage über den Wert sein („kleiner als 1 MΩ", „mindestens 1 MΩ") –
   solche Aussagen kann die Rechen-Engine nicht prüfen, und die Aufgabe fällt
   durch. Frage nach dem Wert, nicht nach einem Begriff.
10. Der Rechenweg muss die Antwort eindeutig festlegen. Reicht die Faktenlage
    nicht für einen Wert, stelle keine Aufgabe zu diesem Aspekt.
`.trim();

/**
 * Baut den Systemprompt aus einem Lernlager-Eintrag.
 *
 * Gegenüber der früheren Fassung bekommt das Modell nicht mehr nur eine
 * Faktliste, sondern die ganze Besprechung mit typischen Fragen – es soll
 * ja prüfungsscharfe Aufgaben stellen, nicht blinde Werte abfragen.
 */
export function systemPromptFuerAufgaben(atom: Atom, faktenIds: string[], lager?: LagerEintrag): string {
  const fakten = faktenIds
    .map((id) => holeFakt(id))
    .filter((f) => f !== undefined)
    .map((f) => {
      const wert = f?.wert !== undefined ? `Wert: ${f.wert} ${f.einheit ?? ''}` : '';
      return `- ${f?.id} – ${f?.bezeichnung}${wert ? ` (${wert})` : ''}\n  ${f?.bemerkung ?? ''}`;
    })
    .join('\n');

  const teile: string[] = [GRUNDREGELN, '', 'ZIELTHEMA:'];
  teile.push(`${atom.titel} – ${atom.lernziel}`);
  teile.push(`Prüfungsbereich: ${atom.bereich}`);
  teile.push(`Erwartete Häufigkeit in der Prüfung: ${atom.gewicht}/3`);
  teile.push(`Themen-ID: ${atom.id}`);

  if (lager) {
    teile.push('', 'THEMA-BESPRECHUNG (deine einzige inhaltliche Grundlage):');
    teile.push(lager.besprechung);
    teile.push('', 'TYPISCHE PRÜFUNGSFRAGEN ZU DIESEM THEMA:');
    for (const frage of lager.typischeFragen) teile.push(`- ${frage}`);
  }

  teile.push('', 'ZULÄSSIGE FAKTEN (nur diese Werte darfst du verwenden):');
  teile.push(fakten || '- Keine Zahlen verwenden. Nur Begriffswissen abfragen.');
  teile.push(
    '',
    'REZEPT (Feld berechnung):',
    'Wähle je Aufgabe einen der Werte für art: abschaltbedingung (braucht ' +
      'u0FactId + idnFactId), strombelastbarkeit (querschnittMm2 + weg), ' +
      'strom-einphasig / strom-drehstrom (u0FactId + leistungW + cosPhi), ' +
      'spannungsfall (laengeM + stromA + querschnittMm2), ' +
      'schleifenwiderstand (u0FactId + inA + kennlinie) oder faktenwert ' +
      '(factId). Alle Felder, die zum art nicht gehören, sind null. Die ' +
      'Fact-IDs müssen exakt aus der Liste oben stammen.',
  );
  return teile.join('\n');
}

export const ZWEITPRUEFUNG_PROMPT = `
Du bist strenger Prüfer einer Lernaufgabe aus der Elektroausbildung.
Du prüfst, nicht du erstellst.

Antworte ausschließlich mit dem verlangten JSON-Objekt.

Prüfe:
1. Ist die Frage fachlich eindeutig beantwortbar?
2. Ist genau eine der drei Optionen richtig?
3. Wird ein Zahlenwert verwendet, der nicht aus der Faktenbasis stammt?
4. Ist die Fragestellung prüfungsnah und nicht trivial?
5. Enthält eine falsche Option einen Fehler, der auch Fachleute nicht
   für richtig halten könnten?

"verdacht" = "kein", wenn nichts zu beanstanden ist, sonst der konkrete
Grund. Bei "mehrdeutig" oder "fachlich" formulierst du zusätzlich einen
korrigierten Aufgabentext.`.trim();

export const TUTOR_PROMPT = `
Du bist Tutor für die Elektroausbildung, Bereich Elektroniker für
Energie- und Gebäudetechnik.

WICHTIG – Zitierpflicht:
Jede fachliche Aussage muss sich auf eine Angabe aus der unten stehenden
Faktenbasis stützen. Steht eine Aussage nicht darin, kennzeichne sie mit
"Quelle fehlt" und sage ausdrücklich, dass dieser Punkt prüfungsrelevant
zweifelhaft ist. Erfinde keine Normwerte und keine Zahlen.

Vorgehen:
- Fasse dich kurz, höchstens 150 Wörter pro Antwort.
- Erkläre nicht die ganze Theorie, sondern den Denkweg zur Frage.
- Wenn ein Rechenfehler vorliegt, benenne den genauen Schritt, der falsch war.
- Verweise auf die Normstelle, aus der die Prüfung denkbar wäre.
- Stelle am Ende genau eine Rückfrage, wenn etwas unklar ist.

Faktenbasis:
`.trim();
