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
      if (einheit && !o.text.includes(einheit.trim())) {
        // Einheit fehlt in der Option – trotzdem zählen, aber nur bei
        // eindeutigem Zahlenwert.
      }
      return Math.abs(zahl - ergebnis.wert) <= toleranz;
    })
    .map((o) => o.id);

  return {
    korrektOptionId: passende.length === 1 ? passende[0]! : null,
    passende,
    erkannterWert: ergebnis.wert,
  };
}
