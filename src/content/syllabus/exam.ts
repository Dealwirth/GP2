import type { ExamArea, ExamAreaInfo } from '../../domain/types.ts';

/**
 * Prüfungsrahmen der Gesellenprüfung Teil 2.
 *
 * Quelle: Elektronikerausbildungsverordnung (ElekAusbV) vom 30.03.2021,
 * BGBl. I S. 662, 699 – § 9 bis § 16 sowie Anlage (Ausbildungsrahmenplan).
 * Die Fachrichtung ist "Energie- und Gebäudetechnik" (§ 4 Abs. 3).
 *
 * Diese Datei ist die einzige Quelle der Gewichte im gesamten Projekt.
 */
export const PRUEFUNGSBEREICHE: Record<ExamArea, ExamAreaInfo> = {
  kundenauftrag: {
    id: 'kundenauftrag',
    label: 'Kundenauftrag',
    minutes: 16 * 60,
    weightPercent: 36,
    paragraph: '§ 11',
    description:
      'Errichten, Ändern oder Instandhalten einer gebäudetechnischen Anlage, ' +
      'mit situativem Fachgespräch während der Durchführung.',
  },
  systementwurf: {
    id: 'systementwurf',
    label: 'Systementwurf',
    minutes: 120,
    weightPercent: 12,
    paragraph: '§ 12',
    description:
      'Entwurf einer Änderung einer gebäudetechnischen Anlage: Problemanalyse, ' +
      'Lösungskonzepte, Anlagenspezifikation, Komponenten- und Softwareauswahl, ' +
      'Datenschutz und Informationssicherheit. Schriftlich.',
  },
  funktionsanalyse: {
    id: 'funktionsanalyse',
    label: 'Funktions- und Systemanalyse',
    minutes: 120,
    weightPercent: 12,
    paragraph: '§ 13',
    description:
      'Analyse einer gebäudetechnischen Anlage: Schaltungsunterlagen auswerten, ' +
      'Mess- und Prüfverfahren wählen, Signale an Schnittstellen zuordnen, ' +
      'Fehlerursachen bestimmen und beseitigen, Schutzmaßnahmen bewerten. Schriftlich.',
  },
  wiso: {
    id: 'wiso',
    label: 'Wirtschafts- und Sozialkunde',
    minutes: 60,
    weightPercent: 10,
    paragraph: '§ 14',
    description:
      'Praxisbezogene Aufgaben zu wirtschaftlichen und gesellschaftlichen ' +
      'Zusammenhängen der Berufs- und Arbeitswelt. Schriftlich.',
  },
  teil1: {
    id: 'teil1',
    label: 'Teil 1 – Elektrotechnische Anlagen und Betriebsmittel',
    minutes: 10 * 60,
    weightPercent: 30,
    paragraph: '§ 8',
    description:
      'Prüfungsbereich aus Teil 1. Fließt mit 30 % in das Gesamtergebnis ein, ' +
      'ist aber nicht mehr Inhalt von Teil 2.',
  },
};

export const TEIL2_BEREICHE: ExamArea[] = [
  'kundenauftrag',
  'systementwurf',
  'funktionsanalyse',
  'wiso',
];

/** Summe der Gewichte muss 100 ergeben – wird im Test abgesichert. */
export const GEWICHTE_SUMME = Object.values(PRUEFUNGSBEREICHE).reduce(
  (sum, bereich) => sum + bereich.weightPercent,
  0,
);

// ---------------------------------------------------------------------------
// Noten (deutsche 6-Punkte-Skala)
// ---------------------------------------------------------------------------

/** Umrechnung Note (1,0 = sehr gut … 6,0 = ungenügend) ↔ Punktzahl. */
export function punkteZuNote(punkteProzent: number): number {
  const p = Math.max(0, Math.min(100, punkteProzent));
  if (p >= 92) return 1.0;
  if (p >= 81) return 1.5;
  if (p >= 67) return 2.0;
  if (p >= 50) return 3.0;
  if (p >= 30) return 4.0;
  if (p >= 5) return 5.0;
  return 6.0;
}

