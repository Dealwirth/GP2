/**
 * Animierte Laborstationen.
 *
 * Der Kern jeder Station ist ein kleiner deterministeter Zustandsautomat.
 * Er reagiert auf Aktionen des Nutzers und berechnet aus der Faktenbasis, was
 * passiert. Es gibt keine Zufallswerte und keine Animation als Selbstzweck –
 * jede Bewegung zeigt einen elektrischen Zusammenhang.
 *
 * Die Stationen sind bewusst so gebaut, dass sie auf dem Telefon funktionieren:
 * wenige Zustände, große Schaltflächen, sofortiges Feedback.
 */

import { abschaltbedingung, kleinsterAusloesestrom, strombelastbarkeit } from '../engine/calc/index.ts';
import type { Kennlinie, Rechenweg } from '../engine/calc/index.ts';
import { holeFakt } from '../content/facts/index.ts';

export type StationsId = 'fi' | 'ls' | 'trafo' | 'verlegeart';

export interface StationDef {
  id: StationsId;
  titel: string;
  kurz: string;
  /** Was der Nutzer hier übt. */
  lernziel: string;
  /** Prüfungsbezug. */
  pruefungsbezug: string;
  startZustand: StationsZustand;
  /** Erlaubte Aktionen. */
  aktionen: Aktion[];
}

/**
 * Aktionen der Station.
 *
 * Bewusst als echte Summentypen: nur Aktionen ohne Parameter (Fi auslösen)
 * haben auch keine Parameter-Felder. So kann der Compiler keine Aktion
 * erfinden, die es nicht gibt.
 */
export type Aktion =
  | { art: 'lastAendern'; nach: number }
  | { art: 'querschnittAendern'; nach: number }
  | { art: 'kennlinieAendern'; nach: Kennlinie }
  | { art: 'absicherungAendern'; nach: number }
  | { art: 'lastspannungAendern'; nach: number }
  | { art: 'verlegeartAendern'; nach: string }
  | { art: 'waehlerWechseln'; nach: 'last' | 'fi' }
  | { art: 'fehlerstromAendern'; nachMa: number }
  | { art: 'fiAusloesen' }
  | { art: 'neutralleiterTrennen' }
  | { art: 'sekundaerAbschalten' };

export interface StationsZustand {
  lastW: number;
  u0: number;
  idnA: number;
  querschnittMm2: number;
  absicherungA: number;
  kennlinie: Kennlinie;
  rechenweg: Rechenweg;
  /** Fehlerstrom, absichtlich erzeugt (z. B. Leckstrom im Neutralleiter). */
  fehlerstromMa: number;
  fiAusgeloest: boolean;
  neutralGekappt: boolean;
  verlegeart: string;
  /** Wer ist gerade beteiligt: Verbraucher oder FI. */
  waehler: 'last' | 'fi';
  /** Sekundärseite abgeschaltet (Trafo). */
  sekundaerAus: boolean;
  schritte: number;
}

export interface StationsEreignis {
  art: 'info' | 'warnung' | 'fehler' | 'schutz';
  text: string;
  /** Zustandsänderung, die sichtbar gemacht wird. */
  effekt?: 'leuchten' | 'ausloesen' | 'spannungAus' | 'spannungDa' | 'keinSchutz';
}

/**
 * Wendet eine Aktion an und liefert den neuen Zustand samt Ereignissen.
 *
 * Die Funktion ist rein: gleiche Eingabe, gleiches Ergebnis. Deshalb ist sie
 * im Test prüfbar und lässt sich später im UI animieren.
 */
