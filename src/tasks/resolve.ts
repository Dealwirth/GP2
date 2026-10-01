import type { RechenErgebnis, Rechenweg, Kennlinie } from '../engine/calc/index.ts';
import {
  abschaltbedingung,
  absicherungWaehlen,
  amortisation,
  blindleistung,
  energiearbeit,
  leistungDrehstrom,
  leistungEinphasig,
  leistungsfaktor,
  motorstrom,
  prozentwert,
  pvErtrag,
  querschnittAusSpannungsfall,
  rcdStromAusMilliampere,
  scheinleistung,
  schleifenwiderstandGrenze,
  spannungsfall,
  spannungsfallDrehstrom,
  strombelastbarkeit,
  strombelastbarkeitKorrigiert,
  stromDrehstrom,
  stromEinphasig,
  stromkosten,
  waermepumpeStrombedarf,
  widerstandLeiter,
  widerstandTemperatur,
} from '../engine/calc/index.ts';
import { holeFakt } from '../content/facts/index.ts';
import type { Rezept } from '../domain/aufgaben.ts';

/**
 * Rezeptauflösung.
 *
 * Ein Rezept beschreibt eine Rechenvorschrift; die Engine führt sie aus.
 * Daraus entsteht der richtige Wert. Anschließend wird geprüft, ob genau eine
 * Antwortmöglichkeit dazu passt. Stimmt das Ergebnis nicht zu den Optionen,
 * wird die Aufgabe verworfen.
 */

export interface AufgeloesteRechnung {
  wert: number;
  einheit: string;
  steps: RechenErgebnis['steps'];
  regel: string;
  gesichert: boolean;
}

/**
 * Eingangsgrößen eines Rezepts als Textwerte.
 *
 * Das sind die Zahlen, die die Aufgabe als Szenario setzt (Last, Länge, Strom,
 * Querschnitt). Sie fließen in die Rechnung ein und sind damit belegt – die
 * Faktenbindung darf sie im Aufgabentext zulassen. Reine Faktenwerte gehören
 * NICHT hierher: sie sind bereits über `factRefs` gebunden.
 */