export type NoteUrteil = 'sehr gut' | 'gut' | 'befriedigend' | 'ausreichend' | 'mangelhaft' | 'ungenügend';

export function noteZuUrteil(note: number): NoteUrteil {
  if (note <= 1.5) return 'sehr gut';
  if (note <= 2.5) return 'gut';
  if (note <= 3.5) return 'befriedigend';
  if (note <= 4.0) return 'ausreichend';
  if (note <= 5.0) return 'mangelhaft';
  return 'ungenügend';
}

export function istAusreichendOderBesser(note: number): boolean {
  return note <= 4.0;
}

export function istUngenuegend(note: number): boolean {
  return note >= 6.0;
}

// ---------------------------------------------------------------------------
// Bestehensregelung § 15 ElekAusbV
// ---------------------------------------------------------------------------

export interface BestehensUrteil {
  bestanden: boolean;
  /** Einzelgründe, die im UI angezeigt werden. */
  pruefpunkte: {
    label: string;
    erfuellt: boolean;
    hinweis: string;
  }[];
}

/**
 * § 15 Abs. 2 ElekAusbV:
 * Die Gesellenprüfung ist bestanden, wenn
 *  1. im Gesamtergebnis von Teil 1 und Teil 2 mindestens "ausreichend",
 *  2. im Ergebnis von Teil 2 mindestens "ausreichend",
 *  3. im Prüfungsbereich Kundenauftrag mindestens "ausreichend",
 *  4. in mindestens zwei weiteren Prüfungsbereichen von Teil 2 mindestens
 *     "ausreichend" und
 *  5. in keinem Prüfungsbereich von Teil 2 "ungenügend"
 * bewertet worden sind.
 *
 * @param noten Noten je Prüfungsbereich. Fehlende Einträge gelten als 6,0.
 */
export function bewerteNachParagraf15(noten: Partial<Record<ExamArea, number>>): BestehensUrteil {
  const note = (bereich: ExamArea): number => noten[bereich] ?? 6.0;

  const gesamt =
    note('teil1') * PRUEFUNGSBEREICHE.teil1.weightPercent +
    TEIL2_BEREICHE.reduce(
      (s, b) => s + note(b) * PRUEFUNGSBEREICHE[b].weightPercent,
      0,
    );
  const gesamtNote = gesamt / 100;

  const teil2Note =
    TEIL2_BEREICHE.reduce(
      (s, b) => s + note(b) * PRUEFUNGSBEREICHE[b].weightPercent,
      0,
    ) / TEIL2_BEREICHE.reduce((s, b) => s + PRUEFUNGSBEREICHE[b].weightPercent, 0);

  const kundenauftragOk = istAusreichendOderBesser(note('kundenauftrag'));

  const weiterenBereicheOk = TEIL2_BEREICHE.filter(
    (b) => b !== 'kundenauftrag' && istAusreichendOderBesser(note(b)),
  ).length;

  const ungenuegend = TEIL2_BEREICHE.some((b) => istUngenuegend(note(b)));

  const pruefpunkte: BestehensUrteil['pruefpunkte'] = [
    {
      label: 'Gesamtergebnis ausreichend',
      erfuellt: istAusreichendOderBesser(gesamtNote),
      hinweis: gesamtNote.toFixed(2),
    },
    {
      label: 'Ergebnis Teil 2 ausreichend',
      erfuellt: istAusreichendOderBesser(teil2Note),
      hinweis: teil2Note.toFixed(2),
    },
    {
      label: 'Kundenauftrag ausreichend',
      erfuellt: kundenauftragOk,
      hinweis: note('kundenauftrag').toFixed(2),
    },
    {
      label: 'Zwei weitere Bereiche ausreichend',
      erfuellt: weiterenBereicheOk >= 2,
      hinweis: `${weiterenBereicheOk} / 2`,
    },
    {
      label: 'Kein Bereich ungenügend',
      erfuellt: !ungenuegend,
      hinweis: ungenuegend ? 'verletzt' : 'erfüllt',
    },
  ];

  return { bestanden: pruefpunkte.every((p) => p.erfuellt), pruefpunkte };
}
