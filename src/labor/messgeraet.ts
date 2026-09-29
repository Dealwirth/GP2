/**
 * Prüfgerät-Simulation.
 *
 * Das Ziel ist nicht ein hübsches Messgerät, sondern die eine Sache, die man
 * nur am echten Gerät lernt: **dass eine falsche Einstellung nicht null ergibt,
 * sondern einen plausibel aussehenden falschen Wert.** Wer die Spannung misst,
 * während der Drehschalter auf Widerstand steht, liest nicht „falsch", sondern
 * „O.L" – und wer die Messleitung in der Strom-Buchse stecken lässt, bekommt
 * bei einer Spannungsmessung eine Anzeige, die nach einem Ergebnis aussieht.
 *
 * Deshalb ist dieses Modul kein Rechner, sondern eine Nachbildung: Drehschalter
 * und Buchsen bestimmen, was das Gerät *tatsächlich* anzeigen würde. Die
 * Bewertung vergleicht anschließend mit dem, was zur Aufgabe gehört.
 *
 * Der elektrische Teil ist bewusst einfach und ehrlich:
 *  - Widerstände zwischen zwei Punkten sind ohmsch, ohne Blindanteil.
 *  - Wechselspannung gegen Gleichspannung ergibt keinen „halben" Wert, sondern
 *    eine Anzeige, die schwankt und nichts aussagt.
 *  - Ein Strommesser parallel zur Spannungsquelle ist ein Kurzschluss. In
 *    Wirklichkeit brennt dabei die Feinsicherung im Gerät durch.
 */

// ---------------------------------------------------------------------------
// Messpunkte
// ---------------------------------------------------------------------------

export type Potential = 'L1' | 'L2' | 'L3' | 'N' | 'PE' | 'leer';

export interface Messpunkt {
  id: string;
  bezeichnung: string;
  /** Welches Potential liegt an diesem Punkt an? */
  potential: Potential;
  /** Kurzhinweis für die Hilfe – was man hier erwartet. */
  hinweis: string;
}

/**
 * Ohm'sche Verbindung zwischen zwei Punkten.
 *
 * Nur wo eine steht, lässt sich ein Widerstand messen. Alles andere ist offen –
 * und genau das ist der Unterschied, den eine Widerstandsmessung zeigen soll.
 */
export interface Verbindung {
  a: string;
  b: string;
  ohm: number;
  bezeichnung: string;
  /** Nur bei getrennter Anlage messbar (Isolationsmessung, Durchgang). */
  spannungsfreiNoetig: boolean;
}

export interface Anlage {
  id: string;
  titel: string;
  /** Ist die Anlage eingeschaltet? Bestimmt, ob Spannung anliegt. */
  unterSpannung: boolean;
  punkte: Messpunkt[];
  verbindungen: Verbindung[];
}

/** Außenleiterspannung und Strangspannung im 230/400-V-Netz. */
export const U_STRANG = 230;
export const U_AUSSENLEITER = 400;

// ---------------------------------------------------------------------------
// Gerät
// ---------------------------------------------------------------------------

export type Messart =
  | 'aus'
  | 'spannung-ac'
  | 'spannung-dc'
  | 'widerstand'
  | 'durchgang'
  | 'isolation'
  | 'strom-ma'
  | 'strom-a';

export type Buchse = 'VΩ' | 'mA' | 'A';

export interface Geraet {
  messart: Messart;
  /** Die rote Messleitung. COM ist immer schwarz und wird nicht gewählt. */
  roteBuchse: Buchse;
}

export function startGeraet(): Geraet {
  return { messart: 'spannung-ac', roteBuchse: 'VΩ' };
}

export interface MessartInfo {
  id: Messart;
  beschriftung: string;
  einheit: string;
  /** Welche Buchse gehört fachlich dazu? */
  buchse: Buchse;
  /** Was diese Messart voraussetzt. */
  bedingung: string;
  symbol: string;
}

