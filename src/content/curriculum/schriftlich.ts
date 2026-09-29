import type { KapitelDef } from './types.ts';
import { KUNDENAUFTRAG } from './kundenauftrag.ts';

/**
 * Systementwurf (Prüfungsbereich 2b) – 12 % der Gesamtprüfung.
 * Grundlage: § 12 ElekAusbV. Schriftlich, 120 Minuten, Entwurf einer Änderung
 * einer gebäudetechnischen Anlage.
 */
export const SYSTEMENTWURF: KapitelDef[] = [
  {
    id: 'sys-analyse',
    titel: 'Problemanalyse und Anforderungsaufnahme',
    bereich: 'systementwurf',
    position: '§ 12 Abs. 1 Nr. 1',
    gewicht: 3,
    atome: [
      { t: 'Ausgangslage beschreiben', l: 'Den Ist-Zustand einer gebäudetechnischen Anlage präzise beschreiben', f: 'praxis' },
      { t: 'Anforderung formulieren', l: 'Aus einer Aufgabenstellung eine messbare Anforderung ableiten', f: 'praxis' },
      { t: 'Randbedingungen erfassen', l: 'Räumliche, bauliche und vertragliche Randbedingungen erfassen', f: 'wissen' },
      { t: 'Bestandsaufnahme', l: 'Eine Bestandsanlage fachgerecht aufnehmen', f: 'praxis' },
      { t: 'Problem eingrenzen', l: 'Ein technisches Problem eindeutig eingrenzen', f: 'praxis' },
      { t: 'Zielbild beschreiben', l: 'Den gewünschten Zielzustand fachlich beschreiben', f: 'praxis' },
      { t: 'Information beschaffen', l: 'Technische Informationen beschaffen, bewerten und auswählen', f: 'wissen' },
    ],
  },
  {
    id: 'sys-varianten',
    titel: 'Lösungsvarianten bewerten und auswählen',
    bereich: 'systementwurf',
    position: '§ 12 Abs. 1 Nr. 1',
    gewicht: 3,
    atome: [
      { t: 'Varianten technisch vergleichen', l: 'Lösungsvarianten technisch gegeneinander abwägen', f: 'praxis' },
      { t: 'Varianten wirtschaftlich bewerten', l: 'Investition, Betriebskosten und Wirtschaftlichkeit vergleichen', f: 'rechnen', s: [2, 3, 4] },
      { t: 'Varianten ökologisch bewerten', l: 'Varianten hinsichtlich Nachhaltigkeit und Energieverwendung bewerten', f: 'wissen' },
      { t: 'Betriebsablauf berücksichtigen', l: 'Auswirkungen auf den Betriebsablauf berücksichtigen', f: 'praxis' },
      { t: 'Vorschriften einhalten', l: 'Bei jedem Entwurf die geltenden Vorschriften einhalten', f: 'norm' },
      { t: 'Begründung formulieren', l: 'Die gewählte Variante nachvollziehbar begründen', f: 'praxis' },
      { t: 'Regelwerk anwenden', l: 'Technische Regelwerke bei der Variantenwahl anwenden', f: 'norm' },
    ],
  },
  {
    id: 'sys-spezifikation',
    titel: 'Anlagenspezifikation und Komponentenauswahl',
    bereich: 'systementwurf',
    position: '§ 12 Abs. 1 Nr. 2',
    gewicht: 3,
    atome: [
      { t: 'Anforderungen festlegen', l: 'Anlagenspezifikation mit messbaren Anforderungen aufstellen', f: 'praxis' },
      { t: 'Betriebsmittel auswählen', l: 'Betriebsmittel nach Anforderung auswählen', f: 'praxis' },
      { t: 'Leiterquerschnitt festlegen', l: 'Leiterquerschnitt und Absicherung im Entwurf festlegen', f: 'rechnen', s: [3, 4, 5] },
      { t: 'Schutzmaßnahmen festlegen', l: 'Schutzmaßnahmen im Entwurf festlegen', f: 'norm' },
      { t: 'Software auswählen', l: 'Passende Software auswählen und begründen', f: 'praxis' },
      { t: 'Herstellerunterlagen auswerten', l: 'Herstellerunterlagen auswerten und Daten übernehmen', f: 'wissen' },
      { t: 'Schaltungsunterlagen anpassen', l: 'Vorhandene Schaltungsunterlagen anpassen', f: 'praxis' },
    ],
  },
  {
    id: 'sys-schutz',
    titel: 'Schutzmaßnahmen und Normkonformität im Entwurf',
    bereich: 'systementwurf',
    position: '§ 12 Abs. 1 Nr. 1, § 4 Abs. 2 Nr. 6',
    gewicht: 3,
    atome: [
      { t: 'Schutz gegen elektrischen Schlag', l: 'Maßnahmen gegen elektrischen Schlag im Entwurf festlegen', f: 'norm' },
      { t: 'Schutz gegen Brandgefahr', l: 'Maßnahmen gegen Brandgefahr im Entwurf festlegen', f: 'norm' },
      { t: 'Fehlerschutz festlegen', l: 'Fehlerschutz und Abschaltbedingung im Entwurf festlegen', f: 'rechnen', s: [3, 4, 5] },
      { t: 'Schutzart festlegen', l: 'Schutzart der Betriebsmittel der Umgebung anpassen', f: 'norm' },
      { t: 'Räume besonderer Art', l: 'Anforderungen an Räume besonderer Art im Entwurf berücksichtigen', f: 'norm' },
      { t: 'Kabeltrasse und Elektromagnetische Verträglichkeit', l: 'Leitungswege auch unter EMV-Gesichtspunkten festlegen', f: 'norm' },
    ],
  },
  {
    id: 'sys-nachhaltigkeit',
    titel: 'Energieeffizienz, Nachhaltigkeit und Datenschutz',
    bereich: 'systementwurf',
    position: '§ 12 Abs. 1 Nr. 1 und 3, § 4 Abs. 2 Nr. 5',
    gewicht: 3,
    atome: [
      { t: 'Rationelle Energieverwendung', l: 'Rationelle Energieverwendung im Entwurf berücksichtigen', f: 'wissen' },
      { t: 'Energieeffizienz bewerten', l: 'Energieeffizienz einer Maßnahme bewerten', f: 'rechnen', s: [2, 3, 4] },
      { t: 'Nachhaltige Komponentenwahl', l: 'Nachhaltigkeitsaspekte bei der Komponentenwahl benennen', f: 'wissen' },
      { t: 'Datenschutz berücksichtigen', l: 'Datenschutz beim Entwurf eines Netzes berücksichtigen', f: 'norm' },
      { t: 'Informationssicherheit', l: 'Informationssicherheit beim Entwurf berücksichtigen', f: 'norm' },
      { t: 'Umweltschutz', l: 'Umweltschutz beim Bauen und Betreiben berücksichtigen', f: 'norm' },
    ],
  },
  {
    id: 'sys-wirtschaft',
    titel: 'Kalkulation, Termin und Qualitätssicherung',
    bereich: 'systementwurf',
    position: '§ 4 Abs. 2 Nr. 2 und 3',
    gewicht: 2,
    atome: [
      { t: 'Material- und Arbeitsaufwand kalkulieren', l: 'Material- und Arbeitsaufwand kalkulieren', f: 'rechnen', s: [2, 3, 4] },
      { t: 'Kosten der erbrachten Leistung', l: 'Kosten der erbrachten Leistung errechnen', f: 'rechnen', s: [2, 3, 4] },
      { t: 'Terminplanung', l: 'Terminplanung aufstellen und verfolgen', f: 'praxis' },
      { t: 'Qualitätssicherung', l: 'Projektbegleitende Qualitätssicherung anwenden', f: 'praxis' },
      { t: 'Soll-Ist-Vergleich', l: 'Soll-Ist-Vergleich durchführen und Zielerreichung prüfen', f: 'praxis' },
      { t: 'Verbesserungsvorschlag', l: 'Verbesserungsvorschläge für Arbeitsabläufe machen', f: 'praxis' },
    ],
  },
  {
    id: 'sys-dokumentation',
    titel: 'Dokumentation und Kundenübergabe',
    bereich: 'systementwurf',
    position: '§ 11 Abs. 1 Nr. 4',
    gewicht: 2,
    atome: [
      { t: 'Entwurfsdokumentation', l: 'Entwurfsdokumentation vollständig und nachvollziehbar erstellen', f: 'praxis' },
      { t: 'Standardsoftware anwenden', l: 'Standardsoftware für Planung und Dokumentation anwenden', f: 'wissen' },
      { t: 'Anlage übergeben', l: 'Anlage an Kunden übergeben und erläutern', f: 'praxis' },
    ],
  },
];