export function wendeAn(
  zustand: StationsZustand,
  aktion: Aktion,
): { zustand: StationsZustand; ereignisse: StationsEreignis[] } {
  const z: StationsZustand = { ...zustand, schritte: zustand.schritte + 1 };
  const ereignisse: StationsEreignis[] = [];

  if (aktion.art === 'waehlerWechseln') {
    z.waehler = aktion.nach;
    return { zustand: z, ereignisse: [{ art: 'info', text: `Betrachtung: ${aktion.nach === 'last' ? 'Verbraucher' : 'Fehlerstromschutz'}.` }] };
  }

  if (aktion.art === 'kennlinieAendern') {
    const vorher = z.kennlinie;
    z.kennlinie = aktion.nach;
    ereignisse.push({
      art: 'info',
      text: `Kennlinie ${vorher} → ${aktion.nach}. Auslösebereich beachten.`,
    });
  }

  if (aktion.art === 'fehlerstromAendern') {
    z.fehlerstromMa = aktion.nachMa;
    ereignisse.push({
      art: 'info',
      text: `Fehlerstrom auf ${aktion.nachMa} mA eingestellt.`,
    });
  }

  if (aktion.art === 'verlegeartAendern') {
    z.verlegeart = aktion.nach;
    ereignisse.push({
      art: 'info',
      text: `Verlegeart ${aktion.nach}. Die Belastbarkeit ändert sich mit der Verlegeart.`,
    });
  }

  // Laststrom aus Leistung und Spannung
  if (aktion.art === 'lastspannungAendern') z.u0 = aktion.nach;
  if (aktion.art === 'lastAendern') z.lastW = aktion.nach;
  if (aktion.art === 'querschnittAendern') z.querschnittMm2 = aktion.nach;
  if (aktion.art === 'absicherungAendern') z.absicherungA = aktion.nach;

  const laststromA = z.lastW / z.u0;

  // Überstromschutz
  if (laststromA > z.absicherungA) {
    ereignisse.push({
      art: 'fehler',
      text: `Der Verbraucher zieht ${laststromA.toFixed(1)} A. Der LS ${z.absicherungA} A ist überlastet und löst aus.`,
      effekt: 'ausloesen',
    });
  } else {
    const magnetisch = kleinsterAusloesestrom(z.absicherungA, z.kennlinie);
    if (laststromA > magnetisch) {
      ereignisse.push({
        art: 'warnung',
        text: `Laststrom ${laststromA.toFixed(1)} A liegt über dem magnetischen Auslösepunkt der Kennlinie ${z.kennlinie} (${magnetisch.toFixed(1)} A). Der Schalter löst beim Einschalten sofort aus.`,
        effekt: 'ausloesen',
      });
    } else {
      ereignisse.push({
        art: 'info',
        text: `Laststrom ${laststromA.toFixed(1)} A – unterhalb von I_n (${z.absicherungA} A) und unterhalb des magnetischen Auslösepunkts (${magnetisch.toFixed(1)} A).`,
        effekt: 'spannungDa',
      });
    }
  }

  // Leitungsbelastung
  try {
    const belastbar = strombelastbarkeit({ querschnittMm2: z.querschnittMm2, weg: z.rechenweg });
    if (laststromA > belastbar.wert) {
      ereignisse.push({
        art: 'fehler',
        text: `Die Leitung ist mit ${laststromA.toFixed(1)} A überlastet (Belastbarkeit ${belastbar.wert.toFixed(2)} A bei ${z.querschnittMm2} mm²). Dauerbetrieb wäre nicht zulässig.`,
      });
    }
  } catch {
    ereignisse.push({
      art: 'warnung',
      text: `Für ${z.querschnittMm2} mm² ist in dieser Faktenbasis kein Referenzwert hinterlegt. Rechnung nicht möglich.`,
    });
  }

  return { zustand: z, ereignisse };
}

/**
 * FI-Station: Leckstrom einspeisen und beobachten, was passiert.
 *
 * Der didaktische Kern ist der Unterschied zwischen 30 mA und 300 mA und
 * zwischen der Auslösung an der Quelle und an der Verbraucherstelle.
 */
