/**
 * Mess- und Prüfprotokoll.
 *
 * Im Kundenauftrag wird gemessen, bewertet und protokolliert. Dieses Modul
 * bildet die Prüfschritte mit ihren Grenzwerten ab.
 *
 * Grundsatz: Eine Grenze ist entweder ein geprüfter Fakt aus der Faktenbasis
 * oder sie wird aus einer Formel hergeleitet. Es gibt keinen dritten Fall.
 * Schritte ohne eigenen Zahlenwert (Durchgang, Schleifenwiderstand) tragen
 * deshalb ausdrücklich `grenzeOhneZahl` statt einer erfundenen Grenze – in der
 * echten Prüfung wäre eine feste Zahl an dieser Stelle ohnehin falsch.
 */

import { holeFakt } from '../content/facts/index.ts';
import { SPANNUNGSFALL_GANZWERT, SPANNUNGSFALL_MAX } from '../engine/calc/index.ts';

export type PruefSchrittId =
  | 'durchgang-pe'
  | 'durchgang-leiter'
  | 'isolationswiderstand'
  | 'schleifenwiderstand'
  | 'ausloesezeit'
  | 'fehlerstrom'
  | 'spannungsfall';

/** Wie die Grenze zustande kommt. */
export type GrenzHerkunft =
  | { art: 'fakt'; faktId: string }
  | { art: 'formel'; formelFaktId: string; hinweis: string }
  | { art: 'konstant'; wert: number; einheit: string; beleg: string };

export interface PruefSchritt {
  id: PruefSchrittId;
  titel: string;
  messpunkt: string;
  geraet: string;
  grenze: GrenzHerkunft;
  /** Faktor, mit dem der Faktwert in die Anzeigeeinheit umgerechnet wird. */
  einheitFaktor: number;
  einheit: string;
  /** Größer als die Grenze ist gut (Widerstand) – sonst ist kleiner besser. */
  richtung: 'obergrenze' | 'untergrenze';
  bewertung: string;
  punkte: number;
}