/**
 * Funktions- und Systemanalyse (Prüfungsbereich 2b) – 12 %.
 * Grundlage: § 13 ElekAusbV. Schriftlich, 120 Minuten.
 */
export const FUNKTIONSANALYSE: KapitelDef[] = [
  {
    id: 'fsa-dokumentation',
    titel: 'Anlagendokumentation auswerten',
    bereich: 'funktionsanalyse',
    position: '§ 13 Abs. 1 Nr. 1',
    gewicht: 3,
    atome: [
      { t: 'Schaltungsunterlagen auswerten', l: 'Schaltungsunterlagen auswerten und die Funktion ableiten', f: 'praxis' },
      { t: 'Anlagendokumentation lesen', l: 'Anlagendokumentation lesen und in den Zusammenhang einordnen', f: 'praxis' },
      { t: 'Funktionen zuordnen', l: 'Bauteilen und Baugruppen ihre Funktion zuordnen', f: 'praxis' },
      { t: 'Betriebsanleitung auswerten', l: 'Betriebsanleitung und Gebrauchsanleitung auswerten', f: 'wissen' },
      { t: 'Datenblatt lesen', l: 'Datenblätter lesen und Kennwerte einordnen', f: 'wissen' },
      { t: 'Kenndaten und Typenschlüssel', l: 'Kenndaten und Typenschlüssel richtig zuordnen', f: 'wissen' },
    ],
  },
  {
    id: 'fsa-verfahren',
    titel: 'Mess- und Prüfverfahren sowie Diagnosesysteme',
    bereich: 'funktionsanalyse',
    position: '§ 13 Abs. 1 Nr. 1',
    gewicht: 3,
    atome: [
      { t: 'Messverfahren auswählen', l: 'Passendes Messverfahren für die Fragestellung wählen', f: 'praxis' },
      { t: 'Messgerät auswählen', l: 'Passendes Messgerät auswählen und begründen', f: 'wissen' },
      { t: 'Diagnosesystem auswählen', l: 'Diagnosesystem passend zur Anlage auswählen', f: 'praxis' },
      { t: 'Messeinrichtung aufbauen', l: 'Messeinrichtung fachgerecht aufbauen', f: 'praxis' },
      { t: 'Messwertaufnahme', l: 'Messwerte systematisch aufnehmen', f: 'praxis' },
      { t: 'Messunsicherheit', l: 'Einfluss der Messunsicherheit auf das Ergebnis beurteilen', f: 'norm' },
    ],
  },
  {
    id: 'fsa-fehlersuche',
    titel: 'Fehlersuche und Fehlerursachen',
    bereich: 'funktionsanalyse',
    position: '§ 13 Abs. 1 Nr. 3',
    gewicht: 3,
    atome: [
      { t: 'Fehlerbild beschreiben', l: 'Ein Fehlerbild präzise beschreiben', f: 'praxis' },
      { t: 'Fehler eingrenzen', l: 'Fehler durch Messung und Abgleich eingrenzen', f: 'praxis' },
      { t: 'Fehlerursache bestimmen', l: 'Fehlerursache eindeutig bestimmen', f: 'praxis' },
      { t: 'Fehler beseitigen', l: 'Fehlerursache beseitigen und Wirksamkeit prüfen', f: 'praxis' },
      { t: 'Signalverfolgung', l: 'Signale entlang der Kette verfolgen', f: 'praxis' },
      { t: 'Anlagenzustand beurteilen', l: 'Anlagenzustand beurteilen und bewerten', f: 'praxis' },
      { t: 'Schnittstellen prüfen', l: 'Schnittstellen auf Funktion prüfen', f: 'praxis' },
    ],
  },
  {
    id: 'fsa-programme',
    titel: 'Programme analysieren und ändern',
    bereich: 'funktionsanalyse',
    position: '§ 13 Abs. 1 Nr. 2',
    gewicht: 2,
    atome: [
      { t: 'Programmstruktur analysieren', l: 'Struktur eines Automatisierungs- oder Gebäudesystemprogramms analysieren', f: 'praxis' },
      { t: 'Programm ändern', l: 'Programm gezielt ändern und die Änderung dokumentieren', f: 'praxis' },
      { t: 'Adressierung und Variablen', l: 'Adressen, Variablen und Datentypen richtig zuordnen', f: 'praxis' },
      { t: 'Programme testen', l: 'Geänderte Programme testen und Fehlfunktionen erkennen', f: 'praxis' },
    ],
  },
  {
    id: 'fsa-schnittstellen',
    titel: 'Signale an Schnittstellen zuordnen',
    bereich: 'funktionsanalyse',
    position: '§ 13 Abs. 1 Nr. 2',
    gewicht: 2,
    atome: [
      { t: 'Signaltypen unterscheiden', l: 'Signaltypen unterscheiden und ihre Richtung bestimmen', f: 'wissen' },
      { t: 'Busschnittstelle', l: 'An einer Busschnittstelle Signale funktionell zuordnen', f: 'praxis' },
      { t: 'Anbindung an übergeordnete Systeme', l: 'Anbindung an übergeordnete Systeme nachvollziehen', f: 'praxis' },
      { t: 'Gebäudetechnik-Schnittstelle', l: 'Schnittstelle zwischen Elektro- und Gebäudetechnik beurteilen', f: 'praxis' },
      { t: 'Wartungsschnittstelle', l: 'Wartungs- und Serviceschnittstellen sicher beurteilen', f: 'norm' },
    ],
  },
  {
    id: 'fsa-schutzbewertung',
    titel: 'Schutzmaßnahmen bewerten und Diagnose auswerten',
    bereich: 'funktionsanalyse',
    position: '§ 13 Abs. 1 Nr. 3',
    gewicht: 3,
    atome: [
      { t: 'Schutzmaßnahme bewerten', l: 'Schutzmaßnahme an einer Anlage bewerten', f: 'norm' },
      { t: 'Abschaltbedingung prüfen', l: 'Abschaltbedingung aus Messwerten prüfen', f: 'rechnen', s: [3, 4, 5] },
      { t: 'Diagnose auswerten', l: 'Diagnoseergebnis auswerten und bewerten', f: 'praxis' },
      { t: 'Diagnose dokumentieren', l: 'Diagnose nachvollziehbar dokumentieren', f: 'praxis' },
    ],
  },
];

