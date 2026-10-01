import type { FactRef, Task, TaskOption, TaskProposal } from '../domain/types.ts';
import type { Atom } from '../content/curriculum/types.ts';
import type { Rezept } from '../domain/aufgaben.ts';
import { holeFakt } from '../content/facts/index.ts';
import { lagerEintrag } from '../content/lernlager.ts';
import { relevanteFakten } from '../content/faktenrelevanz.ts';
import {
  falscheAntworten,
} from './distraktoren.ts';
import {
  formatiereWert,
  rechne,
  rezeptWerte,
  RezeptFehler,
  type AufgeloesteRechnung,
} from './resolve.ts';
import { istMasseinheit, wissensFragenFuerAtom } from './fragen.ts';
import { prozessAufgabenFuerAtom } from './wissen-prozess.ts';
import { baueTask, parameterHash, type TaskBausatz } from '../validation/pipeline.ts';
import { lies, schreib } from '../ui/persistenz.ts';

/**
 * Grundbestand an Aufgaben.
 *
 * Er entsteht vollständig aus der Faktenbasis und der Rechen-Engine – ohne
 * Netz, ohne Schlüssel, in Millisekunden. Weil die Engine rechnet, ist jede
 * Zahl belegt: dieselbe Validierungspipeline läuft auch hier, und nur was sie
 * besteht, wird übernommen.
 */

/**
 * Gedächtnis der bereits gebauten Fragetexte.
 *
 * Warum es das braucht: Die Faktenbasis hat nur rund zwei Dutzend Zahlenwerte,
 * die sich als Einzelwert abfragen lassen. Dieselbe Frage („Welchen Wert nennt
 * die Faktenbasis für U₀?") entsteht deshalb in jedem Themenfenster erneut –
 * gemessen: 1 135 Aufgaben, aber nur 78 verschiedene Fragetexte. Für den
 * Lernenden sah das aus wie „immer die gleichen Fragen".
 *
 * Dieses Gedächtnis hält fest, welche Fragetexte schon gebaut wurden. Ein
 * Text, der schon dran war, wird nicht erneut gebaut – solange, bis der
 * Vorrat ihn nicht mehr hergibt. Dann wird das Gedächtnis geleert und die
 * Runde beginnt von vorn. So wiederholt sich nichts, bis der Stoff
 * durchgearbeitet ist.
 */
const TEXT_SPEICHER = 'seed-texte';

interface TextGedaechtnis {
  texte: string[];
  runden: number;
}

function ladeGedaechtnis(): TextGedaechtnis {
  const roh = lies<TextGedaechtnis>(TEXT_SPEICHER);
  if (!roh || !Array.isArray(roh.texte)) return { texte: [], runden: 0 };
  return { texte: roh.texte, runden: Number.isInteger(roh.runden) ? roh.runden : 0 };
}

/** Alle Fragetexte, die in dieser Runde schon gebaut wurden. */
export function bekannteSeedTexte(): Set<string> {
  return new Set(ladeGedaechtnis().texte);
}

/** Merkt Fragetexte als gebaut. */
export function merkeSeedTexte(texte: string[]): void {
  if (texte.length === 0) return;
  const gedaechtnis = ladeGedaechtnis();
  for (const t of texte) if (!gedaechtnis.texte.includes(t)) gedaechtnis.texte.push(t);
  schreib(TEXT_SPEICHER, gedaechtnis);
}

/**
 * Beginnt eine neue Runde, wenn alles dran war.
 *
 * Aufgerufen, wenn ein Fenster nichts Neues mehr hergibt: Das Gedächtnis wird
 * geleert, damit derselbe Stoff erneut gestellt werden kann. `runden` zählt
 * mit – eine Kennzahl für die Anzeige.
 */
export function neueSeedRunde(): void {
  const gedaechtnis = ladeGedaechtnis();
  schreib(TEXT_SPEICHER, { texte: [], runden: gedaechtnis.runden + 1 });
}

/** Wie oft der Stoff schon komplett durchgearbeitet wurde. */
export function seedRunde(): number {
  return ladeGedaechtnis().runden;
}

interface SeedSpec {
  prompt: string;
  rezept: Rezept;
  factRefs: FactRef[];
  learningGoal: string;
  hint?: string;
  stufe?: 1 | 2 | 3 | 4;
}

/** Mischt drei Optionen so, dass die richtige nicht immer vorne steht. */
function baueOptionen(richtig: string, falsch: string[]): {
  optionen: TaskOption[];
  korrekt: string;
  falschIds: string[];
} {
  const kennungen = ['a', 'b', 'c'];
  const position = Math.floor(Math.random() * kennungen.length);
  const falschIds: string[] = [];
  let naechste = 0;
  const optionen: TaskOption[] = kennungen.map((id, i) => {
    if (i === position) return { id, text: richtig };
    falschIds.push(id);
    return { id, text: falsch[naechste++] ?? '' };
  });
  return { optionen, korrekt: kennungen[position]!, falschIds };
}

