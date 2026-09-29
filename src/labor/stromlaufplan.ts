/**
 * Stromlaufplan-Editor (Datenmodell und Prüflogik).
 *
 * Der Kundenauftrag verlangt unter anderem, einen Stromlaufplan zu
 * erstellen, zu ergänzen und zu prüfen. Dieses Modell bildet genau das ab –
 * ohne Zeichenfläche, aber mit derselben Logik: Knoten, Leitungen, Betriebsmittel
 * und eine Prüfung, die typische Prüfungsfehler findet.
 *
 * Wichtig: Die Prüfung arbeitet ausschließlich mit der Faktenbasis und den
 * Regeln aus `engine/calc`. Sie erfindet keine Werte.
 */

import { holeFakt } from '../content/facts/index.ts';
import { kleinsterAusloesestrom, strombelastbarkeit, waehleAbsicherung } from '../engine/calc/index.ts';
import type { Kennlinie, Rechenweg } from '../engine/calc/index.ts';

export type KnotenTyp = 'quelle' | 'verbraucher' | 'schutz' | 'verteiler' | 'potential';

export interface Knoten {
  id: string;
  typ: KnotenTyp;
  bezeichnung: string;
  /** Nur bei 'quelle': Nennspannung in V. */
  ueberspannung?: number;
  /** Nur bei 'quelle': Kurzschlussleistung in W. */
  kurzschlussleistung?: number;
}

export interface Leitung {
  id: string;
  von: string;
  nach: string;
  /** Leiterquerschnitt in mm². */
  querschnitt: number;
  verlegeart: string;
  material: 'Cu' | 'Al';
  anzahlAdern: number;
  laengeM: number;
}

export interface Betriebsmittel {
  id: string;
  /** Leitungsschutzschalter. */
  art: 'LS' | 'FI' | 'FI_LS' | 'Schmelzleiter' | 'Transformator' | 'Trafo';
  bezeichnung: string;
  /** Angeschlossener Verbraucher bzw. geschützter Stromkreis. */
  knotenId: string;
  /** LS: Absicherungswert in A. */
  absicherungA?: number;
  /** LS: Auslösekennlinie. */
  kennlinie?: Kennlinie;
  /** FI: Bemessungsfehlerstrom in mA. */
  idnMa?: number;
  /** Trafo: Nennleistung in VA. */
  leistungVa?: number;
  /** Trafo: primäre/sekundäre Nennspannung. */
  u1?: number;
  u2?: number;
}

export interface Anlage {
  id: string;
  titel: string;
  knoten: Knoten[];
  leitungen: Leitung[];
  mittel: Betriebsmittel[];
  /** Gewählter Rechenweg für die Leitungsdimensionierung. */
  rechenweg: Rechenweg;
}

export interface Befund {
  schwere: 'fehler' | 'warnung' | 'hinweis';
  betrifft: string;
  text: string;
  /** Rechtsgrundlage / Fakt. */
  beleg?: string;
  /** Wie der Befund behoben wird. */
  abhilfe?: string;
}

/** Baut eine leere Anlage als Ausgangspunkt für den Editor. */
export function leereAnlage(titel = 'Neue Anlage'): Anlage {
  return { id: `anlage_${Date.now().toString(36)}`, titel, knoten: [], leitungen: [], mittel: [], rechenweg: 'referenz-iz' };
}

/**
 * Prüft eine Anlage auf die Fehler, die in der Prüfung typisch sind.
 *
 * Die Liste ist bewusst kurz und dafür präzise: fünf Fehlerarten decken den
 * Großteil der Punkte im Kundenauftrag ab.
 */
