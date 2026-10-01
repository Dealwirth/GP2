import type { Rezept } from '../domain/aufgaben.ts';
import { formatiereWert } from './resolve.ts';

/**
 * Plausible falsche Antworten mit echter Begründung.
 *
 * Warum das den alten Weg ersetzt: Die frühere Fassung bildete zu jedem
 * Ergebnis die Faktoren 0,5 und 2 und schrieb als Begründung „Zu klein – der
 * Faktor 0,5 wurde angesetzt." Das war gleich doppelt falsch. Erstens bildet
 * der Faktor 0,5 keinen Fehler ab, den ein Prüfling tatsächlich macht.
 * Zweitens stimmte die Begründung nicht: Bei der Abschaltbedingung R_A = U₀/I_Δn
 * ist U₀ / (I_Δn · 10) kein Faktor-0,5-Fehler, sondern eine Zehnerpotenz.
 * Wer so eine Begründung liest, lernt eine falsche Regel.
 *
 * Hier steht zu jedem Distraktor der Fehler, den er abbildet. Die Werte
 * entstehen aus typischen Denkfehlern der Elektrotechnik:
 *
 *  - Faktor vergessen (√3, cos φ, 2 · l, 1,45)
 *  - Größe verwechselt (In statt 5 · In, I_z statt 1,45 · I_z)
 *  - Einheit verwechselt (mA statt A, kW statt W, Minuten statt Stunden)
 *  - Rundung zu früh, Nachbarwert der Normreihe
 *
 * Ein Distraktor, der keinen echten Irrtum abbildet, wird verworfen – lieber
 * eine Aufgabe weniger als eine, die falsches Denken antrainiert.
 */

export interface Distraktor {
  wert: number;
  /** Der Fehler, den dieser Wert abbildet – erscheint als Begründung. */
  grund: string;
}

/** Baut einen Distraktor, wenn der Wert positiv und vom Ergebnis verschieden ist. */
function mach(wert: number, grund: string): Distraktor {
  return { wert, grund };
}

/**
 * Rundet einen Distraktorwert auf die Stellenzahl, mit der die Engine rechnet.
 *
 * Ohne das stünde als falsche Antwort „4,599999999" statt „4,6". Der Wert
 * bleibt trotzdem weit genug vom Ergebnis entfernt, weil die Kandidaten
 * bewusst grob gewählt sind.
 */
function runde(wert: number, stellen = 4): number {
  const f = 10 ** stellen;
  return Math.round(wert * f) / f;
}

/**
 * Die falschen Werte zu einem Rezept.
 *
 * Der erste Parameter ist das richtige Ergebnis, damit die Abweichungen daran
 * ansetzen können. Die Rückgabe ist bereits gefiltert: positiv, verschieden
 * vom Ergebnis, ohne Dubletten.
 */