/** Baut aus einem Rezept eine fertige, geprüfte Aufgabe. Wirft bei Problemen. */
function baueSeedTask(atom: Atom, spec: SeedSpec): Task {
  const ergebnis: AufgeloesteRechnung = rechne(spec.rezept);
  const richtig = formatiereWert(ergebnis.wert, ergebnis.einheit);

  const falsche = falscheAntworten(spec.rezept, ergebnis.wert, ergebnis.einheit);
  if (falsche.length < 2) {
    throw new Error(`Für ${atom.id} ließen sich keine zwei Distraktoren bilden.`);
  }

  const { optionen, korrekt, falschIds } = baueOptionen(
    richtig,
    falsche.map((f) => f.text),
  );

  const proposal: TaskProposal = {
    proposalId: `seed_${atom.id}_${parameterHash([spec.prompt, spec.rezept])}`,
    format: 'mc',
    stufe: spec.stufe ?? (spec.rezept.art === 'faktenwert' ? 1 : 4),
    estimatedSeconds: spec.rezept.art === 'faktenwert' ? 25 : 180,
    examArea: atom.bereich,
    topicIds: [atom.id],
    prompt: spec.prompt,
    options: optionen,
    factRefs: spec.factRefs,
    learningGoal: spec.learningGoal,
    hint: spec.hint,
    berechnung: spec.rezept,
    origin: 'statisch',
  };

  // Die Begründung jeder falschen Option nennt den Denkfehler, der zu ihr
  // führt – nicht den Rechenweg. Genau das braucht der Prüfling: die Regel,
  // die er falsch angewandt hat.
  const grundNachText = new Map(falsche.map((f) => [f.text, f.grund]));
  const rationale: Record<string, string> = { [korrekt]: ergebnis.steps.at(-1)?.result ?? richtig };
  for (const id of falschIds) {
    const text = optionen.find((o) => o.id === id)?.text ?? '';
    rationale[id] = grundNachText.get(text) ?? 'Dieser Wert passt nicht zum Rechenergebnis.';
  }

  const bausatz: TaskBausatz = {
    proposal,
    paramsHash: parameterHash(['seed', atom.id, spec.prompt, JSON.stringify(spec.rezept)]),
    correctOptionId: korrekt,
    optionRationale: rationale,
    solutionSteps: ergebnis.steps,
    explanation: ergebnis.steps.at(-1)?.result ?? richtig,
    // Feste Aufgaben unterliegen nicht der Duplikatsperre: sie werden bei
    // jeder Sitzung neu gebaut und sollen sich wiederholen lassen.
    validierungsOptionen: {
      duplikatPruefen: false,
      rezeptWerte: rezeptWerte(spec.rezept),
    },
  };

  return baueTask(bausatz);
}

// ---------------------------------------------------------------------------
// Rezept-Varianten je Aufgabentyp
// ---------------------------------------------------------------------------

const QUERSCHNITTE = [1.5, 2.5, 4, 6, 10, 16, 25, 35];
const VERLEGEARTEN = ['A1', 'A2', 'B1', 'B2', 'C', 'D', 'E', 'F'];
const COS_PHI = [1, 0.95, 0.9, 0.85, 0.8];

function strombelastbarkeitVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const q of QUERSCHNITTE) {
    for (const weg of ['referenz-iz', 'schultabelle'] as const) {
      const quelle = weg === 'referenz-iz' ? 'iz-tabelle-verlegeart-c' : 'absicherung-schultabelle';
      specs.push({
        prompt:
          `Welchen Strom darf eine Leitung mit ${String(q).replace('.', ',')} mm² Cu ` +
          `bei 30 °C dauerhaft führen (${weg === 'referenz-iz' ? 'Verlegeart C' : 'Schultabelle'})?`,
        rezept: { art: 'strombelastbarkeit', querschnittMm2: q, weg },
        factRefs: [{ factId: quelle }, { factId: 'iz-temperatur-bezug' }],
        learningGoal: 'Strombelastbarkeit dem Querschnitt zuordnen und beide Rechenwege trennen.',
        hint: 'Referenzwert und Schulwert sind zwei verschiedene Tabellen – nicht mischen.',
      });
    }
  }
  return specs;
}

/** Strombelastbarkeit nach Verlegeart – die häufigste Tabellenfrage der Prüfung. */
function strombelastbarkeitVerlegeartVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const art of VERLEGEARTEN) {
    for (const q of [1.5, 2.5, 4, 6, 10, 16, 25]) {
      specs.push({
        prompt:
          `Welchen Strom darf eine Leitung ${String(q).replace('.', ',')} mm² Cu in ` +
          `Verlegeart ${art} bei 30 °C führen?`,
        rezept: { art: 'strombelastbarkeit-korrigiert', querschnittMm2: q, verlegeart: art },
        factRefs: [{ factId: `iz-verlegeart-${art.toLowerCase()}` }],
        learningGoal: 'Strombelastbarkeit nach Verlegeart aus der Tabelle ablesen.',
        hint: 'Verlegeart und Querschnitt bestimmen den Zeilen- und Spaltenwert.',
      });
    }
  }
  return specs;
}

/** Strombelastbarkeit mit Häufung – mehrere Stromkreise in einem Bündel. */
function haeufungVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const n of [2, 3, 4, 5, 6, 9]) {
    for (const q of [1.5, 2.5, 4, 6, 10]) {
      specs.push({
        prompt:
          `Fünf Leitungen 2,5 mm² liegen gebündelt – welchen Strom darf eine Leitung ` +
          `bei ${n} belasteten Stromkreisen führen?`.replace('2,5', String(q).replace('.', ',')).replace('Fünf', `${n}`),
        rezept: {
          art: 'strombelastbarkeit-korrigiert',
          querschnittMm2: q,
          verlegeart: 'C',
          stromkreise: n,
        },
        factRefs: [{ factId: 'iz-verlegeart-c' }, { factId: 'haeufungsfaktoren' }],
        learningGoal: 'Häufungsfaktor ansetzen, wenn mehrere Stromkreise gebündelt liegen.',
        hint: 'Grundwert aus der Tabelle, dann mit dem Häufungsfaktor multiplizieren.',
      });
    }
  }
  return specs;
}