export const MESSARTEN: MessartInfo[] = [
  {
    id: 'aus',
    beschriftung: 'Aus',
    einheit: '',
    buchse: 'VΩ',
    bedingung: 'Drehschalter auf Aus – das Gerät misst nichts.',
    // Bewusst Text statt eines Symbolzeichens: Das übliche Netzzeichen wird
    // nicht auf jeder Plattform als Glyphe gefunden und erscheint dann als
    // leeres Kästchen.
    symbol: 'OFF',
  },
  {
    id: 'spannung-ac',
    beschriftung: 'Spannung ~',
    einheit: 'V',
    buchse: 'VΩ',
    bedingung: 'Parallel messen, Anlage unter Spannung.',
    symbol: 'V~',
  },
  {
    id: 'spannung-dc',
    beschriftung: 'Spannung ⎓',
    einheit: 'V',
    buchse: 'VΩ',
    bedingung: 'Parallel messen, für Batterien und Netzteile.',
    symbol: 'V⎓',
  },
  {
    id: 'widerstand',
    beschriftung: 'Widerstand Ω',
    einheit: 'Ω',
    buchse: 'VΩ',
    bedingung: 'Anlage spannungsfrei, sonst ist das Ergebnis wertlos.',
    symbol: 'Ω',
  },
  {
    id: 'durchgang',
    beschriftung: 'Durchgang',
    einheit: 'Ω',
    buchse: 'VΩ',
    bedingung: 'Anlage spannungsfrei. Piept unter etwa 30 Ω.',
    symbol: ')))',
  },
  {
    id: 'isolation',
    beschriftung: 'Isolation MΩ',
    einheit: 'MΩ',
    buchse: 'VΩ',
    bedingung: 'Anlage spannungsfrei und abgeklemmt. Prüfspannung 500 V.',
    symbol: 'MΩ',
  },
  {
    id: 'strom-ma',
    beschriftung: 'Strom mA',
    einheit: 'mA',
    buchse: 'mA',
    bedingung: 'In Reihe messen – der Stromkreis muss aufgetrennt werden.',
    symbol: 'mA',
  },
  {
    id: 'strom-a',
    beschriftung: 'Strom A',
    einheit: 'A',
    buchse: 'A',
    bedingung: 'In Reihe messen, nur in der 10-A-Buchse.',
    symbol: 'A',
  },
];

export function messartInfo(id: Messart): MessartInfo {
  return MESSARTEN.find((m) => m.id === id) ?? MESSARTEN[0]!;
}

// ---------------------------------------------------------------------------
// Anzeige
// ---------------------------------------------------------------------------

export interface Anzeige {
  /** Was im Display steht. */
  text: string;
  einheit: string;
  /** Zusatzhinweis, wenn die Messung inhaltlich nichts aussagt. */
  warnung?: string;
  /** Der gemessene Wert, sofern es einen sinnvollen gibt. */
  wert: number | null;
  /** Gefahr für Gerät oder Person. */
  gefahr?: 'gerät' | 'person';
  /** Ist das eine fachlich richtige Messung für die gestellte Aufgabe? */
  sinnvoll: boolean;
}

const LEER = 'O.L';
const UNABHÄNGIG = '– – –';

/**
 * Rechnet die Anzeige aus Drehschalter, Buchse und Messpunkten.
 *
 * Es gibt bewusst keinen Zweig, der „einfach den richtigen Wert" liefert.
 * Jede Kombination wird einzeln behandelt, weil jede in der Wirklichkeit etwas
 * anderes zeigt.
 */
export function messen(
  geraet: Geraet,
  anlage: Anlage,
  punktA: Messpunkt,
  punktB: Messpunkt,
): Anzeige {
  const info = messartInfo(geraet.messart);

  if (geraet.messart === 'aus') {
    return {
      text: UNABHÄNGIG,
      einheit: '',
      wert: null,
      sinnvoll: false,
      warnung: 'Das Gerät ist ausgeschaltet.',
    };
  }

  // Falsche Buchse: Die Messleitung steckt dort, wo sie nicht hingehört.
  // Bei einer Spannungs- oder Widerstandsmessung fließt dann kein Messstrom
  // durch die richtige Buchse – das Gerät zeigt null oder O.L, aber keinen
  // Fehlertext. Genau diese Verwechslung kostet in der Prüfung Punkte.
  if (geraet.roteBuchse !== info.buchse) {
    const folge =
      info.buchse === 'VΩ'
        ? '0 V und die Anzeige bleibt stehen'
        : `${LEER} – über die ${geraet.roteBuchse}-Buchse fließt kein Messstrom`;
    return {
      text: info.buchse === 'VΩ' ? '0,0' : LEER,
      einheit: info.buchse === 'VΩ' ? 'V' : info.einheit,
      wert: info.buchse === 'VΩ' ? 0 : null,
      sinnvoll: false,
      warnung:
        `Rote Leitung steckt in ${geraet.roteBuchse}, gehört aber in ${info.buchse}. ` +
        `Ein echtes Gerät zeigt ${folge}.`,
    };
  }

  switch (geraet.messart) {
    case 'spannung-ac':
      return spannung(anlage, punktA, punktB, 'ac');
    case 'spannung-dc':
      return spannung(anlage, punktA, punktB, 'dc');
    case 'widerstand':
      return widerstand(anlage, punktA, punktB, false);
    case 'durchgang':
      return widerstand(anlage, punktA, punktB, true);
    case 'isolation':
      return isolation(anlage, punktA, punktB);
    case 'strom-ma':
      return strom(anlage, punktA, punktB, 'mA');
    case 'strom-a':
      return strom(anlage, punktA, punktB, 'A');
  }
}