export function distraktorenFuer(rezept: Rezept, richtig: number, einheit: string): Distraktor[] {
  const kandidaten: Distraktor[] = [];
  const add = (wert: number, grund: string): void => {
    if (Number.isFinite(wert) && wert > 0) kandidaten.push(mach(runde(wert), grund));
  };

  switch (rezept.art) {
    case 'strom-drehstrom': {
      // Häufigster Fehler: den Verkettungsfaktor √3 weglassen.
      add(richtig * Math.sqrt(3), 'Der Verkettungsfaktor √3 wurde nicht berücksichtigt.');
      add(richtig / (rezept.cosPhi ?? 1), 'Der Leistungsfaktor cos φ wurde nicht berücksichtigt.');
      add(richtig / 1000, 'Die Leistung wurde in Watt statt in Kilowatt eingesetzt.');
      break;
    }
    case 'strom-einphasig': {
      add(richtig / (rezept.cosPhi ?? 1), 'Der Leistungsfaktor cos φ wurde nicht berücksichtigt.');
      add(richtig / 1000, 'Die Leistung wurde in Watt statt in Kilowatt eingesetzt.');
      add(richtig * 2, 'Die Leistung wurde versehentlich verdoppelt.');
      break;
    }
    case 'leistung-drehstrom': {
      add(richtig / Math.sqrt(3), 'Der Verkettungsfaktor √3 wurde nicht berücksichtigt.');
      add(richtig * 1000, 'Das Ergebnis wurde in Watt statt in Kilowatt erwartet.');
      break;
    }
    case 'leistung-einphasig': {
      add(richtig / (rezept.cosPhi ?? 1), 'Der Leistungsfaktor cos φ wurde nicht berücksichtigt.');
      break;
    }
    case 'spannungsfall':
    case 'spannungsfall-drehstrom': {
      // Der Faktor 2 steht für Hin- und Rückleiter – im Drehstrom entfällt er.
      add(richtig * 2, 'Der Faktor 2 für Hin- und Rückleiter wurde doppelt angesetzt.');
      add(richtig / 2, 'Der Faktor 2 für Hin- und Rückleiter fehlt.');
      add(richtig * 2.5, 'Es wurde mit dem Grenzwert 5 % statt 3 % gerechnet.');
      break;
    }
    case 'querschnitt-spannungsfall': {
      add(richtig * 2, 'Der doppelte Leitungsweg wurde nicht berücksichtigt.');
      add(richtig / 2, 'Der doppelte Leitungsweg wurde zweimal berücksichtigt.');
      break;
    }
    case 'strombelastbarkeit':
    case 'strombelastbarkeit-korrigiert': {
      add(richtig * 1.45, 'Mit 1,45 · I_z statt mit I_z gerechnet.');
      add(richtig / 1.45, 'Der Faktor 1,45 wurde an der falschen Stelle angewandt.');
      add(richtig / 2, 'Es wurde mit dem halben Querschnitt gerechnet.');
      break;
    }
    case 'absicherung-waehlen': {
      add(richtig * 1.25, 'Der nächstgrößere Normwert wurde gewählt.');
      add(richtig / 1.25, 'Der nächstkleinere Normwert wurde gewählt.');
      break;
    }
    case 'abschaltbedingung': {
      // Klassiker: Zehnerpotenz beim Fehlerstrom (30 mA als 30 A gelesen).
      add(richtig / 10, 'Der Fehlerstrom wurde um eine Zehnerpotenz zu groß angesetzt (mA als A).');
      add(richtig * 10, 'Der Fehlerstrom wurde um eine Zehnerpotenz zu klein angesetzt.');
      add(richtig * 2, 'Der Wert wurde verdoppelt statt geteilt.');
      break;
    }
    case 'schleifenwiderstand': {
      add(richtig * 5, 'Mit dem Nennstrom In statt mit dem Auslösestrom 5 · In gerechnet.');
      add(richtig * 2, 'Mit der doppelten Auslösegrenze gerechnet.');
      add(richtig / 2, 'Die untere magnetische Grenze wurde halbiert.');
      break;
    }
    case 'widerstand-leiter': {
      add(richtig * 2, 'Die einfache Länge wurde als doppelter Weg angesetzt.');
      add(richtig / 2, 'Der doppelte Leitungsweg wurde nicht berücksichtigt.');
      add(richtig * 10, 'Der Widerstandsbelag wurde um eine Zehnerpotenz falsch eingesetzt.');
      break;
    }
    case 'widerstand-temperatur': {
      add(richtig / (1 + 0.00393 * ((rezept.temperaturC ?? 20) - 20)),
        'Die Temperaturkorrektur wurde nicht berücksichtigt.');
      add(richtig * 2, 'Der Temperaturkoeffizient wurde verdoppelt.');
      break;
    }
    case 'energiearbeit': {
      add(richtig * 1000, 'Die Arbeit wurde in Wh statt in kWh angegeben.');
      add(richtig / 1000, 'Die Arbeit wurde in MWh statt in kWh angegeben.');
      add(richtig / 60, 'Die Dauer wurde in Minuten statt in Stunden eingesetzt.');
      break;
    }
    case 'stromkosten': {
      add(richtig * 100, 'Der Preis wurde in Cent statt in Euro eingesetzt.');
      add(richtig / 100, 'Der Preis wurde in Euro statt in Cent eingesetzt.');
      break;
    }
    case 'amortisation': {
      add(richtig * 12, 'Die Einsparung wurde als Monatswert statt als Jahreswert eingesetzt.');
      add(richtig / 12, 'Die Einsparung wurde mit dem Faktor 12 verrechnet.');
      break;
    }
    case 'waermepumpe-strombedarf': {
      add(richtig * (rezept.jaz ?? 1), 'Die Jahresarbeitszahl wurde multipliziert statt dividiert.');
      add(richtig / (rezept.jaz ?? 1), 'Die Jahresarbeitszahl wurde zweimal angesetzt.');
      break;
    }
    case 'pv-ertrag': {
      add(richtig / 1000, 'Der Ertrag wurde in MWh statt in kWh angegeben.');
      add(richtig * 0.8, 'Der Systemverlust wurde nicht berücksichtigt.');
      break;
    }
    case 'prozentwert': {
      add(richtig * 10, 'Der Prozentwert wurde um eine Zehnerpotenz verschoben.');
      add(richtig / 10, 'Der Prozentwert wurde um eine Zehnerpotenz verschoben.');
      break;
    }
    case 'motorstrom': {
      add(richtig * Math.sqrt(3), 'Der Verkettungsfaktor √3 wurde nicht berücksichtigt.');
      add(richtig / (rezept.wirkungsgrad ?? 1), 'Der Wirkungsgrad wurde nicht berücksichtigt.');
      add(richtig / (rezept.cosPhi ?? 1), 'Der Leistungsfaktor cos φ wurde nicht berücksichtigt.');
      break;
    }
    case 'scheinleistung': {
      add(richtig * Math.sqrt(3), 'Der Verkettungsfaktor √3 wurde nicht berücksichtigt.');
      break;
    }
    case 'blindleistung': {
      add(richtig * 2, 'Der Blindanteil wurde verdoppelt.');
      add(richtig / 2, 'Der Blindanteil wurde halbiert.');
      break;
    }
    case 'leistungsfaktor': {
      add(richtig * (rezept.bezug ?? 1) / (rezept.wert ?? 1), 'Wirk- und Scheinleistung wurden vertauscht.');
      break;
    }
    case 'rcd-strom': {
      add(richtig * 1000, 'Milliampere wurden nicht in Ampere umgerechnet.');
      add(richtig / 10, 'Der Wert wurde um eine Zehnerpotenz verschoben.');
      break;
    }
    default:
      break;
  }

  // Die Ersatzregel unten greift, wenn keine Rezeptart eigene Denkfehler hat.

  // Filter. Drei Bedingungen, jede aus einem echten Fehler gelernt:
  //
  //  1. **Kein Wert, der als null erscheint.** Bei kleinen Ergebnissen – etwa
  //     2 kWh – ergäbe „richtig / 1000" gerundet 0,00. Als Antwortmöglichkeit
  //     ist das keine Versuchung, sondern eine Beleidigung. Geprüft wird die
  //     Zahl im formatierten Text, nicht der Wert: 0,004 wird als „0,00"
  //     angezeigt und wäre über einen Vergleich mit 0 nicht aufgefallen.
  //  2. **Kein Wert, der dem Ergebnis zu nahe kommt.** Liegt ein Distraktor
  //     innerhalb der Rundung, ist er nicht mehr unterscheidbar und macht die
  //     Aufgabe unlösbar.
  //  3. **Kein Wert außerhalb des Zwanzigfachen.** Ein Fehler um den Faktor
  //     1000 – „Wh statt kWh" – ist als Zahl in derselben Einheit sinnlos:
  //     „8000 kWh" statt „8 kWh" verrät sich sofort. Solche Fälle fängt die
  //     Ersatzregel unten auf, die mit dem doppelten und halben Wert arbeitet.
  //
  // Der Textvergleich läuft über die Formatierung, weil nur die zählt: Was im
  // Antwortfeld gleich aussieht, ist für den Prüfling derselbe Wert.
  const richtigText = formatiereWert(richtig, einheit);
  const taugt = (k: Distraktor): boolean => {
    if (!Number.isFinite(k.wert) || k.wert <= 0) return false;
    if (Math.abs(k.wert - richtig) <= Math.abs(richtig) * 0.05) return false;
    const faktor = k.wert / richtig;
    if (faktor > 20 || faktor < 1 / 20) return false;
    const text = formatiereWert(k.wert, einheit);
    if (text === richtigText) return false;
    // Zahlanteil des Textes auf null prüfen – fängt „0", „0,0" und „0,00".
    const zahl = Number((text.match(/[\d.,]+/)?.[0] ?? '').replace(',', '.'));
    return Number.isFinite(zahl) && zahl !== 0;
  };

  const raus: Distraktor[] = [];
  const gesehen = new Set<number>([richtig]);
  for (const k of kandidaten) {
    if (gesehen.has(k.wert) || !taugt(k)) continue;
    gesehen.add(k.wert);
    raus.push(k);
    if (raus.length === 2) break;
  }

  // Ersatzregel: Reichen die Denkfehler nicht aus, treten der doppelte und der
  // halbe Wert an ihre Stelle. Bei einem Faktenwert ist der Abstand selbst die
  // Aussage – der Prüfling muss die Größenordnung kennen.
  if (raus.length < 2) {
    for (const [wert, grund] of [
      [richtig * 2, 'Der Wert ist doppelt so groß wie der gesuchte.'],
      [richtig / 2, 'Der Wert ist halb so groß wie der gesuchte.'],
    ] as const) {
      const k = mach(runde(wert), grund);
      if (gesehen.has(k.wert) || !taugt(k)) continue;
      gesehen.add(k.wert);
      raus.push(k);
      if (raus.length === 2) break;
    }
  }
  return raus;
}

/**
 * Formatiert die falschen Werte wie das Ergebnis und gibt sie mit Begründung aus.
 *
 * Braucht mindestens zwei Stück – eine Aufgabe mit nur einer falschen Antwort
 * wäre keine Multiple-Choice-Aufgabe.
 */
export function falscheAntworten(
  rezept: Rezept,
  richtig: number,
  einheit: string,
): { text: string; grund: string }[] {
  const raus: { text: string; grund: string }[] = [];
  for (const d of distraktorenFuer(rezept, richtig, einheit)) {
    const text = formatiereWert(d.wert, einheit);
    if (text === formatiereWert(richtig, einheit)) continue;
    if (raus.some((r) => r.text === text)) continue;
    raus.push({ text, grund: d.grund });
    if (raus.length === 2) break;
  }
  return raus;
}