export function wendeFiAn(
  zustand: StationsZustand,
  aktion: Aktion,
): { zustand: StationsZustand; ereignisse: StationsEreignis[] } {
  // Alles, was nicht der Fehlerstromschutz selbst ist, läuft über den
  // allgemeinen Weg. Sonst würde etwa das Einstellen des Fehlerstroms in der
  // Fehlerstromstation wirkungslos bleiben.
  if (aktion.art !== 'neutralleiterTrennen' && aktion.art !== 'fiAusloesen') {
    return wendeAn(zustand, aktion);
  }

  const z: StationsZustand = { ...zustand, schritte: zustand.schritte + 1 };
  const ereignisse: StationsEreignis[] = [];

  if (aktion.art === 'neutralleiterTrennen') {
    z.neutralGekappt = !z.neutralGekappt;
    if (z.neutralGekappt) {
      ereignisse.push({
        art: 'warnung',
        text: 'Der Neutralleiter ist unterbrochen. Strom fließt über den Schutzleiter zurück – der Schutzleiter wird zum Betriebsleiter. Das ist einer der gefährlichsten Fehler überhaupt.',
        effekt: 'spannungDa',
      });
    } else {
      ereignisse.push({ art: 'info', text: 'Neutralleiter wieder verbunden.', effekt: 'spannungDa' });
    }
    return { zustand: z, ereignisse };
  }

  if (aktion.art === 'fiAusloesen') {
    const grenze = abschaltbedingung({ u0: z.u0, idnA: z.idnA });

    // Der Fehlerstrom fließt über den einzigen Weg zurück, den die Leitung
    // bietet. Ist der Neutralleiter intakt, ist dieser Weg der Neutralleiter.
    // Ist er gekappt, muss der Fehlerstrom über den Schutzleiter laufen –
    // das funktioniert nur, wenn dessen Querschnitt nicht zu klein ist.
    const wegUeberPE = z.neutralGekappt;
    const peAusreichend = wegUeberPE && z.querschnittMm2 >= 2.5;

    if (wegUeberPE && !peAusreichend) {
      z.fiAusgeloest = false;
      ereignisse.push({
        art: 'fehler',
        text:
          `Der Schutzleiter ist mit ${z.querschnittMm2} mm² zu dünn, um den Fehlerstrom ` +
          `zu führen. Der FI löst nicht aus – die Abschaltbedingung ` +
          `R_A ≤ ${grenze.wert.toFixed(0)} Ω ist nicht erfüllt.`,
        effekt: 'keinSchutz',
      });
      return { zustand: z, ereignisse };
    }

    const loestAus = z.fehlerstromMa > z.idnA * 1000;

    if (loestAus) {
      z.fiAusgeloest = true;
      ereignisse.push(
        wegUeberPE
          ? {
              art: 'schutz',
              text:
                `Der FI löst aus, allerdings über den Schutzleiter (${z.fehlerstromMa} mA > ` +
                `${(z.idnA * 1000).toFixed(0)} mA). Der Personenschutz wirkt, der Schutzleiter ` +
                'wird aber thermisch belastet – das ist kein dauerhafter Betriebszustand.',
              effekt: 'ausloesen',
            }
          : {
              art: 'schutz',
              text:
                `Der FI löst aus: Fehlerstrom ${z.fehlerstromMa} mA liegt über ` +
                `I_Δn = ${(z.idnA * 1000).toFixed(0)} mA. Genau dafür ist er da.`,
              effekt: 'ausloesen',
            },
      );
    } else {
      z.fiAusgeloest = false;
      ereignisse.push({
        art: 'fehler',
        text:
          `Der FI löst NICHT aus: Fehlerstrom ${z.fehlerstromMa} mA liegt unter ` +
          `I_Δn = ${(z.idnA * 1000).toFixed(0)} mA. Der Grenzwert R_A ≤ ${grenze.wert.toFixed(0)} Ω ` +
          'wird nicht erreicht – der Personenschutz ist nicht gegeben.',
        effekt: 'keinSchutz',
      });
    }
    return { zustand: z, ereignisse };
  }

  return { zustand: z, ereignisse };
}

/** Trafo-Station: Warum wird ein Trenntransformator vorgeschaltet? */
export function wendeTrafoAn(
  zustand: StationsZustand,
  aktion: Aktion,
): { zustand: StationsZustand; ereignisse: StationsEreignis[] } {
  if (aktion.art !== 'sekundaerAbschalten' && aktion.art !== 'lastAendern') {
    return wendeAn(zustand, aktion);
  }

  const z: StationsZustand = { ...zustand, schritte: zustand.schritte + 1 };
  const ereignisse: StationsEreignis[] = [];

  if (aktion.art === 'sekundaerAbschalten') {
    z.sekundaerAus = !z.sekundaerAus;
    ereignisse.push(
      z.sekundaerAus
        ? { art: 'warnung', text: 'Sekundärseite abgeschaltet. Alle angeschlossenen Verbraucher sind spannungsfrei – Voraussetzung für Arbeiten.', effekt: 'spannungAus' }
        : { art: 'info', text: 'Sekundärseite wieder unter Spannung.', effekt: 'spannungDa' },
    );
    return { zustand: z, ereignisse };
  }

  if (aktion.art === 'lastAendern') {
    z.lastW = aktion.nach;
    const u2 = 24;
    const strom = z.lastW / u2;
    const leistungsgrenze = 230 * u2; // max. Sekundärleistung eines Trenntransformators
    if (z.lastW > leistungsgrenze) {
      ereignisse.push({
        art: 'fehler',
        text: `Überlast: ${z.lastW} W auf der Sekundärseite. Trenntransformatoren werden nicht überlastet – die Sicherung spricht an.`,
        effekt: 'ausloesen',
      });
    } else {
      ereignisse.push({
        art: 'info',
        text: `Sekundärseite: ${z.lastW} W entsprechen ${strom.toFixed(1)} A bei ${u2} V. Zulässig bis ${leistungsgrenze} VA.`,
        effekt: 'spannungDa',
      });
    }
  }

  return { zustand: z, ereignisse };
}