function spannung(
  anlage: Anlage,
  a: Messpunkt,
  b: Messpunkt,
  art: 'ac' | 'dc',
): Anzeige {
  if (!anlage.unterSpannung) {
    return {
      text: '0,0',
      einheit: 'V',
      wert: 0,
      sinnvoll: false,
      warnung: 'Die Anlage ist abgeschaltet – es liegt keine Spannung an.',
    };
  }

  if (a.id === b.id) {
    return {
      text: '0,0',
      einheit: 'V',
      wert: 0,
      sinnvoll: false,
      warnung: 'Beide Messspitzen liegen am selben Punkt.',
    };
  }

  const wert = spannungZwischen(a.potential, b.potential);

  if (wert === 0) {
    return {
      text: '0,0',
      einheit: 'V',
      wert: 0,
      sinnvoll: true,
      warnung:
        a.potential === 'PE' || b.potential === 'PE'
          ? 'Zwischen diesen Punkten besteht keine Potentialdifferenz.'
          : undefined,
    };
  }

  // Gleichspannung an Wechselspannung: Der wahre Wert steht nicht im Display.
  // Ein echtes Gerät zeigt einen kleinen, springenden Wert, oft mit falschem
  // Vorzeichen. Wer das für ein Ergebnis hält, zieht den falschen Schluss.
  if (art === 'dc') {
    return {
      text: '0,0',
      einheit: 'V',
      wert: 0,
      sinnvoll: false,
      warnung:
        `Am ${a.bezeichnung} liegt Wechselspannung an. Ein Gleichspannungsmesser ` +
        'zeigt dafür keine verwertbare Zahl, sondern einen springenden Wert nahe null. ' +
        'Für Netzspannung gehört der Drehschalter auf ' +
        `${messartInfo('spannung-ac').beschriftung}.`,
    };
  }

  return {
    text: formatZahl(wert),
    einheit: 'V',
    wert,
    sinnvoll: true,
  };
}

function spannungZwischen(a: Potential, b: Potential): number {
  if (a === b) return 0;
  const fremdphasig = (p: Potential): boolean => p === 'L1' || p === 'L2' || p === 'L3';
  // Zwei verschiedene Außenleiter: verkettete Spannung.
  if (fremdphasig(a) && fremdphasig(b) && a !== b) return U_AUSSENLEITER;
  // Außenleiter gegen N oder PE: Strangspannung.
  if (fremdphasig(a) || fremdphasig(b)) return U_STRANG;
  // N gegen PE: im TN-C-S-Netz nahe null, im Fehlerfall nicht.
  return 0;
}

