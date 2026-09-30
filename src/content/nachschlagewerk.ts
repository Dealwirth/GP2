import type { Fact } from '../domain/types.ts';
import { holeFakt } from './facts/index.ts';

/**
 * Inhaltsverzeichnis für die Prüfungsvorbereitung.
 *
 * Zwei Dinge, die man in der Prüfung schnell braucht: welche Formel zu einem
 * Thema gehört und wo im Tabellenbuch oder in der Formelsammlung die
 * Verweisstelle steht. Beides steht hier beisammen, thematisch geordnet.
 *
 * Die Formeln sind KEINE eigene Sammlung: Jede verweist auf einen Fakt aus
 * der Faktenbasis. Der Text kommt von dort. So kann die Übersicht nicht von
 * dem abweichen, womit die Rechen-Engine und die Aufgaben arbeiten – der
 * häufigste Fehler in gedruckten Formelsammlungen.
 *
 * Die Seitenzahlen stammen aus dem Inhaltsverzeichnis des Tabellenbuchs und
 * der Formelsammlung. Sie sind Verweise, keine eigenen Werte.
 */

/** Verweisstelle in einem Nachschlagewerk. */
export interface Verweis {
  /** Seitenzahl oder Seitenbereich, z. B. „205" oder „97-99". */
  seite: string;
  /** Was dort steht. */
  was: string;
}

/** Ein Thema mit zugehörigen Formeln und Verweisstellen. */
export interface Thema {
  id: string;
  titel: string;
  /** Grobe Zuordnung, damit die Liste überschaubar bleibt. */
  gruppe: string;
  /** Formeln aus der Faktenbasis – die IDs werden dort aufgelöst. */
  formeln: string[];
  /** Verweisstellen im Tabellenbuch. */
  tabellenbuch: Verweis[];
  /** Verweisstellen in der Formelsammlung. */
  formelsammlung: Verweis[];
}

export const GRUPPEN = [
  'Grundlagen',
  'Leitung und Verlegung',
  'Schutz und Absicherung',
  'Prüfung und Messung',
  'Antriebe und Leistung',
  'Gebäudetechnik',
] as const;