export function starteStation(id: StationsId): StationDef {
  const startZustand: StationsZustand = {
    lastW: 1200,
    u0: 230,
    idnA: 0.03,
    querschnittMm2: 1.5,
    absicherungA: 16,
    kennlinie: 'C',
    rechenweg: 'referenz-iz',
    fehlerstromMa: 0,
    fiAusgeloest: false,
    neutralGekappt: false,
    verlegeart: 'A2',
    waehler: 'last',
    sekundaerAus: false,
    schritte: 0,
  };

  switch (id) {
    case 'fi':
      return {
        id,
        titel: 'Fehlerstromschutz',
        kurz: 'FI',
        lernziel: 'Erkennen, wann ein Fehlerstromschutz auslöst und wann nicht.',
        pruefungsbezug: 'Abschaltbedingung R_A ≤ U₀ / I_Δn, § 12 und 13 Prüfungsbereich',
        startZustand,
        aktionen: [
          { art: 'fehlerstromAendern', nachMa: 15 },
          { art: 'fehlerstromAendern', nachMa: 30 },
          { art: 'fehlerstromAendern', nachMa: 45 },
          { art: 'neutralleiterTrennen' },
          { art: 'fiAusloesen' },
        ],
      };
    case 'ls':
      return {
        id,
        titel: 'Überstromschutz und Kennlinie',
        kurz: 'LS',
        lernziel: 'Absicherung, Kennlinie und Leitungsbelastbarkeit zusammendenken.',
        pruefungsbezug: 'Leitungsdimensionierung, Leitungsschutzschalter',
        startZustand,
        aktionen: [
          { art: 'lastAendern', nach: 4000 },
          { art: 'querschnittAendern', nach: 1.5 },
          { art: 'querschnittAendern', nach: 2.5 },
          { art: 'kennlinieAendern', nach: 'B' },
          { art: 'kennlinieAendern', nach: 'C' },
          { art: 'absicherungAendern', nach: 10 },
          { art: 'absicherungAendern', nach: 16 },
        ],
      };
    case 'trafo':
      return {
        id,
        titel: 'Trenntransformator und Arbeitsschutz',
        kurz: 'Trafo',
        lernziel: 'Warum bei Arbeiten am stromführenden Teil ein Trenntransformator steht.',
        pruefungsbezug: 'Arbeitsschutz, § 11 Kundenauftrag',
        startZustand: { ...startZustand, lastW: 100, u0: 230 },
        aktionen: [
          { art: 'sekundaerAbschalten' },
          { art: 'lastAendern', nach: 200 },
          { art: 'lastAendern', nach: 6000 },
        ],
      };
    case 'verlegeart':
      return {
        id,
        titel: 'Verlegeart und Belastbarkeit',
        kurz: 'Verlegeart',
        lernziel: 'Warum derselbe Leiter je nach Verlegeart anders belastbar ist.',
        pruefungsbezug: 'Referenzwerte I_z, Leitungsauswahl',
        startZustand,
        aktionen: [
          { art: 'verlegeartAendern', nach: 'A2' },
          { art: 'querschnittAendern', nach: 1.5 },
          { art: 'querschnittAendern', nach: 2.5 },
          { art: 'querschnittAendern', nach: 4 },
        ],
      };
  }
}

/** Faktenbezug der Station für die Anzeige. */
export function stationFakten(id: StationsId): { bezeichnung: string; wert: string }[] {
  switch (id) {
    case 'fi':
      return ['idn-personenschutz', 'abschaltzeit-0-3s', 'formel-abschaltbedingung']
        .map((id) => holeFakt(id))
        .filter((f): f is NonNullable<typeof f> => Boolean(f))
        .map((f) => ({ bezeichnung: f.bezeichnung, wert: `${f.wert ?? ''} ${f.einheit ?? ''}`.trim() }));
    case 'ls':
      return ['ls-kennlinie-b-magnetisch', 'ls-kennlinie-c-magnetisch', 'absicherung-schultabelle']
        .map((id) => holeFakt(id))
        .filter((f): f is NonNullable<typeof f> => Boolean(f))
        .map((f) => ({ bezeichnung: f.bezeichnung, wert: `${f.wert ?? ''} ${f.einheit ?? ''}`.trim() }));
    default:
      return ['iz-tabelle-verlegeart-c', 'rho-kupfer']
        .map((id) => holeFakt(id))
        .filter((f): f is NonNullable<typeof f> => Boolean(f))
        .map((f) => ({ bezeichnung: f.bezeichnung, wert: `${f.wert ?? ''} ${f.einheit ?? ''}`.trim() }));
  }
}
