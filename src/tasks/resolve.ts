import type { RechenErgebnis, Rechenweg, Kennlinie } from '../engine/calc/index.ts';
import {
  abschaltbedingung,
  schleifenwiderstandGrenze,
  spannungsfall,
  strombelastbarkeit,
  stromDrehstrom,
  stromEinphasig,
} from '../engine/calc/index.ts';
import { holeFakt } from '../content/facts/index.ts';
import type { Rezept } from '../ai/schemas.ts';

/**
 * Rezeptauflösung.
 *
 * Die KI wählt ein Rezept, das Engine ausführt. Daraus entsteht der richtige
 * Wert. Anschließend wird geprüft, ob genau eine Antwortmöglichkeit dazu passt.
 *
 * Damit gilt: Die KI kann eine Aufgabe erfinden, aber sie kann sie nicht
 * manipulieren. Stimmt das Ergebnis nicht zu den Optionen, wird verworfen.
 */

export interface AufgeloesteRechnung {
  wert: number;
  einheit: string;
  steps: RechenErgebnis['steps'];
  regel: string;
  gesichert: boolean;
}

export class RezeptFehler extends Error {
  constructor(grund: string) {
    super(`Rezept nicht ausführbar: ${grund}`);
    this.name = 'RezeptFehler';
  }
}

function faktWert(id: string | undefined, feld: string): number {
  if (!id) throw new RezeptFehler(`${feld} fehlt.`);
  const fakt = holeFakt(id);
  if (!fakt) throw new RezeptFehler(`Fakt ${id} existiert nicht.`);
  if (fakt.wert === undefined) throw new RezeptFehler(`Fakt ${id} hat keinen Zahlenwert.`);
  return fakt.wert;
}

export function rechne(rezept: Rezept): AufgeloesteRechnung {
  switch (rezept.art) {
    case 'abschaltbedingung': {
      const u0 = faktWert(rezept.u0FactId, 'u0FactId');
      const idnA = faktWert(rezept.idnFactId, 'idnFactId');
      return abschaltbedingung({ u0, idnA });
    }
    case 'strombelastbarkeit': {
      if (rezept.querschnittMm2 === undefined) throw new RezeptFehler('querschnittMm2 fehlt.');
      const weg: Rechenweg = rezept.weg ?? 'referenz-iz';
      return strombelastbarkeit({ querschnittMm2: rezept.querschnittMm2, weg });
    }
    case 'strom-einphasig': {
      const uV = faktWert(rezept.u0FactId, 'u0FactId');
      if (rezept.leistungW === undefined) throw new RezeptFehler('leistungW fehlt.');
      return stromEinphasig({
        leistungW: rezept.leistungW,
        uV,
        cosPhi: rezept.cosPhi ?? 1,
      });
    }
    case 'strom-drehstrom': {
      const uV = faktWert(rezept.u0FactId, 'u0FactId');
      if (rezept.leistungW === undefined) throw new RezeptFehler('leistungW fehlt.');
      return stromDrehstrom({
        leistungW: rezept.leistungW,
        uV,
        cosPhi: rezept.cosPhi ?? 1,
      });
    }
    case 'spannungsfall': {
      if (
        rezept.laengeM === undefined ||
        rezept.stromA === undefined ||
        rezept.querschnittMm2 === undefined
      ) {
        throw new RezeptFehler('laengeM, stromA und querschnittMm2 müssen gesetzt sein.');
      }
      return spannungsfall({
        laengeM: rezept.laengeM,
        stromA: rezept.stromA,
        querschnittMm2: rezept.querschnittMm2,
      });
    }
    case 'schleifenwiderstand': {
      const u0 = faktWert(rezept.u0FactId, 'u0FactId');
      if (rezept.inA === undefined) throw new RezeptFehler('inA fehlt.');
      return schleifenwiderstandGrenze({
        u0,
        inA: rezept.inA,
        kennlinie: (rezept.kennlinie ?? 'C') as Kennlinie,
      });
    }
    case 'faktenwert': {
      const fakt = holeFakt(rezept.factId ?? '');
      if (!fakt) throw new RezeptFehler(`Fakt ${rezept.factId} existiert nicht.`);
      if (fakt.wert === undefined) {
        throw new RezeptFehler(`Fakt ${fakt.id} hat keinen Zahlenwert.`);
      }
      return {
        wert: fakt.wert,
        einheit: fakt.einheit ?? '',
        regel: 'Wert aus der Faktenbasis',
        gesichert: fakt.verification === 'geprueft',
        steps: [
          {
            label: 'Wert aus der Faktenbasis übernehmen',
            substitution: fakt.bezeichnung,
            result: `${fakt.wert} ${fakt.einheit ?? ''}`.trim(),
            factId: fakt.id,
          },
        ],
      };
    }
    default:
      throw new RezeptFehler(`Unbekannte Rezeptart ${(rezept as Rezept).art}`);
  }
}