function widerstand(
  anlage: Anlage,
  a: Messpunkt,
  b: Messpunkt,
  durchgang: boolean,
): Anzeige {
  const info = messartInfo(durchgang ? 'durchgang' : 'widerstand');

  // Widerstandsmessung an unter Spannung stehender Anlage. Das Gerät würde
  // in Wirklichkeit beschädigt; wir zeigen das ehrlich an, statt einen Wert
  // zu erfinden.
  if (anlage.unterSpannung) {
    return {
      text: LEER,
      einheit: info.einheit,
      wert: null,
      sinnvoll: false,
      gefahr: 'gerät',
      warnung:
        'Die Anlage steht unter Spannung. Eine Widerstandsmessung ist zulässig, ' +
        'wenn die Anlage spannungsfrei ist – sonst wird das Messgerät beschädigt. ' +
        'Erst freischalten, dann messen.',
    };
  }

  if (a.id === b.id) {
    return {
      text: '0,00',
      einheit: info.einheit,
      wert: 0,
      sinnvoll: false,
      warnung: 'Beide Messspitzen liegen am selben Punkt.',
    };
  }

  const verbindung = findeVerbindung(anlage, a.id, b.id);
  if (!verbindung) {
    return {
      text: LEER,
      einheit: info.einheit,
      wert: null,
      sinnvoll: true,
      warnung: `Zwischen ${a.bezeichnung} und ${b.bezeichnung} besteht keine leitende Verbindung.`,
    };
  }

  const unterbrechung =
    durchgang && verbindung.ohm >= 30
      ? ' Der Durchgangsprüfer piept nicht – der Übergangswiderstand ist zu hoch.'
      : undefined;

  return {
    text: durchgang ? formatZahl(verbindung.ohm, 1) : formatZahl(verbindung.ohm, 2),
    einheit: 'Ω',
    wert: verbindung.ohm,
    sinnvoll: true,
    warnung: unterbrechung,
  };
}

function isolation(anlage: Anlage, a: Messpunkt, b: Messpunkt): Anzeige {
  if (anlage.unterSpannung) {
    return {
      text: LEER,
      einheit: 'MΩ',
      wert: null,
      sinnvoll: false,
      gefahr: 'person',
      warnung:
        'Isolationsmessung an unter Spannung stehender Anlage ist verboten. ' +
        'Freischalten, gegen Wiedereinschalten sichern, Spannungsfreiheit feststellen.',
    };
  }

  const verbindung = findeVerbindung(anlage, a.id, b.id);

  // Eine leitende Verbindung zwischen den Punkten bedeutet einen Isolationsfehler.
  if (verbindung && verbindung.ohm < 1000) {
    return {
      text: formatZahl(verbindung.ohm / 1000, 2),
      einheit: 'MΩ',
      wert: verbindung.ohm / 1000,
      sinnvoll: true,
      warnung:
        `Durchgang zwischen den Punkten (${formatZahl(verbindung.ohm, 1)} Ω) – ` +
        'das ist eine Isolationsschwäche, kein gesunder Zustand.',
    };
  }

  // Keine leitende Verbindung: hoher Isolationswert. Der Wert wird aus den
  // Punktkennungen abgeleitet, damit dieselbe Messung immer dasselbe zeigt –
  // ein springender Wert wäre hier irreführend.
  const megaohm = verbindung ? 1 : 40 + ((a.id.length + b.id.length) % 20);
  return {
    text: formatZahl(megaohm, 1),
    einheit: 'MΩ',
    wert: megaohm,
    sinnvoll: true,
    warnung: megaohm >= 1 ? undefined : 'Unter 1 MΩ – der Wert liegt unter dem Mindestwert.',
  };
}

function strom(
  anlage: Anlage,
  a: Messpunkt,
  b: Messpunkt,
  art: 'mA' | 'A',
): Anzeige {
  const info = messartInfo(art === 'mA' ? 'strom-ma' : 'strom-a');

  if (!anlage.unterSpannung) {
    return {
      text: '0,0',
      einheit: info.einheit,
      wert: 0,
      sinnvoll: false,
      warnung: 'Die Anlage ist abgeschaltet – es fließt kein Strom.',
    };
  }

  // Zwischen zwei Punkten mit unterschiedlichem Potential gemessen, ohne den
  // Stromkreis aufzutrennen: Das ist ein Kurzschluss über das Messgerät.
  const differenz = spannungZwischen(a.potential, b.potential);
  if (differenz > 0) {
    return {
      text: LEER,
      einheit: 'A',
      wert: null,
      sinnvoll: false,
      gefahr: 'gerät',
      warnung:
        `Strommessung parallel zur Spannung: Zwischen ${a.bezeichnung} und ` +
        `${b.bezeichnung} liegen ${differenz} V an. Über das Messgerät fließt ein ` +
        'Kurzschlussstrom – in Wirklichkeit brennt die Feinsicherung durch. ' +
        'Ein Strommesser wird IMMER in Reihe geschaltet, der Stromkreis muss aufgetrennt werden.',
    };
  }

  return {
    text: '0,0',
    einheit: info.einheit,
    wert: 0,
    sinnvoll: true,
    warnung:
      'Zwischen diesen Punkten fließt kein Strom. Zum Messen muss der Verbraucher ' +
      'im Kreis liegen, nicht daneben.',
  };
}