export function pruefeAnlage(anlage: Anlage): Befund[] {
  const befunde: Befund[] = [];
  const knotenIndex = new Map(anlage.knoten.map((k) => [k.id, k]));

  // 1. Verweisfehler – ein Lappen, der in der echten Prüfung sofort auffällt.
  for (const leitung of anlage.leitungen) {
    for (const ende of [leitung.von, leitung.nach] as const) {
      if (!knotenIndex.has(ende)) {
        befunde.push({
          schwere: 'fehler',
          betrifft: leitung.id,
          text: `Leitung ${leitung.id} ist mit dem unbekannten Knoten „${ende}" verbunden.`,
          abhilfe: 'Knoten anlegen oder Leitung neu zeichnen.',
        });
      }
    }
  }
  for (const mittel of anlage.mittel) {
    if (!knotenIndex.has(mittel.knotenId)) {
      befunde.push({
        schwere: 'fehler',
        betrifft: mittel.id,
        text: `${mittel.bezeichnung} hängt an einem unbekannten Knoten.`,
        abhilfe: 'Verbraucher anlegen und zuordnen.',
      });
    }
  }

  // 2. Quellen ohne Spannungsangabe
  for (const knoten of anlage.knoten.filter((k) => k.typ === 'quelle')) {
    if (!knoten.ueberspannung) {
      befunde.push({
        schwere: 'fehler',
        betrifft: knoten.id,
        text: `Die Einspeisung „${knoten.bezeichnung}" hat keine Nennspannung.`,
        abhilfe: 'Nennspannung eintragen – ohne sie ist keine Stromberechnung möglich.',
      });
    }
  }

  // 3. Fehlende Absicherung des Stromkreises
  const abgesicherteKnoten = new Set(anlage.mittel.filter((m) => m.art === 'LS' || m.art === 'FI_LS' || m.art === 'Schmelzleiter').map((m) => m.knotenId));
  for (const knoten of anlage.knoten.filter((k) => k.typ === 'verbraucher')) {
    if (!abgesicherteKnoten.has(knoten.id)) {
      const hatLeitung = anlage.leitungen.some((l) => l.von === knoten.id || l.nach === knoten.id);
      if (hatLeitung) {
        befunde.push({
          schwere: 'fehler',
          betrifft: knoten.id,
          text: `Der Stromkreis „${knoten.bezeichnung}" ist nicht abgesichert.`,
          beleg: 'Ohne Überstromschutz besteht Brandgefahr.',
          abhilfe: 'Leitungsschutzschalter in der Reihenfolge Quelle → Verbraucher setzen.',
        });
      }
    }
  }

  // 4. Fehlender Fehlerstromschutz
  const hatFi = anlage.mittel.some((m) => m.art === 'FI' || m.art === 'FI_LS');
  if (!hatFi && anlage.knoten.some((k) => k.typ === 'verbraucher')) {
    befunde.push({
      schwere: 'fehler',
      betrifft: 'anlage',
      text: 'In der Anlage ist kein Fehlerstromschutz vorhanden.',
      abhilfe: 'FI-Schutzschalter ergänzen, z. B. 30 mA für Steckdosen und feuchte Räume.',
    });
  }

  // 5. Absicherung und Leitung passen nicht zusammen
  for (const mittel of anlage.mittel) {
    if (mittel.art !== 'LS' && mittel.art !== 'FI_LS') continue;
    const leitung = anlage.leitungen.find((l) => l.nach === mittel.knotenId || l.von === mittel.knotenId);
    if (!leitung || !mittel.absicherungA) continue;

    const verbraucher = anlage.knoten.find((k) => k.id === mittel.knotenId && k.typ === 'verbraucher');
    const leistungW = verbraucher ? leistungAusBezifferung(verbraucher.bezeichnung) : null;
    // Spannung am Verbraucher, nicht an der Einspeisung: ein einphasiger
    // Verbraucher an einem 400-V-Netz wird mit 230 V gerechnet.
    const u0 =
      (verbraucher?.ueberspannung ?? anlage.knoten.find((k) => k.typ === 'quelle')?.ueberspannung) || null;
    if (leistungW === null || !u0) continue;
    // Ohne Wirkleistungsfaktor wird mit cos φ = 1 gerechnet. Das ist die
    // übliche Annahme für die Absicherung – und sie wird hier ausgewiesen.
    const belastungA = leistungW / u0;

    const belastbar = strombelastbarkeit({
      querschnittMm2: leitung.querschnitt,
      weg: anlage.rechenweg,
    });

    if (belastbar.wert < mittel.absicherungA) {
      befunde.push({
        schwere: 'fehler',
        betrifft: mittel.id,
        text:
          `Der Leitungsschutzschalter ${mittel.absicherungA} A ist größer als die ` +
          `Belastbarkeit der Leitung (${belastbar.wert.toFixed(2)} A bei ${leitung.querschnitt} mm²).`,
        beleg: belastbar.regel,
        abhilfe: 'Absicherung verringern oder stärkeren Leiterquerschnitt wählen.',
      });
    }

    if (mittel.kennlinie && belastungA > kleinsterAusloesestrom(mittel.absicherungA, mittel.kennlinie)) {
      befunde.push({
        schwere: 'fehler',
        betrifft: mittel.id,
        text:
          `Der Verbraucher zieht ${belastungA.toFixed(1)} A. Ein LS ${mittel.absicherungA} A ` +
          `Kennlinie ${mittel.kennlinie} löst erst bei ` +
          `${kleinsterAusloesestrom(mittel.absicherungA, mittel.kennlinie).toFixed(1)} A aus.`,
        abhilfe: 'Höhere Absicherung oder passende Kennlinie wählen.',
      });
    }

    if (belastungA > mittel.absicherungA) {
      // Die Engine wirft, wenn der Bemessungsstrom über der Belastbarkeit liegt.
      // Genau das ist dann schon der eigentliche Befund – die Empfehlung entfällt.
      let abhilfe = 'Höheren Leiterquerschnitt wählen.';
      try {
        const empfohlen = waehleAbsicherung({
          bemessungsstromA: belastungA,
          querschnittMm2: leitung.querschnitt,
          weg: anlage.rechenweg,
          kennlinie: mittel.kennlinie,
        });
        abhilfe =
          `Richtwert nach ${anlage.rechenweg === 'schultabelle' ? 'Schultabelle' : 'Referenz-I_z'}: ` +
          `${empfohlen.standardwertA} A, Kennlinie ${empfohlen.anlagentyp}.`;
      } catch {
        abhilfe = `Für ${belastungA.toFixed(1)} A ist ${leitung.querschnitt} mm² zu klein – Leitung verstärken.`;
      }
      befunde.push({
        schwere: 'fehler',
        betrifft: mittel.id,
        text: `Belastung ${belastungA.toFixed(1)} A liegt über der Absicherung ${mittel.absicherungA} A.`,
        abhilfe,
      });
    }
  }

  // 6. Fehlende Abschaltmöglichkeit
  const schalterOhneAnschluss = anlage.mittel.filter(
    (m) => !anlage.leitungen.some((l) => l.von === m.knotenId || l.nach === m.knotenId),
  );
  for (const mittel of schalterOhneAnschluss) {
    befunde.push({
      schwere: 'warnung',
      betrifft: mittel.id,
      text: `${mittel.bezeichnung} ist nicht in einen Stromkreis eingebaut.`,
      abhilfe: 'Leitung zum Verbraucher ergänzen.',
    });
  }

  // 7. PE-Leiter fehlt
  if (anlage.knoten.some((k) => k.typ === 'verbraucher') && !anlage.knoten.some((k) => k.typ === 'potential')) {
    befunde.push({
      schwere: 'warnung',
      betrifft: 'anlage',
      text: 'Kein Schutzleiter (PE) eingezeichnet.',
      abhilfe: 'PE als eigenen Knoten führen – er gehört in den Stromlaufplan.',
    });
  }

  return befunde;
}

