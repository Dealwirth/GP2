import type {
  Task,
  TaskOption,
  TaskProposal,
  ValidationCheck,
  ValidationRecord,
} from '../domain/types.ts';
import { FAKTEN_VERSION, gueltigAm, holeFakt } from '../content/facts/index.ts';
import { ENGINE_VERSION } from '../engine/calc/index.ts';

export const VALIDATOR_VERSION = '1.0.1';

/**
 * Parameterkombinationen, die in dieser Sitzung schon eine Aufgabe ergeben
 * haben (Duplikatsperre).
 *
 * Wichtig: Hier landet ein Hash erst, wenn der Task wirklich entstanden ist.
 * Vorher geschah das schon beim Bestehen der Prüfliste – ein Vorschlag, der
 * danach noch an der Zweitprüfung scheiterte, blockierte damit seine eigene
 * Parameterkombination für den Rest der Sitzung. Genau das ließ die
 * Aufgabenerzeugung „beim ersten Mal klappen und danach nicht mehr".
 *
 * Die Sperre ist nur die halbe Wahrheit: Was in früheren Sitzungen entstanden
 * ist, liegt in der Aufgabenablage. `pruefeDuplikat` fragt deshalb beide.
 */
const GESEHENE_PARAM_HASHES = new Set<string>();

/**
 * Setzt die Duplikatsperre auf den Stand der Ablage.
 *
 * Ohne das kennt die Sperre nur, was seit dem Laden der Seite erzeugt wurde.
 * Nach einem Neuladen würde dieselbe Aufgabe erneut gestellt.
 */
export function setzeBekannteHashes(hashes: string[]): void {
  for (const hash of hashes) GESEHENE_PARAM_HASHES.add(hash);
}

export interface ValidierungsOptionen {
  region?: string | null;
  jahrgang?: string | null;
  pruefungsdatum?: Date;
  /** Zweitprüfung durch ein zweites Modell – Ergebnis wird protokolliert. */
  zweitpruefung?: { bestanden: boolean; detail: string };
  /**
   * Werte, die die Rechen-Engine für diese Aufgabe erzeugt hat.
   * Sie gelten als gebunden: eine Zahl, die aus einem Rechenschritt stammt,
   * kann per Konstruktion nicht falsch sein.
   */
  engineWerte?: string[];
  /** ID der richtigen Antwortmöglichkeit – nur diese wird inhaltlich geprüft. */
  korrektOptionId?: string;
  /**
   * Werte, die in der Aufgabenstellung selbst vorgegeben sind.
   *
   * Wichtig: Diese Liste dürfen nur die kuratierten, festen Aufgaben benutzen.
   * Eine KI-Aufgabe bekommt sie nicht – sonst wäre sie ein Schlupfloch, um
   * erfundene Normzahlen als „vorgegeben" zu deklarieren.
   */
  vorgegebeneWerte?: string[];
  /**
   * Duplikatsperre abschalten.
   *
   * Nur für den deterministischen Aufgabenvorrat. Die Sperre soll verhindern,
   * dass die KI dieselbe Aufgabe zweimal erfindet. Für den festen Vorrat ist sie
   * sinnlos – und schädlich, weil der Vorrat bei jedem Sitzungsstart neu
   * gebaut wird und beim zweiten Mal als Duplikat abgewiesen würde.
   */
  duplikatPruefen?: boolean;
}

export interface ValidierungsErgebnis {
  record: ValidationRecord;
  bestanden: boolean;
}

/** Zahlen, die in einer KI-Aufgabe ohne Faktbindung nicht auftauchen dürfen. */
const ZAHLENMUSTER = /(?<![\w.,])(\d+([.,]\d+)?)(?![\w])/g;

/**
 * Entfernt Aufzählungszeichen wie „1. " am Zeilenanfang.
 *
 * Sonst würde die Nummer einer Teilfrage als ungebundene Zahl gelten – sie ist
 * aber keine Behauptung, sondern nur die Position in der Liste.
 */
function entferneAufzaehlung(text: string): string {
  return text.replace(/^\s*\d+[.)]\s+/gm, '');
}