export function rezeptWerte(rezept: Rezept): string[] {
  const werte: string[] = [];
  const nimm = (n: number | undefined): void => {
    if (n !== undefined && Number.isFinite(n)) werte.push(String(n));
  };
  nimm(rezept.querschnittMm2);
  nimm(rezept.leistungW);
  nimm(rezept.leistungKW);
  nimm(rezept.cosPhi);
  nimm(rezept.laengeM);
  nimm(rezept.stromA);
  nimm(rezept.inA);
  nimm(rezept.stromkreise);
  nimm(rezept.temperaturC);
  nimm(rezept.wirkungsgrad);
  nimm(rezept.widerstand20);
  nimm(rezept.grenzProzent);
  nimm(rezept.stunden);
  nimm(rezept.kWh);
  nimm(rezept.centProKwh);
  nimm(rezept.investitionEuro);
  nimm(rezept.jahresersparnisEuro);
  nimm(rezept.heizlastKW);
  nimm(rezept.vollbenutzungsstunden);
  nimm(rezept.jaz);
  nimm(rezept.leistungKWp);
  nimm(rezept.ertragProKWp);
  nimm(rezept.wert);
  nimm(rezept.bezug);
  nimm(rezept.milliampere);
  return werte;
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

/** Fordert eine Zahl, die im Rezept gesetzt sein muss. */
function pflicht(wert: number | undefined, feld: string): number {
  if (wert === undefined || !Number.isFinite(wert)) {
    throw new RezeptFehler(`${feld} fehlt.`);
  }
  return wert;
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
    case 'strombelastbarkeit-korrigiert': {
      return strombelastbarkeitKorrigiert({
        querschnittMm2: pflicht(rezept.querschnittMm2, 'querschnittMm2'),
        verlegeart: rezept.verlegeart ?? 'C',
        stromkreise: rezept.stromkreise,
        temperaturC: rezept.temperaturC,
      });
    }
    case 'absicherung-waehlen': {
      return absicherungWaehlen({
        stromA: pflicht(rezept.stromA, 'stromA'),
        querschnittMm2: pflicht(rezept.querschnittMm2, 'querschnittMm2'),
        verlegeart: rezept.verlegeart ?? 'C',
      });
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
        u0: rezept.u0FactId ? faktWert(rezept.u0FactId, 'u0FactId') : undefined,
        cosPhi: rezept.cosPhi,
      });
    }
    case 'spannungsfall-drehstrom': {
      return spannungsfallDrehstrom({
        laengeM: pflicht(rezept.laengeM, 'laengeM'),
        stromA: pflicht(rezept.stromA, 'stromA'),
        querschnittMm2: pflicht(rezept.querschnittMm2, 'querschnittMm2'),
        u0: rezept.u0FactId ? faktWert(rezept.u0FactId, 'u0FactId') : undefined,
        cosPhi: rezept.cosPhi,
      });
    }
    case 'querschnitt-spannungsfall': {
      return querschnittAusSpannungsfall({
        leistungW: pflicht(rezept.leistungW, 'leistungW'),
        laengeM: pflicht(rezept.laengeM, 'laengeM'),
        uV: rezept.u0FactId ? faktWert(rezept.u0FactId, 'u0FactId') : 230,
        cosPhi: rezept.cosPhi,
        grenzProzent: rezept.grenzProzent,
        drehstrom: rezept.drehstrom ?? false,
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
      // Tabellenfakten tragen ihren Wert nur im Bemerkungstext (wert = 0 ist
      // ein Platzhalter). Als Einzelwert abgefragt ergäbe das die absurde
      // Aufgabe „Wie groß ist I_z? – 0 A". Solche Fakten sind nur als
      // Bezugsgröße in einem Rezept brauchbar.
      if (fakt.wert === 0 && /werttabelle|siehe/i.test(fakt.einheit ?? '')) {
        throw new RezeptFehler(
          `Fakt ${fakt.id} ist eine Werttabelle und hat keinen einzelnen Zahlenwert.`,
        );
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
    case 'leistung-einphasig': {
      return leistungEinphasig({
        stromA: pflicht(rezept.stromA, 'stromA'),
        uV: rezept.u0FactId ? faktWert(rezept.u0FactId, 'u0FactId') : 230,
        cosPhi: rezept.cosPhi ?? 1,
      });
    }
    case 'leistung-drehstrom': {
      return leistungDrehstrom({
        stromA: pflicht(rezept.stromA, 'stromA'),
        uV: rezept.u0FactId ? faktWert(rezept.u0FactId, 'u0FactId') : 400,
        cosPhi: rezept.cosPhi ?? 1,
      });
    }
    case 'scheinleistung': {
      return scheinleistung({
        stromA: pflicht(rezept.stromA, 'stromA'),
        uV: rezept.u0FactId ? faktWert(rezept.u0FactId, 'u0FactId') : 230,
        drehstrom: rezept.drehstrom ?? false,
      });
    }
    case 'blindleistung': {
      return blindleistung({
        scheinleistungVA: pflicht(rezept.wert, 'wert (Scheinleistung)'),
        cosPhi: pflicht(rezept.cosPhi, 'cosPhi'),
      });
    }
    case 'leistungsfaktor': {
      return leistungsfaktor({
        wirkleistungW: pflicht(rezept.wert, 'wert (Wirkleistung)'),
        scheinleistungVA: pflicht(rezept.bezug, 'bezug (Scheinleistung)'),
      });
    }
    case 'widerstand-leiter': {
      return widerstandLeiter({
        laengeM: pflicht(rezept.laengeM, 'laengeM'),
        querschnittMm2: pflicht(rezept.querschnittMm2, 'querschnittMm2'),
      });
    }
    case 'widerstand-temperatur': {
      return widerstandTemperatur({
        widerstand20: pflicht(rezept.widerstand20, 'widerstand20'),
        temperaturC: pflicht(rezept.temperaturC, 'temperaturC'),
      });
    }
    case 'energiearbeit': {
      return energiearbeit({
        leistungW: pflicht(rezept.leistungW, 'leistungW'),
        stunden: pflicht(rezept.stunden, 'stunden'),
      });
    }
    case 'stromkosten': {
      return stromkosten({
        kWh: pflicht(rezept.kWh, 'kWh'),
        centProKwh: pflicht(rezept.centProKwh, 'centProKwh'),
      });
    }
    case 'amortisation': {
      return amortisation({
        investitionEuro: pflicht(rezept.investitionEuro, 'investitionEuro'),
        jahresersparnisEuro: pflicht(rezept.jahresersparnisEuro, 'jahresersparnisEuro'),
      });
    }
    case 'waermepumpe-strombedarf': {
      return waermepumpeStrombedarf({
        heizlastKW: pflicht(rezept.heizlastKW, 'heizlastKW'),
        vollbenutzungsstunden: pflicht(rezept.vollbenutzungsstunden, 'vollbenutzungsstunden'),
        jaz: pflicht(rezept.jaz, 'jaz'),
      });
    }
    case 'pv-ertrag': {
      return pvErtrag({
        leistungKWp: pflicht(rezept.leistungKWp, 'leistungKWp'),
        ertragProKWp: pflicht(rezept.ertragProKWp, 'ertragProKWp'),
      });
    }
    case 'prozentwert': {
      return prozentwert({
        wert: pflicht(rezept.wert, 'wert'),
        bezug: pflicht(rezept.bezug, 'bezug'),
      });
    }
    case 'motorstrom': {
      return motorstrom({
        leistungKW: pflicht(rezept.leistungKW, 'leistungKW'),
        uV: rezept.u0FactId ? faktWert(rezept.u0FactId, 'u0FactId') : 400,
        cosPhi: rezept.cosPhi ?? 0.85,
        wirkungsgrad: rezept.wirkungsgrad ?? 0.9,
      });
    }
    case 'rcd-strom': {
      return rcdStromAusMilliampere({
        milliampere: pflicht(rezept.milliampere, 'milliampere'),
      });
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
function zerlegeOption(text: string): {
  zahl: number | null;
  vorsatz: number;
  einheit: string;
  rest: string;
} {
  const treffer = text.match(/(-?\d+(?:[.,]\d+)?)\s*([a-zA-ZµΩΩ%]*)/);
  if (!treffer) return { zahl: null, vorsatz: 1, einheit: '', rest: text };

  const zahl = Number(treffer[1]!.replace(',', '.'));
  const info = einheitInfo(treffer[2] ?? '');
  return {
    zahl: Number.isFinite(zahl) ? zahl : null,
    vorsatz: info.vorsatz,
    einheit: info.basis,
    rest: text.replace(treffer[0], '').trim(),
  };
}

/** Liest den Zahlenwert aus einem Optionstext (ohne Vorsatz-Auflösung). */
export function zahlAusText(text: string): number | null {
  return zerlegeOption(text).zahl;
}

/**
 * Steht in der Option nur der Wert – oder eine Aussage *über* den Wert?
 *
 * „1 MΩ" nennt den Wert. „Ein niedrigerer Wert als 1 MΩ" nennt ihn nur und
 * behauptet etwas anderes. Ohne diese Unterscheidung würde die zweite Option
 * als zweite richtige Antwort durchgehen und die Aufgabe als mehrdeutig
 * verworfen – obwohl sie eindeutig ist.
 */
function istWertoption(rest: string): boolean {
  // Übrig bleiben darf nur Beiwerk wie Klammern, Einheitenwörter oder ein
  // knapper Zusatz („ca.", „etwa"). Alles darüber hinaus ist eine Aussage.
  const ohneBeiwerk = rest
    .replace(/[(),.;:]/g, ' ')
    .replace(/\b(ca|etwa|rund|ungefähr|circa|approximately|about|mindestens|höchstens|maximal|minimal|exakt|genau)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return ohneBeiwerk.length === 0;
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
 * Formatiert einen Rechenwert so, wie er als Antwortoption erscheint.
 *
 * Die Stellenzahl richtet sich nach der Größe: 46 Ω braucht keine Nachkomma-
 * stellen, 0,80 Ω schon. Ohne diese Staffelung stünde bei einem kleinen Wert
 * „0,1 Ω" (richtig gerundet), während das Modell „0,10 Ω" schreibt – beide
 * sind dasselbe, sähen aber verschieden aus.
 */
export function formatiereWert(wert: number, einheit: string): string {
  const betrag = Math.abs(wert);
  // Die Engine rundet ihre Ergebnisse auf eine Nachkommastelle. Die Anzeige
  // darf nicht stärker runden – sonst stünde in der Aufgabe eine Zahl, die
  // die Engine nie erzeugt hat (aus 166,7 würde 167), und die Faktenbindung
  // verwürfe die Aufgabe. Ganze Werte bleiben ganz, sonst eine Stelle, bei
  // kleinen Werten zwei.
  const stellen = Number.isInteger(wert) ? 0 : betrag >= 10 ? 1 : 2;
  return `${wert.toFixed(stellen).replace('.', ',')} ${einheit}`.trim();
}

/**
 * Zwei falsche, aber plausible Werte rund um das richtige Ergebnis.
 *
 * Der Abstand ist grob genug, dass keine Verwechslung entsteht (Faktor 2 bzw.
 * 0,5), und beide bleiben positiv. Sie sind damit klar falsch, aber nicht
 * abwegig – genau das, was eine MC-Aufgabe braucht.
 */
export function distraktorWerte(wert: number): number[] {
  const raus: number[] = [];
  const gesehen = new Set<number>();
  for (const faktor of [0.5, 2, 0.8, 1.25]) {
    const kandidat = Number((wert * faktor).toFixed(4));
    if (kandidat > 0 && kandidat !== wert && !gesehen.has(kandidat)) {
      gesehen.add(kandidat);
      raus.push(kandidat);
    }
    if (raus.length === 2) break;
  }
  return raus;
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

  const trifftWert = (text: string): boolean => {
    const { zahl, vorsatz } = zerlegeOption(text);
    if (zahl === null) return false;
    if (Math.abs(zahl * vorsatz - basisErwartet) > toleranz) return false;
    return einheit === undefined || einheitPasst(text, einheit);
  };

  // Gestuft: Eine Option, die den Wert schlicht nennt, ist die Antwort. Eine
  // Option, die den Wert nur erwähnt („kleiner als 1 MΩ"), ist eine Aussage
  // über den Wert und nur dann die Antwort, wenn keine Wertoption passt.
  const wertoptionen = optionen.filter((o) => trifftWert(o.text) && istWertoption(zerlegeOption(o.text).rest));
  const passende = wertoptionen.length > 0
    ? wertoptionen.map((o) => o.id)
    : optionen.filter((o) => trifftWert(o.text)).map((o) => o.id);

  return {
    korrektOptionId: passende.length === 1 ? passende[0]! : null,
    passende,
    erkannterWert: ergebnis.wert,
  };
}