/**
 * Liest die Leistung aus einer Bezifferung wie „3000 W" oder „2 kW".
 * Gibt null zurück, wenn keine Leistung erkennbar ist.
 */
export function leistungAusBezifferung(bezeichnung: string): number | null {
  const kW = bezeichnung.match(/([\d.,]+)\s*kW/i);
  if (kW) return zifferZuZahl(kW[1]!) * 1000;
  const w = bezeichnung.match(/([\d.,]+)\s*W/i);
  if (w) return zifferZuZahl(w[1]!);
  return null;
}

function zifferZuZahl(text: string): number {
  return Number(text.replace(',', '.'));
}

/** Kurzstatistik für die Oberfläche. */
export interface AnlageKennzahlen {
  knoten: number;
  leitungen: number;
  mittel: number;
  fehler: number;
  warnungen: number;
  vollstaendig: boolean;
}

export function anlageKennzahlen(anlage: Anlage): AnlageKennzahlen {
  const befunde = pruefeAnlage(anlage);
  const fehler = befunde.filter((b) => b.schwere === 'fehler').length;
  return {
    knoten: anlage.knoten.length,
    leitungen: anlage.leitungen.length,
    mittel: anlage.mittel.length,
    fehler,
    warnungen: befunde.filter((b) => b.schwere === 'warnung').length,
    vollstaendig: fehler === 0 && anlage.knoten.length > 0,
  };
}