export const PRUEFSCHRITTE: PruefSchritt[] = [
  {
    id: 'durchgang-pe',
    titel: 'Durchgangsprüfung des Schutzleiters',
    messpunkt: 'PE-Klemme – Erder oder Potentialausgleich',
    geraet: 'Durchgangsprüfer, Messstrom möglichst hoch',
    grenze: {
      art: 'formel',
      formelFaktId: 'formel-abschaltbedingung',
      hinweis:
        'Der Schutzleiter muss so niedrigohmig sein, dass der Fehlerstrom den ' +
        'Schutz auslöst. Die Grenze ergibt sich aus R_A ≤ U₀ / I_Δn und wird ' +
        'für den konkreten Stromkreis berechnet – nicht gemerkt.',
    },
    einheitFaktor: 1,
    einheit: 'Ω',
    richtung: 'obergrenze',
    bewertung:
      'Niedriger Übergangswiderstand ist entscheidend: ein zu hoher Wert ' +
      'verhindert, dass der Schutzleiter den Fehlerstrom ableitet.',
    punkte: 3,
  },
  {
    id: 'durchgang-leiter',
    titel: 'Durchgang der Betriebsleiter',
    messpunkt: 'Einspeisung – Verbraucher, Leitung herausgenommen',
    geraet: 'Durchgangsprüfer',
    grenze: {
      art: 'formel',
      formelFaktId: 'formel-spannungsfall-einphasig',
      hinweis:
        'Bewertet wird der Spannungsfall unter Last, nicht ein fester ' +
        'Widerstandswert. Grenze 3 % der Nennspannung, bei Verbrauchern mit ' +
        'hoher Leistung 5 %.',
    },
    einheitFaktor: 1,
    einheit: 'Ω',
    richtung: 'obergrenze',
    bewertung:
      'Der Wert wird zusammen mit der Leitungslänge bewertet. Ein hoher ' +
      'Widerstand spricht für zu geringen Querschnitt oder schlechte Klemmen.',
    punkte: 2,
  },
  {
    id: 'isolationswiderstand',
    titel: 'Isolationswiderstand',
    messpunkt: 'Leiter gegen Erde, alle Verbraucher getrennt',
    geraet: 'Isolationsmessgerät, 500 V DC',
    grenze: { art: 'fakt', faktId: 'riso-grenzwert' },
    einheitFaktor: 1,
    einheit: 'MΩ',
    richtung: 'untergrenze',
    bewertung:
      'Wird der Mindestwert unterschritten, wird die Ursache gesucht und ' +
      'beseitigt. Die Prüfspannung zu erhöhen, um den Wert zu schönen, ist ' +
      'ausdrücklich falsch.',
    punkte: 3,
  },
  {
    id: 'schleifenwiderstand',
    titel: 'Schleifenwiderstand',
    messpunkt: 'Einspeisung – weitester Verbraucher der Gruppe',
    geraet: 'Schleifenwiderstandsmessgerät mit Strommessung',
    grenze: {
      art: 'formel',
      formelFaktId: 'formel-schleifenwiderstand',
      hinweis:
        'R_A ≤ U₀ / I_Δn. Erst dieser Vergleich zeigt, ob der ' +
        'Fehlerstromschutz rechtzeitig anspricht.',
    },
    einheitFaktor: 1,
    einheit: 'Ω',
    richtung: 'obergrenze',
    bewertung:
      'Der Messwert wird mit der Abschaltbedingung geprüft und protokolliert, ' +
      'nicht mit einem auswendig gelernten Grenzwert.',
    punkte: 4,
  },
  {
    id: 'ausloesezeit',
    titel: 'Auslösezeit des Fehlerstromschutzes',
    messpunkt: 'FI-Schalter, bei 1-fach und 3-fach Fehlerstrom',
    geraet: 'FI-Prüfgerät',
    grenze: { art: 'fakt', faktId: 'abschaltzeit-0-3s' },
    einheitFaktor: 1,
    einheit: 's',
    richtung: 'obergrenze',
    bewertung:
      'Bei 1-fachem Fehlerstrom sind an der Verbraucherstelle höchstens ' +
      '300 ms zulässig. Länger heißt: Der Schutz schützt nicht ausreichend.',
    punkte: 4,
  },
  {
    id: 'fehlerstrom',
    titel: 'Funktionsprüfung des Fehlerstromschutzes',
    messpunkt: 'FI-Schalter über Testtaste bzw. Prüfgerät',
    geraet: 'FI-Prüfgerät',
    grenze: { art: 'fakt', faktId: 'idn-personenschutz' },
    // Der Fakt liegt in Ampere, protokolliert wird in mA.
    einheitFaktor: 1000,
    einheit: 'mA',
    richtung: 'obergrenze',
    bewertung:
      'Der Testtaster muss den Schalter auslösen. Löst er nicht aus, ist die ' +
      'Schutzwirkung nicht mehr gegeben – unabhängig vom Messwert.',
    punkte: 2,
  },
  {
    id: 'spannungsfall',
    titel: 'Spannungsfall unter Last',
    messpunkt: 'Einspeisung – Verbraucher, bei Volllast',
    geraet: 'Multimeter, zwei Messungen',
    grenze: {
      art: 'konstant',
      wert: SPANNUNGSFALL_GANZWERT,
      einheit: '%',
      beleg: 'Vorgabe der Elektroinstallation, in der Rechen-Engine hinterlegt',
    },
    einheitFaktor: 1,
    einheit: '%',
    richtung: 'obergrenze',
    bewertung:
      `Der Spannungsfall darf ${SPANNUNGSFALL_GANZWERT} % nicht überschreiten, ` +
      `in Verbrauchern mit hoher Leistung ${SPANNUNGSFALL_MAX} %.`,
    punkte: 3,
  },
];

/**
 * Liefert die Grenze eines Schritts in der Anzeigeeinheit.
 * Gibt null zurück, wenn die Grenze aus einer Formel folgt und für den
 * konkreten Fall erst berechnet werden muss.
 */
export function grenzwert(
  schritt: PruefSchritt,
  berechneteGrenze?: number,
): number | null {
  switch (schritt.grenze.art) {
    case 'fakt': {
      const fakt = holeFakt(schritt.grenze.faktId);
      return fakt?.wert === undefined ? null : fakt.wert * schritt.einheitFaktor;
    }
    case 'konstant':
      return schritt.grenze.wert;
    case 'formel':
      return berechneteGrenze ?? null;
  }
}

export interface ProtokollEintrag {
  schrittId: PruefSchrittId;
  messwert: number | null;
  einheit: string;
  /** Grenze in derselben Einheit wie `messwert`, oder null bei Formelgrenze. */
  grenze: number | null;
  /** Herkunft der Grenze, wird im Protokoll mitprotokolliert. */
  grenzHerkunft: GrenzHerkunft;
  zeitpunkt: string;
  durchgefuehrt: boolean;
  bemerkung: string;
  /** Grenze, die du für diesen Stromkreis selbst berechnet hast. */
  berechneteGrenze?: number;
}