/**
 * Wirtschafts- und Sozialkunde – 10 %. Grundlage: § 14 ElekAusbV.
 * Schriftlich, 60 Minuten, praxisbezogen.
 */
export const WISO: KapitelDef[] = [
  {
    id: 'wiso-beruf',
    titel: 'Berufliche Entwicklung und Ausbildung',
    bereich: 'wiso',
    // § 4 Abs. 5 Nr. 1 ist die einschlägige Berufsbildposition (Organisation
    // des Ausbildungsbetriebes, Berufsbildung sowie Arbeits- und Tarifrecht).
    // Vorher stand hier § 4 Abs. 2 Nr. 1 – das ist betriebliche Kommunikation
    // und damit die falsche Position.
    position: '§ 4 Abs. 5 Nr. 1, § 14',
    gewicht: 2,
    atome: [
      { t: 'Ausbildungsvertrag', l: 'Abschluss, Dauer und Beendigung des Ausbildungsvertrags erklären', f: 'wissen' },
      { t: 'Rechte und Pflichten', l: 'Gegenseitige Rechte und Pflichten aus dem Ausbildungsvertrag nennen', f: 'wissen' },
      { t: 'Arbeitsvertrag', l: 'Wesentliche Teile des Arbeitsvertrags nennen', f: 'wissen' },
      { t: 'Fortbildung', l: 'Möglichkeiten der beruflichen Fortbildung darstellen', f: 'wissen' },
      { t: 'Arbeitsmarkt', l: 'Arbeitsmarkt und berufliche Entwicklungschancen einschätzen', f: 'wissen' },
    ],
  },
  {
    id: 'wiso-betrieb',
    titel: 'Aufbau und Organisation des Betriebs',
    bereich: 'wiso',
    position: '§ 4 Abs. 5 Nr. 1, § 14',
    gewicht: 2,
    atome: [
      { t: 'Aufgaben des Betriebs', l: 'Aufgaben und Aufbau des Ausbildungsbetriebs erläutern', f: 'wissen' },
      { t: 'Grundfunktionen des Betriebs', l: 'Beschaffung, Fertigung, Absatz und Verwaltung unterscheiden', f: 'wissen' },
      { t: 'Tarifvertrag', l: 'Wesentliche Bestimmungen des Tarifvertrags benennen', f: 'wissen' },
      { t: 'Mitbestimmung', l: 'Beteiligung der Beschäftigten an der Entscheidungsfindung beschreiben', f: 'wissen' },
      { t: 'Wirtschaftsorganisationen', l: 'Beziehungen zu Wirtschafts- und Berufsvertretungen einordnen', f: 'wissen' },
    ],
  },
  {
    id: 'wiso-recht',
    titel: 'Rechtliche Grundlagen',
    bereich: 'wiso',
    position: '§ 14, § 4 Abs. 5 Nr. 1',
    gewicht: 2,
    atome: [
      { t: 'Arbeitszeitregelung', l: 'Arbeitszeitregelung und arbeitsrechtliche Grundlagen einordnen', f: 'wissen' },
      { t: 'Jugendarbeitsschutz', l: 'Grundzüge des Jugendarbeitsschutzes benennen', f: 'wissen' },
      { t: 'Haftung und Versicherung', l: 'Haftungsfragen bei der Arbeitsausführung einordnen', f: 'wissen' },
      { t: 'Datenschutz am Arbeitsplatz', l: 'Datenschutzpflichten am Arbeitsplatz benennen', f: 'wissen' },
    ],
  },
  {
    id: 'wiso-finanzen',
    titel: 'Finanzen, Steuern und Versicherungen',
    bereich: 'wiso',
    position: '§ 4 Abs. 5 Nr. 1, § 14',
    gewicht: 2,
    atome: [
      { t: 'Lohn und Gehalt', l: 'Bestandteile von Lohn und Gehalt unterscheiden', f: 'wissen' },
      { t: 'Lohnsteuer und Sozialabgaben', l: 'Lohnsteuer und Sozialabgaben grob einordnen', f: 'rechnen', s: [2, 3] },
      { t: 'Steuern im Betrieb', l: 'Steuerarten für den Betrieb unterscheiden', f: 'wissen' },
      { t: 'Versicherungen', l: 'Pflicht- und freiwillige Versicherungen unterscheiden', f: 'wissen' },
      { t: 'Kalkulation im Betrieb', l: 'Kostenarten in die Kalkulation einordnen', f: 'rechnen', s: [2, 3, 4] },
    ],
  },
  {
    id: 'wiso-umwelt',
    titel: 'Umwelt und Nachhaltigkeit',
    bereich: 'wiso',
    position: '§ 4 Abs. 5 Nr. 3, § 14',
    gewicht: 2,
    atome: [
      { t: 'Umweltbelastungen im Betrieb', l: 'Umweltbelastungen im Elektrohandwerk benennen', f: 'wissen' },
      { t: 'Abfallvermeidung', l: 'Abfälle vermeiden und umweltgerecht entsorgen', f: 'wissen' },
      { t: 'Energieverwendung', l: 'Wirtschaftliche und umweltschonende Energieverwendung bewerten', f: 'wissen' },
      { t: 'Nachhaltige Gebäude', l: 'Beitrag zur Nachhaltigkeit im Gebäudebereich bewerten', f: 'wissen' },
      { t: 'Energiewende', l: 'Bedeutung der Energiewende für den Beruf einordnen', f: 'wissen' },
    ],
  },
  {
    // § 4 Abs. 5 Nr. 4 war bisher nirgends abgebildet. Das ist die vierte
    // fachrichtungsübergreifende Berufsbildposition ("digitalisierte
    // Arbeitswelt") und wird in § 11 Abs. 1 Nr. 5 ausdrücklich verlangt.
    id: 'wiso-digital',
    titel: 'Digitalisierte Arbeitswelt',
    bereich: 'wiso',
    position: '§ 4 Abs. 5 Nr. 4, § 11 Abs. 1 Nr. 5',
    gewicht: 2,
    atome: [
      { t: 'Digitale Arbeitsmittel', l: 'Digitale Arbeitsmittel und ihre Einsatzfelder im Handwerk beschreiben', f: 'wissen' },
      { t: 'Datenschutz und Informationssicherheit', l: 'Grundsätze des Datenschutzes und der Informationssicherheit anwenden', f: 'norm' },
      { t: 'Digitale Kommunikation', l: 'Digitale Kommunikationswege mit Kunden und im Betrieb unterscheiden', f: 'wissen' },
      { t: 'Auswirkungen auf die Arbeit', l: 'Auswirkungen der Digitalisierung auf Arbeitsabläufe und Qualifikation bewerten', f: 'wissen' },
      { t: 'Verantwortung im Netz', l: 'Verantwortung bei der Nutzung betrieblicher Daten und Systeme einordnen', f: 'wissen' },
    ],
  },
];