function sammleZahlen(text: string): string[] {
  const treffer = text.match(ZAHLENMUSTER) ?? [];
  return treffer.map((t) => t.replace(',', '.'));
}

/** Wandelt eine Zahl in Textform in einen stabilen Zahlenwert um. */
function alsZahl(text: string): number | null {
  const wert = Number(text.replace(',', '.'));
  return Number.isFinite(wert) ? wert : null;
}

/** Rundet Fließkomma-Artefakte (z. B. 0,3 · 1000) ab. */
function runde(wert: number): number {
  return Math.round(wert * 1e6) / 1e6;
}

/**
 * Prüft, ob jede im Aufgabentext auftretende Zahl belegt ist.
 *
 * Zulässig sind ausschließlich:
 *   - Werte der zitierten Fakten (auch als mA- und Prozentdarstellung)
 *   - Werte, die die Rechen-Engine für genau diese Aufgabe erzeugt hat
 *
 * Alles andere ist eine freie Zahl und wird abgelehnt. Ohne diese Prüfung
 * könnte ein Modell eine plausibel aussehende, aber falsche Normzahl erfinden.
 */
export function pruefeFaktenbindung(
  proposal: TaskProposal,
  engineWerte: string[] = [],
  korrektOptionId?: string,
  vorgegebeneWerte: string[] = [],
): ValidationCheck {
  const gebunden = new Set<number>();

  // Werte, die die Aufgabenstellung selbst vorgegeben hat, sind belegt.
  for (const z of vorgegebeneWerte) {
    const wert = alsZahl(z);
    if (wert !== null) gebunden.add(wert);
  }

  for (const z of engineWerte) {
    const wert = alsZahl(z);
    if (wert !== null) gebunden.add(runde(wert));
  }

  for (const ref of proposal.factRefs) {
    const fakt = holeFakt(ref.factId);
    if (!fakt) continue;
    const basis = fakt.wert;
    if (basis !== undefined) {
      // Auch die in der Praxis üblichen Darstellungen gelten als belegt:
      // 0,3 A wird auch als 300 mA geschrieben.
      for (const skala of [1, 100, 1000]) gebunden.add(runde(basis * skala));
      // `ref.value` ist nur eine andere Schreibweise DESSELBEN Wertes, keine
      // zweite Quelle. Früher wurde jeder Wert hier ungeprüft übernommen –
      // damit konnte eine erfundene Zahl als `value` an eine echte factId
      // gehängt werden und die Bindung war umgangen. Jetzt zählt `value` nur,
      // wenn es der zitierte Fakt selbst hergibt.
      if (ref.value !== undefined) {
        const wert = alsZahl(String(ref.value));
        if (wert !== null && [1, 100, 1000].some((s) => runde(basis * s) === runde(wert))) {
          gebunden.add(runde(wert));
        }
      }
    }
    // Querschnitte, Kennlinien und Grenzwerte stehen im erläuternden Text.
    for (const z of sammleZahlen(fakt.bemerkung ?? '')) {
      const wert = alsZahl(z);
      if (wert !== null) gebunden.add(runde(wert));
    }
  }

  // Distraktoren sind absichtlich falsche Werte und behaupten nichts über die
  // Fachwelt – geprüft wird der Aufgabentext und die richtige Antwortmöglichkeit.
  const relevanteOptionen = (proposal.options ?? []).filter(
    (o) => korrektOptionId !== undefined && o.id === korrektOptionId,
  );

  const texte = [proposal.prompt, ...relevanteOptionen.map((o) => o.text)];
  const ungebunden: string[] = [];

  for (const text of texte) {
    for (const z of sammleZahlen(entferneAufzaehlung(text))) {
      const wert = alsZahl(z);
      if (wert !== null && !gebunden.has(runde(wert))) {
        ungebunden.push(`${z} in: „${text.slice(0, 60)}…"`);
      }
    }
  }

  return {
    id: 'faktenbindung',
    passed: ungebunden.length === 0,
    detail:
      ungebunden.length === 0
        ? `Alle Zahlen belegt: ${proposal.factRefs.length} Fakt(en), ${engineWerte.length} Rechenwert(e).`
        : `Ungebundene Zahlen: ${[...new Set(ungebunden)].join('; ')}`,
  };
}