function findeVerbindung(anlage: Anlage, a: string, b: string): Verbindung | undefined {
  return anlage.verbindungen.find(
    (v) => (v.a === a && v.b === b) || (v.a === b && v.b === a),
  );
}

/** Deutsche Zahlenschreibweise mit Komma. */
export function formatZahl(wert: number, stellen = 1): string {
  return wert.toFixed(stellen).replace('.', ',');
}

// ---------------------------------------------------------------------------
// Messaufgaben
// ---------------------------------------------------------------------------

export interface Messaufgabe {
  id: string;
  titel: string;
  /**
   * Zu welchem Schritt des Prüfprotokolls der Messwert gehört.
   *
   * Damit hängen Übung und Dokumentation zusammen: Wer richtig gemessen hat,
   * übernimmt den Wert mit einem Griff ins Protokoll – so wie in der Prüfung,
   * wo das Messergebnis am Ende im Protokoll stehen muss.
   */
  protokollSchritt: 'durchgang-pe' | 'isolationswiderstand' | 'schleifenwiderstand' | null;
  /** Einheit, in der das Protokoll den Wert erwartet. */
  protokollEinheit: string;
  /** Was zu messen ist, in Prüfungssprache. */
  auftrag: string;
  /** Welche Messart gehört dazu? */
  messart: Messart;
  buchse: Buchse;
  punktA: string;
  punktB: string;
  /** Muss die Anlage dafür spannungsfrei sein? */
  spannungsfrei: boolean;
  /** Was der Prüfer sehen will. */
  erwartung: string;
  /** Warum es so ist – der Lernsatz. */
  begruendung: string;
  punkte: number;
}

export const MESSAUFGABEN: Messaufgabe[] = [
  {
    id: 'netzspannung',
    titel: 'Netzspannung feststellen',
    auftrag:
      'Stelle vor der Arbeit fest, ob am Außenleiter gegen den Neutralleiter ' +
      'Netzspannung anliegt.',
    messart: 'spannung-ac',
    buchse: 'VΩ',
    punktA: 'l1',
    punktB: 'n',
    spannungsfrei: false,
    protokollSchritt: null,
    protokollEinheit: 'V',
    erwartung: '230 V Wechselspannung zwischen Außenleiter und Neutralleiter',
    begruendung:
      'Die Spannung wird parallel zur Anlage gemessen, der Drehschalter steht auf ' +
      'Wechselspannung. Zwischen Außenleiter und Neutralleiter liegen im 230/400-V-Netz ' +
      '230 V an.',
    punkte: 3,
  },
  {
    id: 'schutzleiter-durchgang',
    titel: 'Schutzleiter auf Durchgang prüfen',
    auftrag:
      'Prüfe, ob zwischen der Schutzleiterklemme und dem Potentialausgleich eine ' +
      'niederohmige Verbindung besteht.',
    messart: 'durchgang',
    buchse: 'VΩ',
    punktA: 'pe-klemme',
    punktB: 'pas',
    spannungsfrei: true,
    protokollSchritt: 'durchgang-pe',
    protokollEinheit: 'Ω',
    erwartung: 'Durchgang, der Widerstand liegt deutlich unter einem Ohm',
    begruendung:
      'Der Schutzleiter muss niederohmig durchgängig sein, damit der Fehlerstrom ' +
      'zurückfließen und der Schutz auslösen kann. Gemessen wird bei spannungsfreier ' +
      'Anlage zwischen den Klemmen, nicht gegen den Leiter.',
    punkte: 3,
  },
  {
    id: 'isolation',
    titel: 'Isolationswiderstand messen',
    auftrag:
      'Messe den Isolationswiderstand des Außenleiters gegen den Schutzleiter.',
    messart: 'isolation',
    buchse: 'VΩ',
    punktA: 'l1',
    punktB: 'pe',
    spannungsfrei: true,
    protokollSchritt: 'isolationswiderstand',
    protokollEinheit: 'MΩ',
    erwartung: 'Mindestens 1 MΩ bei 500 V Prüfspannung',
    begruendung:
      'Die Isolationsmessung erfolgt mit erhöhter Gleichspannung und darf nur an ' +
      'spannungsfreier, abgeklemmter Anlage durchgeführt werden. Sie zeigt, ob die ' +
      'Isolierung den Leiter noch sicher trennt.',
    punkte: 4,
  },
  {
    id: 'schleifenwiderstand',
    titel: 'Widerstand der Schutzleiterverbindung bestimmen',
    auftrag:
      'Bestimme den Übergangswiderstand zwischen Schutzleiterklemme und dem ' +
      'Erdungsanschluss.',
    messart: 'widerstand',
    buchse: 'VΩ',
    punktA: 'pe-klemme',
    punktB: 'erder',
    spannungsfrei: true,
    protokollSchritt: 'schleifenwiderstand',
    protokollEinheit: 'Ω',
    erwartung: 'Ein kleiner ohmscher Wert, unter einem Ohm',
    begruendung:
      'Ein zu hoher Übergangswiderstand verhindert, dass der Fehlerstrom den Schutz ' +
      'auslöst. Die Messung erfolgt spannungsfrei mit dem Widerstandsmessbereich – ' +
      'nicht mit dem Durchgangsprüfer allein, weil der Wert gebraucht wird.',
    punkte: 4,
  },
];