/** Strombelastbarkeit mit erhöhter Umgebungstemperatur. */
function temperaturVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const c of [35, 40, 45, 50, 55]) {
    for (const q of [1.5, 2.5, 4, 6, 10]) {
      specs.push({
        prompt:
          `Welchen Strom darf eine Leitung ${String(q).replace('.', ',')} mm² Cu ` +
          `in Verlegeart C bei ${c} °C Umgebungstemperatur führen?`,
        rezept: { art: 'strombelastbarkeit-korrigiert', querschnittMm2: q, verlegeart: 'C', temperaturC: c },
        factRefs: [{ factId: 'iz-verlegeart-c' }, { factId: 'temperaturfaktor-pvc' }],
        learningGoal: 'Temperaturfaktor ansetzen und die Strombelastbarkeit korrigieren.',
        hint: 'Bezugstemperatur ist 30 °C; darüber wird reduziert.',
      });
    }
  }
  return specs;
}

function abschaltbedingungVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  const spannungen = [
    { id: 'u0-230', wert: 230 },
    { id: 'u0-400', wert: 400 },
    { id: 'u0-50', wert: 50 },
    { id: 'u0-24', wert: 24 },
  ];
  const stroeme = [
    { id: 'idn-feuchteraum', a: 0.3 },
    { id: 'idn-personenschutz', a: 0.03 },
    { id: 'idn-baustelle-30ma', a: 0.03 },
    { id: 'rcd-typ-a', a: 0.3 },
  ];
  for (const u of spannungen) {
    for (const i of stroeme) {
      specs.push({
        prompt:
          `Wie groß darf der Erdungswiderstand R_A höchstens sein, wenn ` +
          `U₀ = ${u.wert} V und I_Δn = ${i.a * 1000} mA betragen?`,
        rezept: { art: 'abschaltbedingung', u0FactId: u.id, idnFactId: i.id },
        factRefs: [
          { factId: u.id, value: u.wert },
          { factId: i.id, value: i.a },
          { factId: 'formel-abschaltbedingung' },
        ],
        learningGoal: 'Abschaltbedingung R_A ≤ U₀ / I_Δn sicher anwenden.',
        hint: 'Erst den Fehlerstrom in Ampere umrechnen, dann teilen.',
      });
    }
  }
  return specs;
}

function schleifenwiderstandVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const u of [
    { id: 'u0-230', wert: 230 },
    { id: 'u0-400', wert: 400 },
  ]) {
    for (const inA of [10, 13, 16, 20, 25, 32, 40, 50, 63]) {
      for (const k of ['B', 'C', 'D'] as const) {
        specs.push({
          prompt:
            `Welcher Schleifenwiderstand R_L ist bei I_n = ${inA} A, Kennlinie ${k} ` +
            `und U₀ = ${u.wert} V höchstens zulässig?`,
          rezept: { art: 'schleifenwiderstand', u0FactId: u.id, inA, kennlinie: k },
          factRefs: [
            { factId: u.id, value: u.wert },
            { factId: `ls-kennlinie-${k.toLowerCase()}-magnetisch-min` },
            { factId: 'formel-schleifenwiderstand' },
          ],
          learningGoal: 'Grenzschleifenwiderstand aus U₀, Nennstrom und Kennlinie bestimmen.',
          hint: 'Maßgeblich ist die untere magnetische Grenze der Kennlinie.',
        });
      }
    }
  }
  return specs;
}

function stromEinphasigVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const leistung of [500, 750, 1000, 1500, 2000, 2300, 2500, 3000, 3500, 4000]) {
    for (const cos of COS_PHI) {
      specs.push({
        prompt:
          `Welchen Betriebsstrom nimmt ein Verbraucher mit ${leistung} W an 230 V auf ` +
          `(cos φ = ${String(cos).replace('.', ',')})?`,
        rezept: { art: 'strom-einphasig', u0FactId: 'u0-230', leistungW: leistung, cosPhi: cos },
        factRefs: [
          { factId: 'u0-230', value: 230 },
          { factId: 'formel-strom-einphasig' },
        ],
        learningGoal: 'Betriebsstrom aus Leistung und Spannung berechnen.',
        hint: 'I = P / (U · cos φ).',
      });
    }
  }
  return specs;
}

function stromDrehstromVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const leistung of [3000, 5000, 7500, 9000, 11000, 15000, 18500, 22000]) {
    for (const cos of COS_PHI) {
      specs.push({
        prompt:
          `Welchen Außenleiterstrom nimmt ein Verbraucher mit ${leistung} W im ` +
          `Drehstromnetz auf (U = 400 V, cos φ = ${String(cos).replace('.', ',')})?`,
        rezept: { art: 'strom-drehstrom', u0FactId: 'u0-400', leistungW: leistung, cosPhi: cos },
        factRefs: [
          { factId: 'u0-400', value: 400 },
          { factId: 'formel-strom-drehstrom' },
        ],
        learningGoal: 'Außenleiterstrom im Drehstromnetz berechnen.',
        hint: 'I = P / (√3 · U · cos φ).',
      });
    }
  }
  return specs;
}

function spannungsfallVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const laenge of [10, 15, 20, 25, 35, 50, 70]) {
    for (const strom of [6, 10, 13, 16, 20, 25, 32]) {
      for (const q of [1.5, 2.5, 4, 6]) {
        specs.push({
          prompt:
            `Wie groß ist der Spannungsfall auf einer ${laenge} m langen Leitung ` +
            `(${String(q).replace('.', ',')} mm² Cu) bei ${strom} A?`,
          rezept: { art: 'spannungsfall', laengeM: laenge, stromA: strom, querschnittMm2: q },
          factRefs: [{ factId: 'formel-spannungsfall-einphasig' }],
          learningGoal: 'Spannungsfall über Länge, Strom und Querschnitt berechnen.',
          hint: 'ΔU = 2 · ρ · l · I / A mit ρ = 0,018 Ω·mm²/m.',
        });
      }
    }
  }
  return specs;
}

/** Spannungsfall im Drehstromkreis – ohne den Faktor 2. */
function spannungsfallDrehstromVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const laenge of [20, 30, 50, 80, 120]) {
    for (const strom of [10, 16, 25, 32, 40]) {
      for (const q of [2.5, 4, 6, 10]) {
        specs.push({
          prompt:
            `Wie groß ist der Spannungsfall auf einer ${laenge} m langen Drehstromleitung ` +
            `(${String(q).replace('.', ',')} mm² Cu) bei ${strom} A je Außenleiter?`,
          rezept: {
            art: 'spannungsfall-drehstrom',
            laengeM: laenge,
            stromA: strom,
            querschnittMm2: q,
            u0FactId: 'u0-400',
          },
          factRefs: [{ factId: 'formel-spannungsfall-einphasig' }, { factId: 'u0-400', value: 400 }],
          learningGoal: 'Spannungsfall im Drehstromkreis berechnen – ohne doppelten Weg.',
          hint: 'Im Drehstrom verteilt sich der Strom auf drei Leiter.',
        });
      }
    }
  }
  return specs;
}

/** Querschnitt aus dem zulässigen Spannungsfall – die Umkehrung. */
function querschnittVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const leistung of [2000, 3500, 5000, 7000, 11000]) {
    for (const laenge of [20, 35, 50, 80]) {
      specs.push({
        prompt:
          `Welcher Querschnitt ist für eine ${laenge} m lange Leitung zu einem ` +
          `Verbraucher mit ${leistung} W an 230 V nötig, wenn der Spannungsfall ` +
          `höchstens 3 % betragen darf?`,
        rezept: {
          art: 'querschnitt-spannungsfall',
          leistungW: leistung,
          laengeM: laenge,
          u0FactId: 'u0-230',
          grenzProzent: 3,
        },
        factRefs: [{ factId: 'u0-230', value: 230 }, { factId: 'nennquerschnitte' }],
        learningGoal: 'Querschnitt aus dem zulässigen Spannungsfall bestimmen und aufrunden.',
        hint: 'Erst rechnen, dann auf den nächsten genormten Querschnitt aufrunden.',
      });
    }
  }
  return specs;
}

/** Auswahl der Absicherung zum Querschnitt und Betriebsstrom. */
function absicherungVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const strom of [10, 13, 16, 20, 25, 32]) {
    for (const q of [1.5, 2.5, 4, 6, 10]) {
      specs.push({
        prompt:
          `Welche Absicherung ist für einen Betriebsstrom von ${strom} A bei ` +
          `einer Leitung ${String(q).replace('.', ',')} mm² Cu in Verlegeart C zulässig?`,
        rezept: { art: 'absicherung-waehlen', stromA: strom, querschnittMm2: q, verlegeart: 'C' },
        factRefs: [{ factId: 'iz-verlegeart-c' }, { factId: 'absicherung-schultabelle' }],
        learningGoal: 'Absicherung nach I_b ≤ I_n ≤ I_z und 1,45 · I_n ≤ I_z festlegen.',
        hint: 'Die Absicherung trägt den Betriebsstrom und überlastet die Leitung nicht.',
      });
    }
  }
  return specs;
}

/** Leistung aus Strom und Spannung. */
function leistungVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const strom of [6, 10, 16, 20, 25, 32, 40]) {
    for (const cos of [1, 0.9, 0.85]) {
      specs.push({
        prompt:
          `Welche Wirkleistung nimmt ein Drehstromverbraucher mit ${strom} A je ` +
          `Außenleiter auf (U = 400 V, cos φ = ${String(cos).replace('.', ',')})?`,
        rezept: { art: 'leistung-drehstrom', u0FactId: 'u0-400', stromA: strom, cosPhi: cos },
        factRefs: [{ factId: 'u0-400', value: 400 }, { factId: 'drehstrom-verketttung' }],
        learningGoal: 'Wirkleistung im Drehstromnetz aus dem Außenleiterstrom berechnen.',
        hint: 'P = √3 · U · I · cos φ.',
      });
    }
  }
  return specs;
}

/** Scheinleistung und Blindleistung. */
function scheinleistungVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const strom of [10, 16, 25, 32]) {
    for (const cos of [0.8, 0.85, 0.9]) {
      specs.push({
        prompt:
          `Welche Scheinleistung nimmt ein Drehstromverbraucher mit ${strom} A je ` +
          `Außenleiter auf (U = 400 V)?`,
        rezept: { art: 'scheinleistung', u0FactId: 'u0-400', stromA: strom, drehstrom: true },
        factRefs: [{ factId: 'u0-400', value: 400 }, { factId: 'drehstrom-verketttung' }],
        learningGoal: 'Scheinleistung aus Spannung und Strom berechnen.',
        hint: 'S = √3 · U · I.',
      });
      const schein = Math.sqrt(3) * 400 * strom;
      specs.push({
        prompt:
          `Ein Verbraucher nimmt bei 400 V und ${strom} A je Außenleiter eine ` +
          `Scheinleistung von ${Math.round(schein)} VA auf. Wie groß ist die Blindleistung ` +
          `bei cos φ = ${String(cos).replace('.', ',')}?`,
        rezept: { art: 'blindleistung', wert: Math.round(schein), cosPhi: cos },
        factRefs: [{ factId: 'cosphi-bedeutung' }],
        learningGoal: 'Blindleistung aus Scheinleistung und Leistungsfaktor berechnen.',
        hint: 'Q = S · sin φ.',
      });
    }
  }
  return specs;
}