export const THEMEN: Thema[] = [
  {
    id: 'grundlagen',
    titel: 'Grundgrößen der Elektrotechnik',
    gruppe: 'Grundlagen',
    formeln: ['formel-physikalisch'],
    tabellenbuch: [
      { seite: '43', was: 'Widerstandskennungen' },
      { seite: '451', was: 'Kennbuchstaben' },
      { seite: '453', was: 'Symbole' },
    ],
    formelsammlung: [{ seite: '20', was: 'Leitungswiderstand und Grundlagen' }],
  },
  {
    id: 'kapazitaet',
    titel: 'Kapazität und Kondensatoren',
    gruppe: 'Grundlagen',
    formeln: [],
    tabellenbuch: [{ seite: '37', was: 'Kondensatoren' }],
    formelsammlung: [{ seite: '37', was: 'Kapazität und Henry' }],
  },
  {
    id: 'wechselstrom',
    titel: 'Wechselstrom: U, R, I, P',
    gruppe: 'Grundlagen',
    formeln: ['formel-strom-einphasig', 'formel-cos-phi'],
    tabellenbuch: [{ seite: '201', was: 'Stromwirkung' }],
    formelsammlung: [{ seite: '39', was: 'Wechselstrom U/R/I/P' }],
  },
  {
    id: 'leitung',
    titel: 'Leitungswiderstand und Leitungskennzeichnung',
    gruppe: 'Leitung und Verlegung',
    formeln: ['formel-physikalisch'],
    tabellenbuch: [
      { seite: '57', was: 'Leitungskennzeichnung' },
      { seite: '97-99', was: 'Verlegearten' },
      { seite: '108', was: 'Installationsbereiche' },
      { seite: '80', was: 'Installationszonen' },
    ],
    formelsammlung: [{ seite: '20', was: 'Leitungswiderstand/Grundlagen' }],
  },
  {
    id: 'querschnitt',
    titel: 'Leiterquerschnitt und Spannungsfall',
    gruppe: 'Leitung und Verlegung',
    formeln: [
      'formel-spannungsfall-einphasig',
      'formel-spannungsfall-mit-cosphi',
    ],
    tabellenbuch: [{ seite: '97-99', was: 'Verlegearten' }],
    formelsammlung: [
      { seite: '71', was: 'Spannungsfall' },
      { seite: '78', was: 'Leiterquerschnitt' },
    ],
  },
  {
    id: 'netzsysteme',
    titel: 'Netzsysteme TN/TT',
    gruppe: 'Schutz und Absicherung',
    formeln: ['formel-schleifenwiderstand'],
    tabellenbuch: [{ seite: '185', was: 'Netzsysteme' }],
    formelsammlung: [
      { seite: '66', was: 'Schutzmaßnahmen im TN/TT-System (Schleifenimpedanz)' },
    ],
  },
  {
    id: 'abschaltung',
    titel: 'Schutzmaßnahmen, Abschaltzeiten und Auslösecharakteristik',
    gruppe: 'Schutz und Absicherung',
    formeln: ['formel-abschaltbedingung', 'formel-schleifenwiderstand'],
    tabellenbuch: [
      { seite: '92', was: 'LS-Schalter und Abschaltzeiten' },
      { seite: '103', was: 'Schmelzsicherung' },
      { seite: '114', was: 'Schutzarten IPX' },
    ],
    formelsammlung: [
      { seite: '68', was: 'Abschaltzeiten' },
      { seite: '69', was: 'Auslösecharakteristik' },
    ],
  },
  {
    id: 'fi-pruefung',
    titel: 'Fehlerstromschutz und FI-Prüfung',
    gruppe: 'Prüfung und Messung',
    formeln: ['formel-abschaltbedingung'],
    tabellenbuch: [
      { seite: '205', was: 'FI-Prüfung' },
      { seite: '125', was: 'Schütze' },
    ],
    formelsammlung: [{ seite: '68', was: 'Abschaltzeiten' }],
  },
  {
    id: 'geraetepruefung',
    titel: 'Geräteprüfung und Prüfzeichen',
    gruppe: 'Prüfung und Messung',
    formeln: [],
    tabellenbuch: [
      { seite: '244', was: 'Geräteprüfung' },
      { seite: '252', was: 'Prüfzeichen' },
    ],
    formelsammlung: [{ seite: '116-126', was: 'Tabellen' }],
  },
  {
    id: 'drehstrom',
    titel: 'Drehstrom',
    gruppe: 'Antriebe und Leistung',
    formeln: ['formel-strom-drehstrom'],
    tabellenbuch: [{ seite: '201', was: 'Stromwirkung' }],
    formelsammlung: [
      { seite: '49-52', was: 'Drehstrom' },
      { seite: '52', was: 'Leiterausfall Drehstrom' },
    ],
  },
  {
    id: 'antriebe',
    titel: 'Drehstrommotor und Anlassverfahren',
    gruppe: 'Antriebe und Leistung',
    formeln: ['formel-strom-drehstrom'],
    tabellenbuch: [
      { seite: '298', was: 'Anlassverfahren' },
      { seite: '302', was: 'Frequenzumrichter' },
      { seite: '143', was: 'Thermische Widerstände' },
    ],
    formelsammlung: [{ seite: '63', was: 'Drehstrommotor' }],
  },
  {
    id: 'schaltungen',
    titel: 'Grundlegende Schaltungen und Gleichrichter',
    gruppe: 'Grundlagen',
    formeln: [],
    tabellenbuch: [{ seite: '379', was: 'Grundlegende Schaltungen' }],
    formelsammlung: [{ seite: '101', was: 'Gleichrichter' }],
  },
  {
    id: 'kommunikation',
    titel: 'Netzwerk, Antenne und Breitband',
    gruppe: 'Gebäudetechnik',
    formeln: [],
    tabellenbuch: [
      { seite: '151', was: 'PCs' },
      { seite: '161', was: 'Netzwerk' },
    ],
    formelsammlung: [{ seite: '84', was: 'Wellenlänge' }],
  },
  {
    id: 'waermepumpe',
    titel: 'Wärmepumpe: COP und JAZ',
    gruppe: 'Gebäudetechnik',
    formeln: ['formel-leistungsfaktor-wr'],
    tabellenbuch: [],
    formelsammlung: [],
  },
  {
    id: 'photovoltaik',
    titel: 'Photovoltaik: Strangstrom',
    gruppe: 'Gebäudetechnik',
    formeln: ['formel-pv-strom'],
    tabellenbuch: [],
    formelsammlung: [],
  },
];

/** Eine aufgelöste Formelzeile: Text aus der Faktenbasis plus Herkunft. */
export interface AufgeloesteFormel {
  id: string;
  bezeichnung: string;
  formel: string;
  bemerkung: string;
  geprueft: boolean;
}

/** Löst die Formel-IDs eines Themas gegen die Faktenbasis auf. */
export function formelnFuer(thema: Thema): AufgeloesteFormel[] {
  const ergebnis: AufgeloesteFormel[] = [];
  for (const id of thema.formeln) {
    const fakt: Fact | undefined = holeFakt(id);
    if (!fakt?.formel) continue;
    ergebnis.push({
      id: fakt.id,
      bezeichnung: fakt.bezeichnung,
      formel: fakt.formel,
      bemerkung: fakt.bemerkung ?? '',
      geprueft: fakt.verification === 'geprueft',
    });
  }
  return ergebnis;
}

/** Alle Themen einer Gruppe – in der Reihenfolge der Gruppenliste. */
export function themenInGruppe(gruppe: string): Thema[] {
  return THEMEN.filter((t) => t.gruppe === gruppe);
}