export function messaufgabe(id: string): Messaufgabe {
  return MESSAUFGABEN.find((a) => a.id === id) ?? MESSAUFGABEN[0]!;
}

/** Die Anlage, an der gemessen wird. */
export function messAnlage(unterSpannung = true): Anlage {
  return {
    id: 'verteiler',
    titel: 'Verteiler mit Außenleiter, Neutralleiter und Schutzleiter',
    unterSpannung,
    punkte: [
      { id: 'l1', bezeichnung: 'Außenleiter L1', potential: 'L1', hinweis: 'Führender Leiter, 230 V gegen N.' },
      { id: 'n', bezeichnung: 'Neutralleiter N', potential: 'N', hinweis: 'Rückleiter, im Betrieb nahe null.' },
      { id: 'pe', bezeichnung: 'Schutzleiter PE', potential: 'PE', hinweis: 'Schutzfunktion, im Fehlerfall führt er den Strom.' },
      { id: 'pe-klemme', bezeichnung: 'PE-Klemme im Verteiler', potential: 'PE', hinweis: 'Klemmstelle der Schutzleiter, hier setzt die Prüfung an.' },
      { id: 'pas', bezeichnung: 'Potentialausgleichsschiene', potential: 'PE', hinweis: 'Verbindung zum Baugrund, Bezugspunkt für Messungen.' },
      { id: 'erder', bezeichnung: 'Erdungsanschluss', potential: 'PE', hinweis: 'Verbindung in das Erdreich.' },
    ],
    verbindungen: [
      { a: 'pe-klemme', b: 'pas', ohm: 0.4, bezeichnung: 'Schutzleiter zur Potentialausgleichsschiene', spannungsfreiNoetig: true },
      { a: 'pe-klemme', b: 'erder', ohm: 0.8, bezeichnung: 'Schutzleiter zum Erdungsanschluss', spannungsfreiNoetig: true },
      { a: 'pas', b: 'erder', ohm: 0.6, bezeichnung: 'Potentialausgleich zum Erder', spannungsfreiNoetig: true },
    ],
  };
}

// ---------------------------------------------------------------------------
// Bewertung
// ---------------------------------------------------------------------------

export interface Messbefund {
  /** Alle vier Bedingungen erfüllt? */
  richtig: boolean;
  punkte: number;
  maxPunkte: number;
  /** Was falsch war, in der Reihenfolge, in der man es korrigieren würde. */
  maengel: string[];
  /** Was der Prüfer erwartet hätte. */
  erwartung: string;
}

/**
 * Bewertet eine durchgeführte Messung gegen die Aufgabe.
 *
 * Geprüft wird in der Reihenfolge, in der ein Fehler in der Praxis die
 * schlimmsten Folgen hat: erst Personensicherheit, dann Gerät, dann die
 * Einstellung, dann der Messort.
 */
