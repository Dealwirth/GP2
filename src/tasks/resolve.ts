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

/** Zerlegt eine Option in ihre erste erkennbare Zahl. */
function zahlAusOption(text: string): number | null {
  const treffer = text.match(/-?\d+([.,]\d+)?/);
  if (!treffer) return null;
  const wert = Number(treffer[0].replace(',', '.'));
  return Number.isFinite(wert) ? wert : null;
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

/** Liefert den ersten Vorsatz direkt hinter der Zahl, falls einer dasteht. */
function vorsatzFaktor(text: string): number {
  const treffer = text.match(/-?\d+(?:[.,]\d+)?\s*([pnuµmkM])(?=[A-Za-zΩΩ]|$)/);
  if (!treffer) return 1;
  return VORSAETZE[treffer[1] ?? ''] ?? 1;
}

/** Zeichen, die eine Einheit tragen – Buchstaben, Ohm- und Prozentzeichen. */
const EINHEIT_ZEICHEN = /[A-Za-zΩωΩ%]/;

/**
 * Entspricht die Einheit der Option der erwarteten?
 *
 * Die frühere Fassung ließ den Einheitenvergleich offen – ein Kommentar stand
 * dort, wo die Prüfung hätte stehen müssen. Folge: „166,7 mA" galt als
 * richtige Antwort auf ein Ergebnis in Ω. Bei einem Prüfungstrainer ist das
 * ein falsches Lob, und das ist schlimmer als eine Ablehnung.
 *
 * Verglichen wird buchstabenweise, ohne Vorsatz und Kleinschreibung: „0,3 A"
 * passt damit auf die Engine-Einheit „A" ebenso wie auf „a", „166,7 Ω" auf
 * „Ω". Toleranz gibt es nur dort, wo sie nichts verdeckt: Steht in der Option
 * gar keine Einheit, wird sie akzeptiert – eine reine Zahl ist keine falsche
 * Aussage über die Einheit.
 */
function einheitPasst(text: string, einheit: string): boolean {
  const erwartet = einheit.trim().toLowerCase().replace(/[µu]/, 'u');
  if (!erwartet || !EINHEIT_ZEICHEN.test(erwartet)) return true;

  // Nur der Zahlenteil und das unmittelbar Folgende zählen: „21 A pro Leiter"
  // soll auf „A" passen, „21 V" aber nicht.
  const treffer = text.match(/-?\d+(?:[.,]\d+)?\s*([A-Za-zΩΩ%µu]*)/);
  const roh = (treffer?.[1] ?? '').toLowerCase().replace(/[µu]/, 'u');
  if (roh === '') return true;
  const ohneVorsatz = roh.length > 1 ? roh.slice(1) : roh;
  return ohneVorsatz.startsWith(erwartet) || roh.startsWith(erwartet);
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
  const toleranz = Math.max(Math.abs(ergebnis.wert) * 0.005, 0.05);
  const passende = optionen
    .filter((o) => {
      const zahl = zahlAusOption(o.text);
      if (zahl === null) return false;
      // Vorsätze auflösen: „300 mA" ist derselbe Wert wie „0,3 A".
      const wert = zahl * vorsatzFaktor(o.text);
      if (Math.abs(wert - ergebnis.wert) > toleranz) return false;
      return einheit === undefined || einheitPasst(o.text, einheit);
    })
    .map((o) => o.id);

  return {
    korrektOptionId: passende.length === 1 ? passende[0]! : null,
    passende,
    erkannterWert: ergebnis.wert,
  };
}