export function schrittZuEintrag(schritt: PruefSchritt, berechneteGrenze?: number): ProtokollEintrag {
  return {
    schrittId: schritt.id,
    messwert: null,
    einheit: schritt.einheit,
    grenze: grenzwert(schritt, berechneteGrenze),
    grenzHerkunft: schritt.grenze,
    zeitpunkt: '',
    durchgefuehrt: false,
    bemerkung: '',
    ...(berechneteGrenze === undefined ? {} : { berechneteGrenze }),
  };
}

/**
 * Legt das Protokoll an.
 *
 * @param kontext Nennspannung und Bemessungsfehlerstrom des geprüften
 *   Stromkreises. Damit werden die Formelgrenzen berechenbar, statt sie offen
 *   zu lassen.
 */
export function leeresProtokoll(kontext?: { u0: number; idnA: number }): ProtokollEintrag[] {
  const abschaltgrenze = kontext ? kontext.u0 / kontext.idnA : undefined;
  return PRUEFSCHRITTE.map((schritt) => {
    switch (schritt.id) {
      case 'durchgang-pe':
      case 'schleifenwiderstand':
        return schrittZuEintrag(schritt, abschaltgrenze);
      case 'durchgang-leiter':
        return schrittZuEintrag(schritt);
      default:
        return schrittZuEintrag(schritt);
    }
  });
}

export interface MesswertUrteil {
  bestanden: boolean | null;
  regel: string;
}

/**
 * Bewertet einen Messwert.
 *
 * `null` bedeutet: nicht bewertbar – entweder fehlt der Wert oder die Grenze
 * hängt an einer Formel, die für diesen Fall noch nicht ausgewertet wurde.
 * Das ist ein ehrliches "kein Urteil" statt eines erfundenen.
 */
export function bewerteMesswert(
  _schrittId: PruefSchrittId,
  messwert: number,
  grenzwertWert: number | null,
  richtung: 'obergrenze' | 'untergrenze',
): MesswertUrteil {
  if (messwert === null || Number.isNaN(messwert)) {
    return { bestanden: null, regel: 'Kein Messwert eingetragen.' };
  }
  if (grenzwertWert === null || Number.isNaN(grenzwertWert)) {
    return { bestanden: null, regel: 'Grenze muss für diesen Stromkreis berechnet werden.' };
  }
  const bestanden = richtung === 'untergrenze' ? messwert >= grenzwertWert : messwert <= grenzwertWert;
  const vergleich = richtung === 'untergrenze' ? '≥' : '≤';
  return { bestanden, regel: `${messwert} ${vergleich} ${grenzwertWert}` };
}

export interface ProtokollAuswertung {
  eintraege: ProtokollEintrag[];
  bestanden: boolean;
  fehlerhafte: PruefSchritt[];
  offene: PruefSchritt[];
  nichtBewertbar: PruefSchritt[];
  quote: number;
  punkte: number;
  maxPunkte: number;
}

export function bewerteProtokoll(eintraege: ProtokollEintrag[]): ProtokollAuswertung {
  const fehlerhafte: PruefSchritt[] = [];
  const offene: PruefSchritt[] = [];
  const nichtBewertbar: PruefSchritt[] = [];
  let erfuellt = 0;
  let punkte = 0;

  for (const eintrag of eintraege) {
    const schritt = PRUEFSCHRITTE.find((s) => s.id === eintrag.schrittId);
    if (!schritt) continue;
    if (!eintrag.durchgefuehrt || eintrag.messwert === null) {
      offene.push(schritt);
      continue;
    }
    const urteil = bewerteMesswert(schritt.id, eintrag.messwert, eintrag.grenze, schritt.richtung);
    if (urteil.bestanden === true) {
      erfuellt += 1;
      punkte += schritt.punkte;
    } else if (urteil.bestanden === false) {
      fehlerhafte.push(schritt);
    } else {
      nichtBewertbar.push(schritt);
    }
  }

  return {
    eintraege,
    bestanden: fehlerhafte.length === 0 && offene.length === 0,
    fehlerhafte,
    offene,
    nichtBewertbar,
    quote: eintraege.length > 0 ? erfuellt / eintraege.length : 0,
    punkte,
    maxPunkte: PRUEFSCHRITTE.reduce((s, p) => s + p.punkte, 0),
  };
}

