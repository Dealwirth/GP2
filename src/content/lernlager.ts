import type { Atom } from './curriculum/types.ts';
import { ATOME, KAPITEL } from './curriculum/index.ts';
import { FAKTEN, holeFakt } from './facts/index.ts';

/**
 * Das Lernlager.
 *
 * Die KI erzeugt jede Aufgabe allein aus diesem Bestand: Thema, Lernziel,
 * Besprechung, erlaubte Fakten, Quelle. Sie darf nichts hinzuerfinden –
 * was nicht im Lager steht, kann nicht geprüft werden und wird von der
 * Pipeline verworfen.
 *
 * Die Besprechungen sind kurze, prüfungsscharfe Zusammenfassungen. Sie
 * nennen das Fachliche, das in der Prüfung gezählt wird – nicht mehr.
 * Wo ein Wert offen ist (noch nicht am Original geprüft), steht das hier
 * und wird an die KI durchgereicht, damit die Aufgabe es ausweist.
 */

export interface LagerEintrag {
  atom: Atom;
  /** Prüfungsscharfe Besprechung des Themas. */
  besprechung: string;
  /** Prüfungsnahe Fragestellungen, die zu diesem Thema passen. */
  typischeFragen: string[];
  /** Fakten-IDs, die die KI für dieses Thema verwenden darf. */
  faktenIds: string[];
}

/**
 * Themen, deren Besprechung ausdrücklich gepflegt ist. Für alle übrigen
 * Themen entsteht der Eintrag automatisch aus Lernziel und Kapitel –
 * spärlicher, aber ehrlich.
 */
const GEPFLEGTE_BESPRECHUNGEN: Record<
  string,
  { besprechung: string; typischeFragen: string[]; fakten: string[] }