export function bewerteMessung(
  aufgabe: Messaufgabe,
  geraet: Geraet,
  anlage: Anlage,
  punktA: string,
  punktB: string,
  anzeige: Anzeige,
): Messbefund {
  const maengel: string[] = [];

  const brauchtSpannungsfrei =
    aufgabe.messart === 'widerstand' ||
    aufgabe.messart === 'durchgang' ||
    aufgabe.messart === 'isolation';

  // Sicherheit zuerst: Was hier falsch läuft, ist keine Punktfrage mehr.
  if (anzeige.gefahr === 'person') {
    maengel.push('Lebensgefahr: Diese Messung ist an unter Spannung stehender Anlage verboten.');
  } else if (anzeige.gefahr === 'gerät') {
    maengel.push(`Das Messgerät wäre beschädigt worden. ${anzeige.warnung ?? ''}`.trim());
  }

  if (brauchtSpannungsfrei && anlage.unterSpannung) {
    maengel.push(
      'Die Anlage war nicht spannungsfrei. Bei ' +
        `${messartInfo(aufgabe.messart).beschriftung} muss vorher freigeschaltet werden.`,
    );
  }

  if (aufgabe.spannungsfrei === false && !anlage.unterSpannung) {
    maengel.push(
      'Die Anlage war abgeschaltet. Ohne Spannung lässt sich diese Messung nicht durchführen.',
    );
  }

  if (geraet.messart !== aufgabe.messart) {
    maengel.push(
      `Falsche Messart: eingestellt war ${messartInfo(geraet.messart).beschriftung}, ` +
        `richtig ist ${messartInfo(aufgabe.messart).beschriftung}.`,
    );
  }

  if (geraet.roteBuchse !== aufgabe.buchse) {
    maengel.push(
      `Falsche Buchse für die rote Leitung: gesteckt in ${geraet.roteBuchse}, ` +
        `richtig ist ${aufgabe.buchse}.`,
    );
  }

  const treffer =
    (punktA === aufgabe.punktA && punktB === aufgabe.punktB) ||
    (punktA === aufgabe.punktB && punktB === aufgabe.punktA);

  if (!treffer) {
    const anlagePunkte = new Map(anlage.punkte.map((p) => [p.id, p]));
    const a = anlagePunkte.get(punktA)?.bezeichnung ?? punktA;
    const b = anlagePunkte.get(punktB)?.bezeichnung ?? punktB;
    const sollA = anlagePunkte.get(aufgabe.punktA)?.bezeichnung ?? aufgabe.punktA;
    const sollB = anlagePunkte.get(aufgabe.punktB)?.bezeichnung ?? aufgabe.punktB;
    maengel.push(
      `Falscher Messort: gemessen zwischen ${a} und ${b}, richtig wäre zwischen ` +
        `${sollA} und ${sollB}.`,
    );
  }

  const richtig = maengel.length === 0;
  return {
    richtig,
    punkte: richtig ? aufgabe.punkte : 0,
    maxPunkte: aufgabe.punkte,
    maengel,
    erwartung: aufgabe.erwartung,
  };
}

/**
 * Hinweise, die den Lernenden führen, ohne die Lösung zu verraten.
 *
 * Bewusst gestaffelt: Der erste Hinweis nennt nur das Werkzeug, der zweite die
 * Messart, der dritte den Ort. Wer drei Hinweise braucht, hat die Aufgabe
 * trotzdem selbst gelöst – aber die Punkte sinken, wie in der Prüfung.
 */
export function hinweis(aufgabe: Messaufgabe, stufe: number): string {
  const buchseA = aufgabe.punktA;
  const buchseB = aufgabe.punktB;
  switch (stufe) {
    case 1:
      return 'Überlege zuerst: Welche physikalische Größe sollst du überhaupt bestimmen?';
    case 2:
      return `Dazu gehört die Messart „${messartInfo(aufgabe.messart).beschriftung}" mit der roten Leitung in ${aufgabe.buchse}.`;
    case 3:
      return (
        `Die Messspitzen gehören an ${buchseA} und ${buchseB}.` +
        (aufgabe.spannungsfrei
          ? ' Achtung: Vorher muss die Anlage spannungsfrei sein.'
          : ' Die Anlage bleibt eingeschaltet.')
      );
    default:
      return `Erwartet wird: ${aufgabe.erwartung}`;
  }
}

/** Punkte nach Hinweisstufe – in der Prüfung kostet ein Hinweis Punkte. */
export function punkteMitHinweisen(aufgabe: Messaufgabe, hinweisStufe: number): number {
  const abzug = Math.min(hinweisStufe, 3) * 0.15;
  return Math.max(0, aufgabe.punkte * (1 - abzug));
}