/** Deutsches Zahlenformat – Grenzwerte stehen sonst als '0.3' in der Anzeige. */
export function formatiereZahl(wert: number, stellen = 2): string {
  if (!Number.isFinite(wert)) return '—';
  const text = wert.toFixed(stellen);
  const punkt = text.indexOf('.');
  if (punkt < 0) return text;
  const nachkomma = text.slice(punkt + 1).replace(/0+$/, '');
  const ganz = nachkomma === '' ? text.slice(0, punkt) : `${text.slice(0, punkt)}.${nachkomma}`;
  return ganz.replace('.', ',');
}

/** Verwendete Nennspannungen und Fehlerströme für die Auswahlfelder. */
export function verfuegbareSpannungen(): number[] {
  return ['u0-230', 'u0-400', 'u0-24', 'u0-50']
    .map((id) => holeFakt(id)?.wert)
    .filter((w): w is number => typeof w === 'number');
}

export function verfuegbareFehlerstroemeA(): number[] {
  return ['idn-personenschutz', 'idn-feuchteraum', 'idn-baustelle-30ma']
    .map((id) => holeFakt(id)?.wert)
    .filter((w): w is number => typeof w === 'number');
}

/**
 * Musterprotokoll einer Anlage mit zwei eingebauten Fehlern.
 *
 * Der Nutzer soll daran üben, die Fehler zu finden: zu kleiner
 * Isolationswiderstand und zu großer Spannungsfall.
 */
export function musterProtokoll(): ProtokollEintrag[] {
  const kontext = { u0: 230, idnA: 0.03 };
  const abschaltgrenze = kontext.u0 / kontext.idnA;
  return PRUEFSCHRITTE.map((schritt) => {
    const eintrag = schrittZuEintrag(schritt, abschaltgrenze);
    switch (schritt.id) {
      case 'durchgang-pe':
        return { ...eintrag, messwert: 0.42, durchgefuehrt: true, zeitpunkt: '09:15', bemerkung: 'PE-Klemme bis Erdungsleitung' };
      case 'durchgang-leiter':
        return { ...eintrag, messwert: 0.31, durchgefuehrt: true, zeitpunkt: '09:22', bemerkung: 'Lichtkreis, herausgenommene Leitung' };
      case 'isolationswiderstand':
        return { ...eintrag, messwert: 0.4, durchgefuehrt: true, zeitpunkt: '09:35', bemerkung: '500 V DC, Steckdosenkreis' };
      case 'schleifenwiderstand':
        return { ...eintrag, messwert: 0.9, durchgefuehrt: true, zeitpunkt: '10:02', bemerkung: '25 m bis Steckdose' };
      case 'ausloesezeit':
        return { ...eintrag, messwert: 0.28, durchgefuehrt: true, zeitpunkt: '10:20', bemerkung: '1-fach, 30 mA' };
      case 'fehlerstrom':
        return { ...eintrag, messwert: 30, durchgefuehrt: true, zeitpunkt: '10:31', bemerkung: 'Testtaste, trennt korrekt' };
      case 'spannungsfall':
        return { ...eintrag, messwert: 6.8, durchgefuehrt: true, zeitpunkt: '10:48', bemerkung: 'Steckdosen, Volllast' };
      default:
        return eintrag;
    }
  });
}

/**
 * Trägt einen gemessenen Wert in einen Protokolleintrag ein.
 *
 * Reine Funktion: Sie bekommt die Einträge und gibt neue zurück. Dadurch lässt
 * sich genau prüfen, was passiert – etwa dass eine unpassende Einheit nicht
 * stillschweigend übernommen wird. Ein Messwert in der falschen Einheit wäre
 * im Protokoll schlimmer als gar keiner, weil er plausibel aussieht.
 */
export function trageMesswertEin(
  eintraege: ProtokollEintrag[],
  schrittId: string,
  wert: number,
  einheit: string,
  zeitpunkt = new Date().toISOString(),
): { eintraege: ProtokollEintrag[]; uebernommen: boolean; grund?: string } {
  const index = eintraege.findIndex((e) => e.schrittId === schrittId);
  if (index < 0) {
    return { eintraege, uebernommen: false, grund: 'Diesen Schritt gibt es im Protokoll nicht.' };
  }

  const vorhanden = eintraege[index]!;
  if (vorhanden.einheit !== einheit) {
    return {
      eintraege,
      uebernommen: false,
      grund:
        `Der Schritt wird in ${vorhanden.einheit} geführt, gemessen wurde in ${einheit}. ` +
        'Die Werte müssen vorher umgerechnet werden.',
    };
  }

  const neu = [...eintraege];
  neu[index] = { ...vorhanden, messwert: wert, zeitpunkt, durchgefuehrt: true };
  return { eintraege: neu, uebernommen: true };
}