function pruefeSchema(proposal: TaskProposal): ValidationCheck {
  const probleme: string[] = [];
  if (!proposal.prompt.trim()) probleme.push('Aufgabentext fehlt');
  if (proposal.estimatedSeconds <= 0) probleme.push('Dauer fehlt');
  if (proposal.topicIds.length === 0) probleme.push('Keinem Thema zugeordnet');
  if (proposal.format === 'mc' && (proposal.options?.length ?? 0) < 2) {
    probleme.push('Multiple Choice braucht mindestens zwei Antwortmöglichkeiten');
  }
  // Offene Aufgaben lassen sich nur bewerten, wenn feststeht, wonach gesucht
  // wird. Ohne Stichwortliste wäre jede Teilpunktzahl erfunden.
  if (
    (proposal.format === 'offen' || proposal.format === 'strukturiert') &&
    (proposal.expectedKeywords?.length ?? 0) < 3
  ) {
    probleme.push('Offene Aufgaben brauchen mindestens drei erwartete Begriffe');
  }
  if (proposal.format === 'fall' && (proposal.options?.length ?? 0) < 2) {
    probleme.push('Fallaufgabe braucht Folgefragen als Antwortmöglichkeiten');
  }
  return {
    id: 'schema',
    passed: probleme.length === 0,
    detail: probleme.length === 0 ? 'Aufbau vollständig.' : probleme.join('; '),
  };
}

function pruefeGueltigkeit(
  proposal: TaskProposal,
  opt: ValidierungsOptionen,
): ValidationCheck {
  const datum = opt.pruefungsdatum ?? new Date();
  const ungueltig: string[] = [];

  for (const ref of proposal.factRefs) {
    const fakt = holeFakt(ref.factId);
    if (!fakt) {
      ungueltig.push(`${ref.factId} existiert nicht`);
      continue;
    }
    if (!gueltigAm(fakt, datum, opt.region ?? null, opt.jahrgang ?? null)) {
      ungueltig.push(`${ref.factId} gilt für Region/Jahrgang oder Zeitraum nicht`);
    }
  }

  return {
    id: 'gueltiger-zeitraum',
    passed: ungueltig.length === 0,
    detail:
      ungueltig.length === 0
        ? 'Alle zitierten Fakten sind gültig.'
        : ungueltig.join('; '),
  };
}

function pruefeDuplikat(paramsHash: string, pruefen: boolean): ValidationCheck {
  if (!pruefen) {
    return { id: 'duplikat', passed: true, detail: 'Für feste Aufgaben nicht erforderlich.' };
  }
  const duplikat = GESEHENE_PARAM_HASHES.has(paramsHash);
  return {
    id: 'duplikat',
    passed: !duplikat,
    detail: duplikat
      ? 'Diese Parameterkombination wurde bereits erzeugt.'
      : 'Parameterkombination ist neu.',
  };
}

/**
 * Vollständige Validierung eines Aufgabenvorschlags.
 *
 * Bestehende Prüfungsvorgänge werden protokolliert, aber nicht selbst
 * ausgeführt: die rechnerische Prüfung liegt in `engine/calc`, die
 * Selbstprüfung und Zweitprüfung der KI laufen außerhalb und werden als
 * Ergebnis übergeben.
 */
export function validiere(
  proposal: TaskProposal,
  paramsHash: string,
  opt: ValidierungsOptionen = {},
): ValidierungsErgebnis {
  const pruefeDuplikate = opt.duplikatPruefen !== false;
  const checks: ValidationCheck[] = [
    pruefeSchema(proposal),
    pruefeFaktenbindung(
      proposal,
      opt.engineWerte ?? [],
      opt.korrektOptionId,
      opt.vorgegebeneWerte ?? [],
    ),
    pruefeGueltigkeit(proposal, opt),
    pruefeDuplikat(paramsHash, pruefeDuplikate),
  ];

  if (opt.zweitpruefung) {
    checks.push({
      id: 'zweitpruefung',
      passed: opt.zweitpruefung.bestanden,
      detail: opt.zweitpruefung.detail,
    });
  }

  const record: ValidationRecord = {
    checks,
    passedAt: new Date().toISOString(),
    validatorVersion: VALIDATOR_VERSION,
  };

  const bestanden = checks.every((c) => c.passed);
  return { record, bestanden };
}