/** Leistungsfaktor aus Wirk- und Scheinleistung. */
function leistungsfaktorVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const s of [5000, 10000, 15000, 20000]) {
    for (const p of [4000, 8000, 9000, 15000, 17000]) {
      if (p >= s) continue;
      specs.push({
        prompt:
          `Ein Verbraucher nimmt ${p} W Wirkleistung und ${s} VA Scheinleistung auf. ` +
          `Wie groß ist der Leistungsfaktor?`,
        rezept: { art: 'leistungsfaktor', wert: p, bezug: s },
        factRefs: [{ factId: 'cosphi-bedeutung' }],
        learningGoal: 'Leistungsfaktor als Verhältnis von Wirk- zu Scheinleistung bestimmen.',
        hint: 'cos φ = P / S.',
      });
    }
  }
  return specs;
}

/** Leiterwiderstand und Temperaturkorrektur. */
function widerstandVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const laenge of [10, 20, 35, 50, 80]) {
    for (const q of [1.5, 2.5, 4, 6, 10]) {
      specs.push({
        prompt:
          `Wie groß ist der Widerstand einer ${laenge} m langen Kupferleitung ` +
          `${String(q).replace('.', ',')} mm²?`,
        rezept: { art: 'widerstand-leiter', laengeM: laenge, querschnittMm2: q },
        factRefs: [{ factId: 'rho-kupfer' }, { factId: 'kupfer-leitfaehigkeit' }],
        learningGoal: 'Leiterwiderstand aus Länge und Querschnitt berechnen.',
        hint: 'R = ρ · l / A mit ρ = 0,018 Ω·mm²/m.',
      });
    }
  }
  for (const r of [0.5, 1, 1.5, 2]) {
    for (const c of [50, 60, 70]) {
      specs.push({
        prompt:
          `Ein Leiter hat bei 20 °C einen Widerstand von ${String(r).replace('.', ',')} Ω. ` +
          `Wie groß ist er bei ${c} °C (Kupfer)?`,
        rezept: { art: 'widerstand-temperatur', widerstand20: r, temperaturC: c },
        factRefs: [{ factId: 'alpha-kupfer' }],
        learningGoal: 'Temperaturabhängigkeit des Widerstands anwenden.',
        hint: 'R(θ) = R₂₀ · (1 + α · (θ − 20 °C)) mit α = 0,00393 1/K.',
      });
    }
  }
  return specs;
}

/** Energie, Kosten und Amortisation. */
function energieVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const leistung of [1000, 2000, 2500, 3500, 5000, 11000]) {
    for (const stunden of [2, 4, 8, 12]) {
      specs.push({
        prompt:
          `Wie viel elektrische Arbeit verbraucht ein Verbraucher mit ${leistung} W ` +
          `in ${stunden} Stunden?`,
        rezept: { art: 'energiearbeit', leistungW: leistung, stunden },
        factRefs: [{ factId: 'arbeit-formel' }],
        learningGoal: 'Elektrische Arbeit aus Leistung und Dauer berechnen.',
        hint: 'W = P · t, Leistung in Kilowatt einsetzen.',
      });
    }
  }
  for (const kwh of [5, 10, 20, 50, 100]) {
    for (const ct of [30, 35, 40]) {
      specs.push({
        prompt:
          `Wie hoch sind die Stromkosten für ${kwh} kWh bei einem Arbeitspreis von ` +
          `${ct} ct/kWh?`,
        rezept: { art: 'stromkosten', kWh: kwh, centProKwh: ct },
        factRefs: [{ factId: 'arbeit-formel' }],
        learningGoal: 'Stromkosten aus Arbeit und Arbeitspreis berechnen.',
        hint: 'Erst in Euro umrechnen: Cent geteilt durch 100.',
      });
    }
  }
  for (const inv of [2000, 5000, 12000, 20000]) {
    for (const sp of [200, 400, 800, 1500]) {
      specs.push({
        prompt:
          `Eine Investition von ${inv} € spart jährlich ${sp} € ein. ` +
          `Nach wie vielen Jahren ist sie amortisiert?`,
        rezept: { art: 'amortisation', investitionEuro: inv, jahresersparnisEuro: sp },
        factRefs: [{ factId: 'amortisation' }],
        learningGoal: 'Amortisationszeit einer Investition berechnen.',
        hint: 'Investition geteilt durch jährliche Einsparung.',
      });
    }
  }
  return specs;
}

