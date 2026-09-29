import type { Task } from '../domain/types.ts';
import { FALLAUFGABEN, type Fallaufgabe } from '../content/curriculum/fallaufgaben.ts';
import { baueTask, parameterHash } from '../validation/pipeline.ts';
import { ueberspringeFehlerhaft } from './robust.ts';
import type { Aufgabenstufe } from '../domain/types.ts';

/**
 * Erzeugt Aufgaben aus den Fall- und Textaufgaben.
 *
 * Wichtig für die Ehrlichkeit: Bei offenen Aufgaben wird **kein** richtiger
 * Text hinterlegt. Stattdessen liegen die Pflichtbegriffe bei – die Antwort
 * wird später über Begriffe bewertet, nicht über Textgleichheit. Die
 * Musterlösung ist als `solutionText` ein Vorschlag, kein Schlüssel.
 */
export function aufgabeAusFall(quelle: Fallaufgabe): Task {
  const istOffen = quelle.format === 'offen' || quelle.format === 'strukturiert';
  const pflichtbegriffe = (quelle.teilfragen ?? []).flatMap((t) => t.pflichtbegriffe);

  // Die Herkunft je Angabe ("Aufgabenstellung", "Faktenbasis", "Berufsbildposition 1")
  // ist Belegmaterial, kein Prüfungstext. Sie wird deshalb NICHT in den
  // Aufgabentext gerendert, sondern getrennt mitgeführt und im Ergebnis als
  // Herkunftsnachweis angezeigt. Sonst müsste die Faktenbindung die Zahlen
  // einer Literaturangabe als Sachwerte durchwinken.
  const situation = quelle.ausgangslage.length
    ? `${quelle.situation}\n\nAusgangslage:\n${quelle.ausgangslage
        .map((a) => `· ${a.bezeichnung}: ${a.wert}`)
        .join('\n')}`
    : quelle.situation;

  const frageText = istOffen
    ? `${quelle.frage}\n\n${(quelle.teilfragen ?? []).map((t, i) => `${i + 1}. ${t.frage}`).join('\n')}`
    : quelle.frage;

  const korrektIndex = quelle.korrektOption;
  const optionen = quelle.optionen;

  const schritte: Task['solutionSteps'] = [];

  if (istOffen && quelle.teilfragen) {
    for (const teil of quelle.teilfragen) {
      schritte.push({
        label: teil.frage,
        result: teil.muster,
      });
    }
  } else if (korrektIndex !== null && optionen !== null) {
    const richtigeOption = optionen[korrektIndex];
    if (richtigeOption) {
      schritte.push({ label: 'Richtige Zuordnung', result: richtigeOption });
    }
  }

  const herkunft = quelle.ausgangslage
    .filter((a) => a.quelle)
    .map((a) => ({ bezeichnung: a.bezeichnung, quelle: a.quelle! }));

  const aufgabe = baueTask({
    validierungsOptionen: {
      // Situation und Ausgangslage sind von Hand gesetzt – ihre Zahlen sind
      // vorgegebene Angaben, keine Behauptung über eine Norm. Sie werden
      // deshalb als belegt erklärt. Für KI-Aufgaben gilt das ausdrücklich nicht.
      vorgegebeneWerte: [
        ...sammleZahlenAusText(quelle.situation),
        ...quelle.ausgangslage.flatMap((a) => sammleZahlenAusText(a.wert)),
      ],
    },
    proposal: {
      proposalId: `fall-${quelle.id}`,
      format: quelle.format,
      stufe: quelle.stufe as Aufgabenstufe,
      estimatedSeconds: quelle.dauerSekunden,
      examArea: quelle.bereich,
      topicIds: quelle.topicIds,
      prompt: `${quelle.titel}\n\n${situation}\n\n${frageText}`,
      options: optionen
        ? (optionen.map((text, i) => ({
            id: String.fromCharCode(97 + i),
            text,
          })) as Task['proposal']['options'])
        : undefined,
      factRefs: [],
      learningGoal: quelle.lernziel,
      hint: (quelle.teilfragen ?? []).map((t) => t.hilfe).join(' '),
      expectedKeywords: pflichtbegriffe,
      origin: 'statisch',
    },
    paramsHash: parameterHash(['fall', quelle.id]),
    correctOptionId:
      korrektIndex === null ? undefined : String.fromCharCode(97 + korrektIndex),
    optionRationale: korrektIndex === null || optionen === null
      ? undefined
      : Object.fromEntries(
          optionen.map((text, i) => [
            String.fromCharCode(97 + i),
            i === korrektIndex
              ? (quelle.optionBegruendung ?? text)
              : 'Diese Vorgehensweise führt nicht zum Ziel – sie ersetzt die Analyse durch Raten oder durch eine zu grobe Maßnahme.',
          ]),
        ),
    solutionText: istOffen
      ? (quelle.teilfragen ?? []).map((t) => t.muster).join('\n\n')
      : (quelle.optionBegruendung ?? ''),
    solutionSteps: schritte,
    explanation: istOffen
      ? `Erwartet werden ${pflichtbegriffe.length} Begriffe. Vergleiche deine Antwort mit dem Muster – es ist ein Vorschlag, keine Pflicht.`
      : (quelle.optionBegruendung ?? quelle.lernziel),
  });

  return {
    ...aufgabe,
    verweis: quelle.verweis,
    ...(herkunft.length > 0 ? { herkunft } : {}),
  };
}

export function fallAufgaben(): Task[] {
  // Einzeln absichern: Ein fehlerhafter Datensatz darf nicht den ganzen
  // Aufgabenvorrat mitnehmen. Der Grund wird festgehalten und im Test geprüft.
  const aufgaben: Task[] = [];
  for (const quelle of FALLAUFGABEN) {
    const aufgabe = ueberspringeFehlerhaft('fall', quelle.id, () => aufgabeAusFall(quelle));
    if (aufgabe) aufgaben.push(aufgabe);
  }
  return aufgaben;
}

export function offeneAufgaben(): Task[] {
  return fallAufgaben().filter((t) => t.proposal.format === 'strukturiert' || t.proposal.format === 'offen');
}

/** Liest alle Zahlen aus einem Text – für die vorgegebenen Ausgangsdaten. */
function sammleZahlenAusText(text: string): string[] {
  return text.match(/(?<![\w.,])(\d+([.,]\d+)?)(?![\w])/g) ?? [];
}