/** Trägt eine Parameterkombination in die Duplikatsperre ein. */
export function merkeHash(paramsHash: string): void {
  GESEHENE_PARAM_HASHES.add(paramsHash);
}

/** Leert den Duplikatspeicher. */
export function leereDuplikatspeicher(): void {
  GESEHENE_PARAM_HASHES.clear();
}

export interface TaskBausatz {
  proposal: TaskProposal;
  paramsHash: string;
  correctOptionId?: string;
  optionRationale?: Record<string, string>;
  solutionText?: string;
  solutionSteps?: Task['solutionSteps'];
  explanation: string;
  validierungsOptionen?: ValidierungsOptionen;
}

/**
 * Der einzige Weg, ein `Task` zu erzeugen.
 *
 * Die Funktion wirft, wenn die Validierung fehlschlägt. Damit ist im Code
 * erzwungen: Ein Task existiert nur mit gültigem Validierungsprotokoll und
 * mit den Versionsständen von Fakten, Regeln und Engine.
 */
export function baueTask(bausatz: TaskBausatz): Task {
  // Werte aus den Rechenschritten gelten als belegt: sie stammen aus der Engine.
  const engineWerte = new Set<string>();
  for (const schritt of bausatz.solutionSteps ?? []) {
    for (const z of sammleZahlen(`${schritt.result} ${schritt.substitution ?? ''}`)) {
      engineWerte.add(z);
    }
  }

  const { record, bestanden } = validiere(bausatz.proposal, bausatz.paramsHash, {
    ...bausatz.validierungsOptionen,
    engineWerte: [...engineWerte],
    korrektOptionId: bausatz.correctOptionId,
    // Deterministische Aufgaben werden nicht gegen die KI-Duplikatsperre
    // geprüft: sie sind fest und werden bei jeder Sitzung neu gebaut.
    duplikatPruefen: bausatz.validierungsOptionen?.duplikatPruefen ?? false,
  });

  if (!bestanden) {
    const fehler = record.checks
      .filter((c) => !c.passed)
      .map((c) => `${c.id}: ${c.detail}`)
      .join(' | ');
    throw new Error(`Aufgabe wurde verworfen – Validierung fehlgeschlagen. ${fehler}`);
  }

  // Erst jetzt ist die Parameterkombination wirklich vergeben. Wer den Hash
  // schon beim Bestehen der Prüfliste einträgt, sperrt Vorschläge, die es nie
  // zu einer Aufgabe bringen – und legt damit die nächste Runde lahm.
  if (bausatz.validierungsOptionen?.duplikatPruefen) merkeHash(bausatz.paramsHash);

  return {
    taskId: `t_${bausatz.paramsHash}`,
    proposal: bausatz.proposal,
    correctOptionId: bausatz.correctOptionId,
    optionRationale: bausatz.optionRationale,
    solutionText: bausatz.solutionText,
    solutionSteps: bausatz.solutionSteps ?? [],
    explanation: bausatz.explanation,
    factVersion: FAKTEN_VERSION,
    ruleVersion: '1.0.0',
    engineVersion: ENGINE_VERSION,
    validation: record,
    approved: true,
    createdAt: record.passedAt,
  };
}

/** Erzeugt einen stabilen Hash über die Aufgabenparameter. */
export function parameterHash(parts: unknown[]): string {
  const text = parts
    .map((p) => (typeof p === 'object' ? JSON.stringify(p) : String(p)))
    .join('|');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function optionText(optionen: TaskOption[] | undefined, id: string): string {
  return optionen?.find((o) => o.id === id)?.text ?? '';
}