> = {
  'ka-verteilung-02': {
    besprechung:
      'Der Leitungsschutzschalter schützt das Kabel, nicht den Verbraucher. ' +
      'Thermisch löst er bei dauerhafter Überlast aus (1,13×In: nie aus, 1,45×In: muss auslösen). ' +
      'Magnetisch löst er bei Kurzschluss aus: B = 3–5×In, C = 5–10×In, D = 10–20×In. ' +
      'Die Kennlinie wählt man nach Einschaltströmen: B für Beleuchtung und Steckdosen, C für Motoren, D für Transformatoren.',
    typischeFragen: [
      'Welcher Faktor gilt für das magnetische Auslösen der Kennlinie C?',
      'Warum löst ein Leitungsschutzschalter bei 1,13×In nicht aus?',
    ],
    fakten: [
      'ls-kennlinie-b-magnetisch-min',
      'ls-kennlinie-c-magnetisch-min',
      'ls-kennlinie-d-magnetisch-min',
      'ls-typ-faktor',
    ],
  },
  'ka-verteilung-04': {
    besprechung:
      'Die Strombelastbarkeit I_z hängt ab von Querschnitt, Material, Isolierung, Verlegeart und Umgebungstemperatur. ' +
      'Die Referenzwerte gelten für Cu, PVC, Verlegeart C, 30 °C (z. B. 2,5 mm² → 21 A). ' +
      'Abweichende Temperaturen über Reduktionsfaktoren (35 °C → 0,94). ' +
      'Zwei Wege: Referenzwerte (Norm) oder vereinfachte Schultabelle – beide werden getrennt gerechnet, nie gemischt.',
    typischeFragen: [
      'Welchen Strom darf eine Leitung 2,5 mm² Cu, Verlegeart C, 30 °C dauerhaft führen?',
      'Welcher Faktor gilt bei 40 °C Umgebungstemperatur?',
    ],
    fakten: ['iz-tabelle-verlegeart-c', 'iz-temperatur-bezug', 'absicherung-schultabelle'],
  },
  'ka-messen-02': {
    besprechung:
      'Der Durchgang wird bei spannungsfreier Anlage mit dem Durchgangsprüfer oder dem ' +
      'Niederohm-Messbereich geprüft. Ein Durchgang liegt vor, wenn der Widerstand nahe null ist; ' +
      'ein hoher oder unendlicher Wert zeigt eine Unterbrechung. ' +
      'Geprüft werden Leitungen, Klemmen und Schutzkontakte – vor dem Einschalten.',
    typischeFragen: [
      'Wie wird ein Durchgang bei spannungsfreier Anlage geprüft?',
      'Welcher Messwert zeigt eine unterbrochene Leitung?',
    ],
    fakten: ['u0-230'],
  },
  'ka-messen-04': {
    besprechung:
      'Der Isolationswiderstand wird mit Gleichspannung gemessen – üblich sind 500 V Prüfspannung ' +
      'und ein Mindestwert von 1 MΩ je Stromkreis. Vor der Messung wird spannungsfrei geschaltet, ' +
      'empfindliche Elektronik wird abgeklemmt, die Entladung wird abgewartet. ' +
      'Der Grenzwert gilt je Stromkreis, nicht für die Anlage als Ganzes.',
    typischeFragen: [
      'Welcher Mindestwert gilt für den Isolationswiderstand eines Stromkreises?',
      'Warum werden Elektronikverbraucher vor der Isolationsmessung abgeklemmt?',
    ],
    fakten: ['riso-grenzwert'],
  },
  'ka-messen-05': {
    besprechung:
      'Der Erdschleifenwiderstand ist der Widerstand der Fehlerschleife über Erde. ' +
      'Er wird mit dem Erdungsmessgerät über die Erdungsmesszange oder mit Sonden bestimmt. ' +
      'Der Grenzwert folgt aus der Abschaltbedingung: R_A ≤ U₀ / I_Δn – bei 300 mA sind das 166,7 Ω.',
    typischeFragen: [
      'Wie wird der Erdschleifenwiderstand messtechnisch bestimmt?',
      'Welcher Grenzwert gilt für R_E bei einer Abschaltung mit 300 mA?',
    ],
    fakten: ['re-grenzwert', 'u0-50', 'idn-feuchteraum'],
  },
  'ka-messen-06': {
    besprechung:
      'Die Erdungswiderstände werden nach der Abschaltbedingung beurteilt: R_A ≤ U₀ / I_Δn. ' +
      'Bei 30 mA Fehlerstrom sind das 1667 Ω, bei 300 mA sind es 167 Ω. ' +
      'Gemessen wird mit Erdungsmessgerät, Stromzange oder Sondenverfahren.',
    typischeFragen: [
      'Wie groß darf R_A bei I_Δn = 30 mA höchstens sein?',
      'Wie wird ein Erdungswiderstand messtechnisch beurteilt?',
    ],
    fakten: ['re-grenzwert', 'u0-50', 'idn-personenschutz', 'idn-feuchteraum'],
  },
  'ka-messen-07': {
    besprechung:
      'Der Schleifenwiderstand R_L wird zwischen Außenleiter und Schutzleiter gemessen. ' +
      'Er muss die Abschaltbedingung erfüllen: R_L ≤ U₀ / I_a, wobei I_a die untere magnetische ' +
      'Auslösegrenze der Kennlinie ist (B = 3×In, C = 5×In, D = 10×In). ' +
      'Die Messung erfolgt mit Schleifenwiderstandsmessgerät bei eingeschalteter Anlage.',
    typischeFragen: [
      'Welche Bedingung muss der Schleifenwiderstand bei Kennlinie B erfüllen?',
      'Mit welchem Verfahren wird der Schleifenwiderstand gemessen?',
    ],
    fakten: [
      'u0-230',
      'u0-400',
      'ls-kennlinie-b-magnetisch-min',
      'ls-kennlinie-c-magnetisch-min',
      're-grenzwert',
    ],
  },
  'ka-pruefung-01': {
    besprechung:
      'Abschaltbedingungen stellen sicher, dass im Fehlerfall rechtzeitig abgeschaltet wird. ' +
      'Bei RCD: R_A ≤ U₀ / I_Δn (bei 30 mA → 1667 Ω; bei 300 mA → 167 Ω). ' +
      'Bei Leitungsschutzschalter: Schleifenwiderstand R_L ≤ U₀ / I_a, wobei I_a die untere magnetische Grenze der Kennlinie ist.',
    typischeFragen: [
      'Wie groß darf R_A bei I_Δn = 30 mA höchstens sein?',
      'Welche Bedingung muss der Schleifenwiderstand bei Kennlinie B erfüllen?',
    ],
    fakten: [
      'u0-50',
      'idn-personenschutz',
      'idn-feuchteraum',
      'ls-kennlinie-b-magnetisch-min',
      'ls-kennlinie-c-magnetisch-min',
    ],
  },
  'wiso-recht-01': {
    besprechung:
      'Arbeitsvertrag, Ausbildungsverhältnis, Haftung und Versicherungen sind die rechtlichen Grundlagen. ' +
      'Der Ausbildende trägt die Fürsorgepflicht; Auszubildende folgen der Anweisung im Rahmen der Ausbildung. ' +
      'Jugendarbeitsschutz verbietet gefährliche Arbeiten für Jugendliche.',
    typischeFragen: [
      'Wer trägt die Fürsorgepflicht im Ausbildungsverhältnis?',
      'Welche Arbeiten dürfen Jugendliche nicht ausführen?',
    ],
    fakten: [],
  },
};