/**
 * Musteranlage für die Übung: Unterverteilung mit zwei Stromkreisen.
 * Dient als Startpunkt und als Vergleich für die eigene Planung.
 */
export function musterAnlage(): Anlage {
  return {
    id: 'muster-uv',
    titel: 'Unterverteilung Licht und Steckdosen',
    rechenweg: 'referenz-iz',
    knoten: [
      { id: 'q1', typ: 'quelle', bezeichnung: 'Netzeinspeisung 400 V', ueberspannung: 400, kurzschlussleistung: 250_000 },
      { id: 'pe', typ: 'potential', bezeichnung: 'Schutzleiter PE' },
      { id: 'uv', typ: 'verteiler', bezeichnung: 'Unterverteilung' },
      { id: 'l1', typ: 'verbraucher', bezeichnung: 'Lichtkreis 1200 W Leuchte', ueberspannung: 230 },
      { id: 's1', typ: 'verbraucher', bezeichnung: 'Steckdosen 3000 W', ueberspannung: 230 },
    ],
    leitungen: [
      { id: 'w1', von: 'q1', nach: 'uv', querschnitt: 10, verlegeart: 'A2', material: 'Cu', anzahlAdern: 4, laengeM: 12 },
      { id: 'w2', von: 'uv', nach: 'l1', querschnitt: 1.5, verlegeart: 'A2', material: 'Cu', anzahlAdern: 3, laengeM: 8 },
      { id: 'w3', von: 'uv', nach: 's1', querschnitt: 2.5, verlegeart: 'A2', material: 'Cu', anzahlAdern: 3, laengeM: 11 },
    ],
    mittel: [
      { id: 'm1', art: 'FI_LS', bezeichnung: 'FI/LS 30 mA, B10', knotenId: 'l1', absicherungA: 10, kennlinie: 'B', idnMa: 30 },
      { id: 'm2', art: 'FI_LS', bezeichnung: 'FI/LS 30 mA, B16', knotenId: 's1', absicherungA: 16, kennlinie: 'B', idnMa: 30 },
    ],
  };
}

/** Faktenbezug für die Musteranlage, damit der Lernpfad verknüpft bleibt. */
export function anlageFakten(): string[] {
  return ['formel-abschaltbedingung', 'absicherung-schultabelle', 'ls-kennlinie-b-magnetisch', 'idn-personenschutz']
    .map((id) => holeFakt(id)?.bezeichnung)
    .filter((b): b is string => Boolean(b));
}