/**
 * Übersetzt Vorsätze in den Faktor zur Grundeinheit.
 *
 * Damit wird aus „300 mA" und „0,3 A" derselbe Wert, und aus „2,5 kΩ" und
 * „2500 Ω" ebenso. Ohne das würde eine Zahl nur dann passen, wenn zufällig
 * dieselbe Schreibweise getroffen wurde.
 */
const VORSAETZE: Record<string, number> = {
  p: 1e-12,
  n: 1e-9,
  u: 1e-6,
  'µ': 1e-6,
  m: 1e-3,
  k: 1e3,
  M: 1e6,
};

/**
 * Zerlegt eine Einheit in Vorsatz und Grundzeichen.
 *
 * Der Vorsatz wird VOR dem Kleinschreiben gelesen: „M" ist Mega (10⁶), „m"
 * ist Milli (10⁻³). Würde zuerst kleingeschrieben, wäre „MΩ" plötzlich
 * Milliohm – ein Faktor 10⁹ daneben.
 */
function einheitInfo(roh: string): { vorsatz: number; basis: string } {
  let rest = roh.trim();
  let vorsatz = 1;
  if (rest.length >= 2 && VORSAETZE[rest[0]!] !== undefined) {
    vorsatz = VORSAETZE[rest[0]!]!;
    rest = rest.slice(1);
  }
  return { vorsatz, basis: rest.toLowerCase().replace(/[µu]/, 'u') };
}

/** Zerlegt eine Option in Zahl, Vorsatz und Grundzeichen der Einheit. */
function zerlegeOption(text: string): { zahl: number | null; vorsatz: number; einheit: string } {
  const treffer = text.match(/(-?\d+(?:[.,]\d+)?)\s*([a-zA-ZµΩΩ%]*)/);
  if (!treffer) return { zahl: null, vorsatz: 1, einheit: '' };

  const zahl = Number(treffer[1]!.replace(',', '.'));
  const info = einheitInfo(treffer[2] ?? '');
  return {
    zahl: Number.isFinite(zahl) ? zahl : null,
    vorsatz: info.vorsatz,
    einheit: info.basis,
  };
}

/** Zeichen, die eine Einheit tragen – Buchstaben, Ohm- und Prozentzeichen. */
const EINHEIT_ZEICHEN = /[A-Za-zΩωΩ%]/;

/**
 * Entspricht die Einheit der Option der erwarteten?
 *
 * Verglichen wird das Grundzeichen ohne Vorsatz: „1 kΩ" trägt die Einheit „Ω"
 * und passt damit auf ein Ergebnis in „MΩ". Die Größenordnung steckt im
 * Vorsatz und wird über den Zahlenwert geprüft – dort, wo sie hingehört.
 *
 * Steht in der Option gar keine Einheit, wird sie akzeptiert: Eine reine Zahl
 * ist keine falsche Aussage über die Einheit.
 */
function einheitPasst(text: string, einheit: string): boolean {
  const erwartet = einheitInfo(einheit);
  if (!erwartet.basis || !EINHEIT_ZEICHEN.test(erwartet.basis)) return true;

  const { einheit: gefunden } = zerlegeOption(text);
  if (gefunden === '') return true;

  // Ohm wird als Ω, als Ω oder ausgeschrieben geschrieben.
  const norm = (s: string): string => s.replace(/[ωΩ]|ohm/g, 'ω');
  return norm(gefunden) === norm(erwartet.basis);
}

export interface Optionsabgleich {
  korrektOptionId: string | null;
  passende: string[];
  erkannterWert: number;
}

/**
 * Sucht die Option, die zum Rechenergebnis passt.
 *
 * Toleranz: 0,5 % des Wertes, damit Rundungsunterschiede zwischen der
 * Textdarstellung und dem berechneten Wert nicht zu einer unbeabsichtigten
 * Ablehnung führen. Zwei passende Optionen bedeuten Doppeldeutigkeit und
 * führen zur Ablehnung.
 */
export function gleicheOptionenAb(
  optionen: { id: string; text: string }[],
  ergebnis: { wert: number },
  einheit?: string,
): Optionsabgleich {
  // Beide Seiten in die Grundeinheit bringen: Die Engine nennt „1 MΩ", die
  // Option vielleicht „1000 kΩ". Erst nach dem Auflösen der Vorsätze sind
  // die Zahlen vergleichbar.
  const basisErwartet = ergebnis.wert * einheitInfo(einheit ?? '').vorsatz;
  const toleranz = Math.max(Math.abs(basisErwartet) * 0.005, 0.05);
  const passende = optionen
    .filter((o) => {
      const { zahl, vorsatz } = zerlegeOption(o.text);
      if (zahl === null) return false;
      if (Math.abs(zahl * vorsatz - basisErwartet) > toleranz) return false;
      return einheit === undefined || einheitPasst(o.text, einheit);
    })
    .map((o) => o.id);

  return {
    korrektOptionId: passende.length === 1 ? passende[0]! : null,
    passende,
    erkannterWert: ergebnis.wert,
  };
}