/** Wärmepumpe und Photovoltaik. */
function gebaeudetechnikVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const heizlast of [6, 8, 10, 12]) {
    for (const jaz of [3, 3.5, 4, 4.5]) {
      specs.push({
        prompt:
          `Eine Wärmepumpe deckt eine Heizlast von ${heizlast} kW bei ` +
          `1800 Vollbenutzungsstunden. Wie viel Strom braucht sie bei einer ` +
          `Jahresarbeitszahl von ${String(jaz).replace('.', ',')}?`,
        rezept: { art: 'waermepumpe-strombedarf', heizlastKW: heizlast, vollbenutzungsstunden: 1800, jaz },
        factRefs: [{ factId: 'waermepumpe-jaz-luft' }, { factId: 'waermepumpe-heizlast' }],
        learningGoal: 'Strombedarf einer Wärmepumpe über die Jahresarbeitszahl abschätzen.',
        hint: 'Erst den Wärmebedarf, dann durch die JAZ teilen.',
      });
    }
  }
  for (const kwp of [4, 6, 8, 10, 12]) {
    for (const ertrag of [900, 950, 1000, 1050]) {
      specs.push({
        prompt:
          `Welchen Jahresertrag liefert eine Photovoltaikanlage mit ${kwp} kWp ` +
          `bei einem spezifischen Ertrag von ${ertrag} kWh/kWp?`,
        rezept: { art: 'pv-ertrag', leistungKWp: kwp, ertragProKWp: ertrag },
        factRefs: [{ factId: 'pv-modulwirkungsgrad' }],
        learningGoal: 'Jahresertrag einer PV-Anlage abschätzen.',
        hint: 'Nennleistung mal spezifischer Ertrag.',
      });
    }
  }
  return specs;
}

/** Motorbemessungsstrom. */
function motorVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const kw of [0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5]) {
    for (const cos of [0.8, 0.85, 0.9]) {
      specs.push({
        prompt:
          `Welchen Bemessungsstrom nimmt ein Drehstrommotor mit ${String(kw).replace('.', ',')} kW ` +
          `bei 400 V auf (cos φ = ${String(cos).replace('.', ',')}, η = 0,9)?`,
        rezept: { art: 'motorstrom', u0FactId: 'u0-400', leistungKW: kw, cosPhi: cos, wirkungsgrad: 0.9 },
        factRefs: [{ factId: 'u0-400', value: 400 }, { factId: 'drehstrom-verketttung' }],
        learningGoal: 'Bemessungsstrom eines Motors mit Wirkungsgrad berechnen.',
        hint: 'I = P / (√3 · U · cos φ · η).',
      });
    }
  }
  return specs;
}

/** RCD-Strom und Prozentwert. */
function pruefungVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const ma of [10, 30, 100, 300, 500]) {
    specs.push({
      prompt: `Wie viel Ampere sind ${ma} mA Fehlerstrom?`,
      rezept: { art: 'rcd-strom', milliampere: ma },
      factRefs: [{ factId: 'idn-personenschutz', value: 0.03 }],
      learningGoal: 'Fehlerströme sicher zwischen Milliampere und Ampere umrechnen.',
      hint: '1000 mA ergeben 1 A.',
    });
  }
  for (const wert of [12, 15, 18, 24]) {
    for (const bezug of [230, 400]) {
      specs.push({
        prompt: `Wie viel Prozent von ${bezug} V sind ${wert} V?`,
        rezept: { art: 'prozentwert', wert, bezug },
        factRefs: [{ factId: 'u0-230', value: 230 }],
        learningGoal: 'Spannungsabfall und Abweichungen in Prozent ausdrücken.',
        hint: 'p = (Wert / Bezug) · 100.',
      });
    }
  }
  return specs;
}

/** Welche Rezept-Varianten zu welchem Thema gehören. */
const REZEPTE_FUER_ATOM: Record<string, (atom: Atom) => SeedSpec[]> = {
  'ka-verteilung-02': strombelastbarkeitVarianten,
  'ka-verteilung-03': strombelastbarkeitVarianten,
  'ka-verteilung-04': (atom) => [...strombelastbarkeitVarianten(atom), ...absicherungVarianten(atom)],
  'ka-verlegung-02': (atom) => [
    ...strombelastbarkeitVerlegeartVarianten(atom),
    ...haeufungVarianten(atom),
    ...temperaturVarianten(atom),
  ],
  'ka-verlegung-08': haeufungVarianten,
  'ka-messen-06': abschaltbedingungVarianten,
  'ka-messen-07': schleifenwiderstandVarianten,
  'ka-pruefung-04': abschaltbedingungVarianten,
  'ka-pruefung-09': pruefungVarianten,
  'ka-pruefung-10': pruefungVarianten,
  'ka-inbetriebnahme-05': schleifenwiderstandVarianten,
  'fsa-schutzbewertung-02': abschaltbedingungVarianten,
  'fsa-verfahren-05': pruefungVarianten,
  'fsa-schutzbewertung-03': pruefungVarianten,
  'sys-spezifikation-03': (atom) => [
    ...strombelastbarkeitVarianten(atom),
    ...spannungsfallVarianten(atom),
    ...querschnittVarianten(atom),
    ...absicherungVarianten(atom),
  ],
  'sys-schutz-03': schleifenwiderstandVarianten,
  'sys-wirtschaft-01': energieVarianten,
  'sys-wirtschaft-02': energieVarianten,
  'sys-wirtschaft-05': energieVarianten,
  'sys-nachhaltigkeit-01': (atom) => [...gebaeudetechnikVarianten(atom), ...energieVarianten(atom)],
  'sys-nachhaltigkeit-02': (atom) => [...gebaeudetechnikVarianten(atom), ...energieVarianten(atom)],
  'ka-gebaeudetechnik-02': gebaeudetechnikVarianten,
  'ka-gebaeudetechnik-03': gebaeudetechnikVarianten,
  'ka-gebaeudetechnik-04': gebaeudetechnikVarianten,
  'ka-gebaeudetechnik-05': gebaeudetechnikVarianten,
  'ka-gebaeudetechnik-08': (atom) => [
    ...stromDrehstromVarianten(atom),
    ...leistungVarianten(atom),
    ...motorVarianten(atom),
  ],
  'ka-gebaeudetechnik-09': leistungVarianten,
  'ka-gebaeudetechnik-12': energieVarianten,
  't1-anlagen-01': (atom) => [...widerstandVarianten(atom), ...stromEinphasigVarianten(atom)],
  't1-anlagen-03': (atom) => [
    ...stromDrehstromVarianten(atom),
    ...leistungVarianten(atom),
    ...spannungsfallDrehstromVarianten(atom),
  ],
  't1-anlagen-04': (atom) => [
    ...leistungsfaktorVarianten(atom),
    ...scheinleistungVarianten(atom),
    ...blindleistungVarianten(atom),
  ],
};