/**
 * Teil 1 – Elektrotechnische Anlagen und Betriebsmittel, 30 % der Gesamtprüfung.
 *
 * Inhaltlich ist Teil 1 abgeschlossen, die Inhalte prüfen aber weiterhin.
 * Die Kapitel dienen deshalb als Wiederholungsgrundlage.
 */
export const TEIL1: KapitelDef[] = [
  {
    id: 't1-anlagen',
    titel: 'Elektrotechnische Anlagen und Betriebsmittel',
    bereich: 'teil1',
    position: '§ 8 ElekAusbV',
    gewicht: 3,
    atome: [
      { t: 'Grundgrößen der Elektrotechnik', l: 'Strom, Spannung, Widerstand und Leistung sicher anwenden', f: 'rechnen', s: [1, 2, 3, 4] },
      { t: 'Gleich- und Wechselstrom', l: 'Unterschiede von Gleich- und Wechselstrom erklären', f: 'wissen' },
      { t: 'Drehstrom', l: 'Drehstrom und verkettete Spannung einordnen', f: 'rechnen', s: [2, 3, 4] },
      { t: 'Leistungsfaktor', l: 'Wirkleistungsgrad berechnen und bewerten', f: 'rechnen', s: [2, 3, 4] },
      { t: 'Betriebsmittelarten', l: 'Betriebsmittel nach Anwendung und Schutzart unterscheiden', f: 'wissen' },
      { t: 'Kennwerte von Betriebsmitteln', l: 'Kennwerte von Betriebsmitteln aus Datenblättern übernehmen', f: 'wissen' },
      { t: 'Elektromagnetische Verträglichkeit', l: 'Maßnahmen zur elektromagnetischen Verträglichkeit nennen', f: 'norm' },
    ],
  },
];

/** Alle Kapitel der Fachrichtung Energie- und Gebäudetechnik plus Teil 1. */
export const ALLE_KAPITEL: KapitelDef[] = [
  ...KUNDENAUFTRAG,
  ...SYSTEMENTWURF,
  ...FUNKTIONSANALYSE,
  ...WISO,
  ...TEIL1,
];