/** Kapitel-Präfixe und die Fakten-Tags, die typischerweise dazugehören. */
const KAPITEL_TAG_HINWEISE: Record<string, string[]> = {
  'ka-verteilung': ['strombelastbarkeit', 'absicherung', 'querschnitt', 'rcd'],
  // „ka-messen" deckt Isolations-, Erdungs- und Schleifenmessung ab. Die
  // gepflegten Einträge oben setzen die Grenzwerte je Thema genau; für die
  // übrigen Themen bleibt nur der neutrale Werkstoffbezug. Das frühere Tag
  // „wiederholungspruefung" zog den Erdungsgrenzwert 166,7 Ω auch in
  // Isolationsaufgaben – fachlich falsch und der Grund, warum dort keine
  // Aufgabe durch die Prüfung kam.
  'ka-messen': ['leitung', 'kupfer'],
  'ka-pruefung': ['abschaltbedingung', 'rcd', 'ausloesestrom'],
  'ka-verlegung': ['leitung', 'kupfer', 'rho'],
  'ka-plaene': ['spannung', 'tn-system', 'drehstrom'],
  'fsa-verfahren': ['wiederholungspruefung', 'isolation', 'erdung'],
  'fsa-schutzbewertung': ['abschaltbedingung', 'rcd', 'ausloesestrom'],
};

/**
 * Grundfakten für Themen ohne eigene Zahlen: Bemessungsspannungen und
 * Kleinspannungsgrenzen. Sie sind fachlich so allgemein, dass sie in fast
 * jede Begriffsfrage als Zahlenbezug hineinpassen – und das Modell braucht
 * eine konkrete Auswahlliste, sonst erfindet es IDs (F001, F002 …).
 */
const GRUNDFAKTEN = [
  'u0-230',
  'u0-400',
  'u0-24',
  'u0-50',
  'idn-personenschutz',
];

/** Fakten-IDs, die die KI für ein Thema verwenden darf. */
function faktenFuerAtom(atom: Atom): string[] {
  const gepflegt = GEPFLEGTE_BESPRECHUNGEN[atom.id];
  if (gepflegt) return gepflegt.fakten.filter((id) => holeFakt(id) !== undefined);

  const tags = new Set<string>();
  const kapitelPraefix = atom.kapitelId.split('-').slice(0, 2).join('-');
  for (const [praefix, kapitelTags] of Object.entries(KAPITEL_TAG_HINWEISE)) {
    if (kapitelPraefix.startsWith(praefix)) {
      for (const t of kapitelTags) tags.add(t);
    }
  }
  const ids: string[] = [];
  for (const f of FAKTEN) {
    if (f.tags.some((t) => tags.has(t))) ids.push(f.id);
  }
  // Nie leer zurückgeben: Ohne konkrete Auswahlliste erfindet das Modell
  // Fakten-IDs, und jede so gebaute Aufgabe würde an der Faktenbindung
  // scheitern.
  return ids.length > 0 ? ids : [...GRUNDFAKTEN];
}

/** Besprechung für ein Atom: gepflegt oder automatisch aus Lernziel gebaut. */
function besprechungFuer(atom: Atom): string {
  const gepflegt = GEPFLEGTE_BESPRECHUNGEN[atom.id];
  if (gepflegt) return gepflegt.besprechung;

  const kapitel = KAPITEL.find((k) => k.id === atom.kapitelId);
  return (
    `${atom.lernziel} ` +
    `Das Thema gehört zum Prüfungsbereich ${atom.bereich} (Kapitel „${kapitel?.titel ?? atom.kapitelId}“). ` +
    `Prüfungsgewicht ${atom.gewicht}/3. ` +
    'Verwende ausschließlich die gelisteten Fakten; für Begriffe ohne Fakt gilt Fachsprache ohne Zahlen.'
  );
}

/** Prüfungsnahe Fragestellungen zu einem Atom. */
function typischeFragenFuer(atom: Atom): string[] {
  const gepflegt = GEPFLEGTE_BESPRECHUNGEN[atom.id];
  if (gepflegt) return gepflegt.typischeFragen;
  return [
    `Prüfe ${atom.titel} prüfungsnahe ab: ${atom.lernziel}`,
    `Prüfe eine typische Fehlervorstellung zu ${atom.titel} ab.`,
  ];
}

/** Ein Eintrag je Lernpfad-Thema. */
export function lagerEintraege(): LagerEintrag[] {
  return ATOME.map((atom) => ({
    atom,
    besprechung: besprechungFuer(atom),
    typischeFragen: typischeFragenFuer(atom),
    faktenIds: faktenFuerAtom(atom),
  }));
}

/** Eintrag zu einer Themen-ID – oder null, wenn das Thema unbekannt ist. */
export function lagerEintrag(topicId: string): LagerEintrag | null {
  const atom = ATOME.find((a) => a.id === topicId);
  if (!atom) return null;
  return {
    atom,
    besprechung: besprechungFuer(atom),
    typischeFragen: typischeFragenFuer(atom),
    faktenIds: faktenFuerAtom(atom),
  };
}

/** Kennzahlen des Lagers für den Bericht. */
export function lagerKennzahlen(): { themen: number; gepflegt: number; fakten: number } {
  return {
    themen: ATOME.length,
    gepflegt: Object.keys(GEPFLEGTE_BESPRECHUNGEN).length,
    fakten: FAKTEN.length,
  };
}