/** Blindleistung braucht eine Scheinleistung – hier als eigene Variante. */
function blindleistungVarianten(_atom: Atom): SeedSpec[] {
  const specs: SeedSpec[] = [];
  for (const s of [5000, 10000, 15000, 20000, 30000]) {
    for (const cos of [0.8, 0.85, 0.9]) {
      specs.push({
        prompt:
          `Ein Verbraucher nimmt ${s} VA Scheinleistung bei cos φ = ` +
          `${String(cos).replace('.', ',')} auf. Wie groß ist die Blindleistung?`,
        rezept: { art: 'blindleistung', wert: s, cosPhi: cos },
        factRefs: [{ factId: 'cosphi-bedeutung' }],
        learningGoal: 'Blindleistung aus Scheinleistung und Leistungsfaktor berechnen.',
        hint: 'Q = S · sin φ.',
      });
    }
  }
  return specs;
}

/**
 * Aufgaben zu Kennwerten aus der Faktenbasis.
 *
 * Für jedes Thema werden die hinterlegten Fakten mit Zahlenwert abgefragt.
 * Das ist die breiteste Quelle: Sie deckt auch die Norm- und Wissensthemen ab,
 * für die es kein Rezept gibt. Ob eine Frage die Validierung besteht, hängt
 * davon ab, ob ihre Zahlen belegt sind – was durchfällt, wird still verworfen.
 */
/**
 * Die Frageformen für Faktenwerte.
 *
 * Eine Zahl lässt sich auf viele Arten erfragen. Jede Form ist eine eigene
 * Aufgabe – die Antwort bleibt dieselbe, nur der Weg zur Erinnerung ist ein
 * anderer. Sechs Formen mal rund zwei Dutzend Zahlen ergeben genug Stoff, dass
 * sich in einer Lernwoche nichts wiederholt.
 */
const FRAGEFORMEN_LISTE: ((bez: string) => string)[] = [
  (bez) => `Welchen Wert nennt die Faktenbasis für: ${bez}?`,
  (bez) => `Welcher Wert ist für „${bez}" hinterlegt?`,
  (bez) => `Wie lautet der hinterlegte Wert zu „${bez}"?`,
  (bez) => `Welcher Zahlenwert gehört zum Eintrag „${bez}"?`,
  (bez) => `Welchen Wert trägt „${bez}" in der Faktenbasis?`,
  (bez) => `Gesucht ist der Zahlenwert von „${bez}" – welcher ist es?`,
];

const FRAGEFORMEN = FRAGEFORMEN_LISTE.length;

function faktenwertVarianten(atom: Atom, versatz = 0): SeedSpec[] {
  const lager = lagerEintrag(atom.id);
  const ids = lager && lager.faktenIds.length > 0 ? lager.faktenIds : relevanteFakten(atom);
  const specs: SeedSpec[] = [];
  const gesehen = new Set<string>();

  const brauchbar: { id: string; fakt: ReturnType<typeof holeFakt> }[] = [];
  for (const id of ids) {
    if (gesehen.has(id)) continue;
    gesehen.add(id);
    const fakt = holeFakt(id);
    if (!fakt || fakt.wert === undefined) continue;
    if (fakt.wert === 0 && /werttabelle|siehe/i.test(fakt.einheit ?? '')) continue;
    if (id.startsWith('formel-')) continue;
    if (!istMasseinheit(fakt.einheit)) continue;
    brauchbar.push({ id, fakt });
  }

  // Die Frageform wechselt je Fakt und Versatz. Damit entsteht aus einem
  // einzigen Wert mehr als eine Aufgabe, und die Reihenfolge wiederholt sich
  // nicht bei jedem Fenster.
  for (let i = 0; i < brauchbar.length; i += 1) {
    const { id, fakt } = brauchbar[i]!;
    const form = (i + versatz) % FRAGEFORMEN;
    const einheit = (fakt!.einheit ?? '').trim();
    const wertText = `${String(fakt!.wert).replace('.', ',')} ${einheit}`.trim();
    const prompt = FRAGEFORMEN_LISTE[form]!(fakt!.bezeichnung);
    specs.push({
      prompt,
      rezept: { art: 'faktenwert', factId: id },
      factRefs: [{ factId: id, value: fakt!.wert }],
      learningGoal: `${fakt!.bezeichnung} sicher abrufen können.`,
      hint: `Gesucht ist ein Wert in ${einheit || 'der hinterlegten Einheit'}; richtig ist ${wertText}.`,
    });
  }
  return specs;
}

/**
 * Erzeugt alle Aufgaben, die sich für ein Thema bauen lassen.
 *
 * Drei Quellen, in dieser Reihenfolge:
 *   1. Rechenaufgaben zu den Rezepten des Themas (Engine rechnet).
 *   2. Wissensaufgaben aus der Faktenbasis (Wert-, Aussage- und
 *      Zuordnungsfragen, siehe `fragen.ts`).
 *   3. Wertabfragen der zugeordneten Fakten als Rückfall.
 *
 * `versatz` dreht die Frageformen weiter. Ohne ihn begänne jedes Fenster mit
 * derselben Formulierung.
 */
export function seedAufgabenFuerAtom(atom: Atom, versatz = 0): Task[] {
  const varianten = REZEPTE_FUER_ATOM[atom.id];
  const specs: SeedSpec[] = [
    ...(varianten ? varianten(atom) : []),
    ...faktenwertVarianten(atom, versatz),
  ];

  // Mehrere Fakten können denselben Wert tragen – `idn-personenschutz` und
  // `idn-baustelle-30ma` sind beide 0,03 A. Ohne diesen Filter entstünden
  // daraus textgleiche Aufgaben, die der Lernende als Dublette sieht.
  const gesehen = new Set<string>();
  const aufgaben: Task[] = [];
  for (const spec of specs) {
    if (gesehen.has(spec.prompt)) continue;
    try {
      const aufgabe = baueSeedTask(atom, spec);
      gesehen.add(spec.prompt);
      aufgaben.push(aufgabe);
    } catch (fehler) {
      // Eine Variante, die die Validierung nicht besteht, ist kein Fehler:
      // Sie wird übergangen, die übrigen bleiben. Deshalb steht hier bewusst
      // kein Log und kein Wurf.
      void fehler;
    }
  }

  // Die Wissensaufgaben kommen zuletzt und werden gegen die Rechenaufgaben
  // auf doppelte Fragetexte geprüft. Sie sind der breitere Bestand: Aus 224
  // Fakten entstehen über die Themen hinweg mehrere tausend Aufgaben.
  for (const aufgabe of wissensFragenFuerAtom(atom, versatz)) {
    if (gesehen.has(aufgabe.proposal.prompt)) continue;
    gesehen.add(aufgabe.proposal.prompt);
    aufgaben.push(aufgabe);
  }

  // Verfahrensfragen für die handlungsorientierten Themen. Sie decken ab, was
  // die Faktenbasis nicht hergibt: das Vorgehen in der Funktionsanalyse und im
  // Systementwurf.
  for (const aufgabe of prozessAufgabenFuerAtom(atom)) {
    if (gesehen.has(aufgabe.proposal.prompt)) continue;
    gesehen.add(aufgabe.proposal.prompt);
    aufgaben.push(aufgabe);
  }

  return aufgaben;
}

/**
 * Erzeugt den Vorrat für eine Liste von Themen.
 *
 * Zwei Filter halten die Wiederholung fern:
 *
 *  1. **`nurNeue`** – Fragetexte, die in dieser Runde schon dran waren,
 *     entfallen. Das ist der eigentliche Hebel: Ohne ihn entstünde dieselbe
 *     Faktenfrage in jedem Fenster erneut.
 *  2. **Verschiedene Themen, gleicher Fragetext** – „Welchen Wert nennt die
 *     Faktenbasis für U₀?" ist für jedes der 169 Themen dieselbe Frage. Sie
 *     wird nur einmal gebaut, beim ersten passenden Thema.
 *
 * Gibt ein Thema dadurch nichts mehr her, bleibt es einfach leer; der
 * Aufrufer merkt das und beginnt eine neue Runde.
 */
/**
 * Baut die Seed-Aufgaben eines Themas, die noch nicht gestellt wurden.
 *
 * Reine Funktion ohne Speicherzugriff: Der Aufrufer bestimmt, was als
 * gestellt gilt und was behalten wird. Das ist nötig, weil nur der Aufrufer
 * weiß, wie viel Platz er hat – und ein Fragetext, der nie gezeigt wird,
 * darf auch nicht als verbraucht gelten.
 */
export function seedAufgabenFuerAtomNeu(
  atom: Atom,
  bekannt: Set<string>,
  runde: number,
): Task[] {
  const versatz = (atom.id.length + runde * 2) % FRAGEFORMEN;
  const raus: Task[] = [];
  for (const aufgabe of seedAufgabenFuerAtom(atom, versatz)) {
    if (!bekannt.has(aufgabe.proposal.prompt)) raus.push(aufgabe);
  }
  return raus;
}

/** Erzeugt den Vorrat für eine Liste von Themen – ohne Gedächtnis. */
export function seedAufgabenFuerAtome(atome: Atom[]): Task[] {
  // Ein Faktenwert wird nur beim ersten Thema gestellt, das ihn trägt.
  // „Welchen Wert nennt die Norm für U₀?" ist für jedes der Normthemen
  // dieselbe Frage; sie 28-mal zu bauen, bläht nur die Zählung auf. Genau
  // diesen Filter wendet der Vorrat über sein Textgedächtnis ebenfalls an –
  // hier gilt er zusätzlich für die Gesamtausgabe.
  const gesehen = new Set<string>();
  const alle: Task[] = [];
  for (const atom of atome) {
    for (const aufgabe of seedAufgabenFuerAtom(atom)) {
      if (gesehen.has(aufgabe.proposal.prompt)) continue;
      gesehen.add(aufgabe.proposal.prompt);
      alle.push(aufgabe);
    }
  }
  return alle;
}

export { RezeptFehler };
