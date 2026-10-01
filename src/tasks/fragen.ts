import type { Fact, FactRef, Task } from '../domain/types.ts';
import type { Atom } from '../content/curriculum/types.ts';
import { FAKTEN, holeFakt } from '../content/facts/index.ts';
import { baueTask, parameterHash, type TaskBausatz } from '../validation/pipeline.ts';
import { formatiereWert } from './resolve.ts';

/**
 * Wissensaufgaben aus der Faktenbasis.
 *
 * Das ist die zweite große Quelle neben den Rechenaufgaben – und in der
 * Prüfung die wichtigere. Der weitaus größte Teil der Fragen verlangt kein
 * Rechnen, sondern Zuordnung: Welcher Grenzwert gehört zu welcher Größe,
 * welche Aussage stimmt, welcher Wert ist der richtige von zwei ähnlichen.
 *
 * Der Aufbau folgt genau dieser Unterscheidung:
 *
 *  1. **Wertfrage** zu einem Fakt mit Zahlenwert. Die falschen Antworten sind
 *     andere Zahlen derselben Größenordnung und Einheit – also echte
 *     Verwechslungskandidaten. „Mindest-Isolationswiderstand: 1 MΩ" gegen
 *     0,5 MΩ und 2 MΩ ist eine sinnvolle Frage; gegen 0,5 MΩ und 100 MΩ wäre
 *     sie geschenkt.
 *
 *  2. **Aussagefrage** zu einem Fakt ohne Zahlenwert. Gefragt wird nach der
 *     Aussage zu einem Begriff; die falschen Antworten sind Aussagen anderer
 *     Fakten. Damit ist strukturell gesichert, dass genau eine Aussage passt:
 *     Jede Aussage gehört zu genau ihrem Begriff.
 *
 *  3. **Zuordnungsfrage** über zwei Fakten derselben Kategorie (etwa zwei
 *     Kennlinien). Gefragt wird nach dem Unterschied – das ist die Form, in
 *     der die Prüfung Verwechslungsgefahr abfragt.
 *
 * Alle drei Formen laufen durch dieselbe Validierungspipeline wie jede andere
 * Aufgabe. Ein Fakt ohne belegte Zahlen kann keine Aufgabe tragen; was
 * durchfällt, wird still verworfen.
 */

// ---------------------------------------------------------------------------
// Zuordnung Fakt → Thema
// ---------------------------------------------------------------------------

/**
 * Welche Fakten-Schlagwörter zu welchen Themen des Lernpfads gehören.
 *
 * Das ist die Brücke zwischen Wissensbasis und Lernfortschritt: Ohne sie
 * bliebe eine Aufgabe ohne Thema und ihr Ergebnis liefe ins Leere. Ein
 * Eintrag, der auf `-` endet, gilt als Präfix („ka-verteilung-" trifft alle
 * Themen des Kapitels).
 */
export const FAKTEN_ZU_THEMEN: Record<string, string[]> = {
  grundlagen: ['t1-anlagen-'],
  leitung: ['ka-verlegung-', 'sys-spezifikation-03'],
  querschnitt: ['ka-verlegung-02', 'sys-spezifikation-03'],
  verlegeart: ['ka-verlegung-02', 'ka-verlegung-08'],
  strombelastbarkeit: ['ka-verlegung-02', 'ka-verteilung-04', 'sys-spezifikation-03'],
  haeufung: ['ka-verlegung-08'],
  temperatur: ['ka-verlegung-02'],
  absicherung: ['ka-verteilung-03', 'ka-verteilung-04', 'ka-verteilung-02'],
  schultabelle: ['ka-verteilung-04'],
  emv: ['ka-verlegung-10', 't1-anlagen-07', 'sys-schutz-06'],
  schutzart: ['ka-verteilung-01', 'ka-gebaeudetechnik-06', 'sys-schutz-04'],
  schutz: ['sys-schutz-01', 'fsa-schutzbewertung-01', 'ka-verteilung-05'],
  personenschutz: ['ka-verteilung-05', 'fsa-schutzbewertung-01'],
  rcd: ['ka-verteilung-05', 'ka-verteilung-06', 'ka-gebaeudetechnik-08'],
  abschaltzeit: ['fsa-schutzbewertung-02', 'ka-messen-06'],
  abschaltbedingung: ['ka-messen-06', 'ka-pruefung-04', 'fsa-schutzbewertung-02'],
  netzform: ['ka-verteilung-01', 'sys-schutz-01'],
  schutzleiter: ['ka-verteilung-05', 'ka-pruefung-04'],
  pen: ['ka-verteilung-01', 'sys-schutz-01'],
  selv: ['sys-schutz-01', 'ka-gebaeudetechnik-10'],
  kleinspannung: ['sys-schutz-01', 't1-anlagen-02'],
  schutzklasse: ['ka-pruefung-10', 'ka-messen-01'],
  beruehrung: ['sys-schutz-01', 'fsa-schutzbewertung-01'],
  beruehrungsspannung: ['sys-schutz-01'],
  beruehrungsstrom: ['ka-pruefung-10'],
  pruefung: ['ka-pruefung-', 'fsa-verfahren-'],
  erstpruefung: ['ka-pruefung-01', 'ka-inbetriebnahme-05'],
  wiederholungspruefung: ['ka-pruefung-08', 'ka-pruefung-10'],
  prueffrist: ['ka-pruefung-08'],
  isolation: ['ka-messen-04', 'ka-pruefung-04'],
  durchgang: ['ka-messen-02'],
  messung: ['ka-messen-01', 'fsa-verfahren-01', 'fsa-verfahren-05'],
  messunsicherheit: ['fsa-verfahren-06'],
  pruefgeraet: ['ka-messen-01', 'ka-pruefung-10'],
  erdung: ['ka-messen-05', 'ka-pruefung-04'],
  fehlersuche: ['ka-inbetriebnahme-04', 'fsa-fehlersuche-'],
  kurzschluss: ['ka-messen-03', 'fsa-fehlersuche-02'],
  erdschluss: ['ka-messen-03'],
  signal: ['fsa-fehlersuche-05'],
  diagnose: ['fsa-schutzbewertung-03', 'fsa-fehlersuche-01'],
  verfahren: ['fsa-verfahren-01', 'fsa-fehlersuche-01'],
  schaltgeraet: ['ka-verteilung-02', 'ka-verteilung-03'],
  ls: ['ka-verteilung-03', 'ka-verteilung-02'],
  kennlinie: ['ka-verteilung-03'],
  sls: ['ka-verteilung-02', 'ka-verteilung-10'],
  verteiler: ['ka-verteilung-01', 'ka-verteilung-07', 'ka-verteilung-08'],
  zaehler: ['ka-verteilung-10', 'ka-gebaeudetechnik-07'],
  selektivitaet: ['ka-verteilung-02'],
  sicherheit: ['ka-sicherheit-'],
  freischalten: ['ka-sicherheit-02'],
  spannungsfreiheit: ['ka-sicherheit-02'],
  regeln: ['ka-sicherheit-01'],
  psa: ['ka-sicherheit-04'],
  unterweisung: ['ka-sicherheit-03'],
  arbeitsschutz: ['ka-sicherheit-03'],
  photovoltaik: ['ka-gebaeudetechnik-04', 'ka-gebaeudetechnik-05', 'ka-gebaeudetechnik-06', 'ka-gebaeudetechnik-07'],
  na_schutz: ['ka-gebaeudetechnik-05', 'ka-gebaeudetechnik-07'],
  einspeisung: ['ka-gebaeudetechnik-07'],
  blitzschutz: ['ka-gebaeudetechnik-06'],
  ueberspannungsschutz: ['ka-gebaeudetechnik-06', 'sys-schutz-02'],
  waermepumpe: ['ka-gebaeudetechnik-01', 'ka-gebaeudetechnik-02', 'ka-gebaeudetechnik-03'],
  heizung: ['ka-gebaeudetechnik-02', 'ka-gebaeudetechnik-03'],
  heizlast: ['ka-gebaeudetechnik-02'],
  wallbox: ['ka-gebaeudetechnik-08', 'ka-gebaeudetechnik-09'],
  lastmanagement: ['ka-gebaeudetechnik-09'],
  ladestrom: ['ka-gebaeudetechnik-08'],
  sicherheitsbeleuchtung: ['ka-gebaeudetechnik-11'],
  notstrom: ['ka-gebaeudetechnik-11'],
  beleuchtung: ['ka-gebaeudetechnik-10'],
  lux: ['ka-gebaeudetechnik-10'],
  led: ['ka-gebaeudetechnik-10'],
  knx: ['ka-gebaaeudesystemtechnik-01', 'ka-gebaaeudesystemtechnik-02', 'ka-gebaaeudesystemtechnik-03', 'ka-gebaaeudesystemtechnik-04', 'ka-gebaaeudesystemtechnik-05'],
  bus: ['ka-gebaaeudesystemtechnik-01'],
  gebaeudeautomation: ['ka-gebaaeudesystemtechnik-06'],
  schnittstelle: ['fsa-schnittstellen-', 'ka-gebaaeudesystemtechnik-06'],
  fernzugriff: ['ka-gebaaeudesystemtechnik-08'],
  antenne: ['ka-antenne-'],
  koax: ['ka-antenne-03'],
  pegel: ['ka-antenne-02', 'ka-antenne-04'],
  potentialausgleich: ['ka-antenne-01', 'ka-pruefung-04'],
  energie: ['ka-gebaeudetechnik-12', 'sys-nachhaltigkeit-01', 'sys-nachhaltigkeit-02'],
  effizienz: ['sys-nachhaltigkeit-02', 'ka-gebaeudetechnik-12'],
  primaerenergie: ['sys-nachhaltigkeit-02'],
  kennzahl: ['sys-nachhaltigkeit-02'],
  umwelt: ['sys-nachhaltigkeit-06', 'wiso-umwelt-'],
  abfall: ['wiso-umwelt-02'],
  entsorgung: ['wiso-umwelt-02', 'ka-dokumentation-05'],
  datenschutz: ['ka-gebaaeudesystemtechnik-07', 'wiso-digital-02', 'wiso-recht-04'],
  it_sicherheit: ['wiso-digital-02', 'ka-gebaaeudesystemtechnik-08'],
  geraet: ['ka-pruefung-10', 'ka-messen-01'],
  geraetepruefung: ['ka-pruefung-10'],
  ableitstrom: ['ka-pruefung-10'],
  widerstand: ['t1-anlagen-01', 'ka-messen-05'],
  wechselstrom: ['t1-anlagen-02'],
  effektivwert: ['t1-anlagen-02'],
  frequenz: ['t1-anlagen-02'],
  drehstrom: ['t1-anlagen-03'],
  leistungsfaktor: ['t1-anlagen-04'],
  blindstrom: ['t1-anlagen-04'],
  kompensation: ['t1-anlagen-04'],
  betriebsmittel: ['t1-anlagen-05', 't1-anlagen-06'],
  normreihe: ['ka-verlegung-02'],
  kupfer: ['ka-verlegung-01', 't1-anlagen-01'],
  aluminium: ['ka-verlegung-01'],
  rho: ['ka-verlegung-02', 'sys-spezifikation-03'],
  formel: ['t1-anlagen-01', 't1-anlagen-03', 't1-anlagen-04'],
  spannung: ['t1-anlagen-01'],
  leistung: ['t1-anlagen-01'],
  arbeit: ['t1-anlagen-01'],
  // Wirtschafts- und Sozialkunde
  wiso: ['wiso-'],
  ausbildung: ['wiso-beruf-', 'wiso-betrieb-01'],
  vertrag: ['wiso-beruf-01', 'wiso-beruf-03'],
  probezeit: ['wiso-beruf-01'],
  kuendigung: ['wiso-beruf-03', 'wiso-recht-03'],
  jugend: ['wiso-recht-02'],
  untersuchung: ['wiso-recht-02'],
  arbeitszeit: ['wiso-recht-01'],
  pause: ['wiso-recht-01'],
  ruhezeit: ['wiso-recht-01'],
  urlaub: ['wiso-recht-01', 'wiso-beruf-02'],
  erholung: ['wiso-recht-01'],
  lohn: ['wiso-finanzen-01', 'wiso-finanzen-02'],
  gehalt: ['wiso-finanzen-01'],
  sozialversicherung: ['wiso-finanzen-02', 'wiso-finanzen-04'],
  beitraege: ['wiso-finanzen-02'],
  steuer: ['wiso-finanzen-02', 'wiso-finanzen-03'],
  lohnsteuer: ['wiso-finanzen-02'],
  betriebsrat: ['wiso-betrieb-04'],
  mitbestimmung: ['wiso-betrieb-04'],
  betriebsvereinbarung: ['wiso-betrieb-04'],
  arbeitskampf: ['wiso-betrieb-03'],
  haftung: ['wiso-recht-03'],
  schaden: ['wiso-recht-03'],
  unfallversicherung: ['wiso-finanzen-04', 'wiso-recht-03'],
  berufsgenossenschaft: ['wiso-finanzen-04'],
  unfall: ['wiso-recht-03'],
  handwerk: ['wiso-betrieb-05', 'wiso-beruf-01'],
  zustaendigkeit: ['wiso-betrieb-05'],
  kalkulation: ['wiso-finanzen-05', 'sys-wirtschaft-01'],
  umsatzsteuer: ['wiso-finanzen-03', 'wiso-finanzen-05'],
  deckungsbeitrag: ['wiso-finanzen-05'],
  kosten: ['wiso-finanzen-05', 'sys-wirtschaft-01'],
  liquiditaet: ['wiso-finanzen-05'],
  wirtschaftlichkeit: ['wiso-finanzen-05', 'sys-wirtschaft-05'],
  amortisation: ['wiso-finanzen-05', 'sys-wirtschaft-02'],
  nachhaltigkeit: ['wiso-umwelt-04', 'sys-nachhaltigkeit-03'],
  energiewende: ['wiso-umwelt-05'],
  digitalisierung: ['wiso-digital-01', 'wiso-digital-04'],
  passwort: ['wiso-digital-02'],
  arbeitsschutzgesetz: ['wiso-recht-01', 'ka-sicherheit-03'],
  elektrohandwerk: ['wiso-umwelt-05'],
  vermoegensbildung: ['wiso-finanzen-01'],
  abzuege: ['wiso-finanzen-02'],
  grenze: ['wiso-finanzen-02'],
  beschaeftigte: ['wiso-recht-04'],
  klage: ['wiso-recht-03'],
  arbeitsvertrag: ['wiso-beruf-03'],
  betrieb: ['wiso-betrieb-01', 'wiso-betrieb-02'],
  ordnung: ['wiso-beruf-01'],
  verzeichnis: ['wiso-beruf-01'],
  nachweis: ['wiso-beruf-01', 'ka-dokumentation-01'],
  pflichten: ['wiso-beruf-02'],
  zeugnis: ['wiso-beruf-02', 'wiso-beruf-04'],
  berufsschule: ['wiso-recht-02'],
  glt: ['ka-gebaaeudesystemtechnik-06'],
  kamera: ['ka-gebaaeudesystemtechnik-07'],
  praesenzmelder: ['ka-gebaaeudesystemtechnik-03'],
  topologie: ['ka-gebaaeudesystemtechnik-01'],
  linie: ['ka-gebaaeudesystemtechnik-01'],
  teilnehmer: ['ka-gebaaeudesystemtechnik-01'],
  sensor: ['ka-gebaaeudesystemtechnik-02'],
  aktor: ['ka-gebaaeudesystemtechnik-02'],
  inbetriebnahme: ['ka-inbetriebnahme-01', 'ka-gebaaeudesystemtechnik-01'],
  programmierung: ['ka-gebaaeudesystemtechnik-05', 'fsa-programme-02'],
  aggregat: ['ka-gebaeudetechnik-11'],
  ersatzstrom: ['ka-gebaeudetechnik-11'],
  dauer: ['ka-gebaeudetechnik-11'],
  rettungsweg: ['ka-gebaeudetechnik-11', 'ka-gebaeudetechnik-10'],
  umschaltung: ['ka-gebaeudetechnik-11'],
  arbeitsplatz: ['ka-gebaeudetechnik-10', 'ka-sicherheit-03'],
  lichtstrom: ['ka-gebaeudetechnik-10'],
  lichtausbeute: ['ka-gebaeudetechnik-10'],
  rettungszeichen: ['ka-gebaeudetechnik-10'],
  geraete: ['ka-pruefung-10'],
  erzeugung: ['ka-gebaeudetechnik-05'],
  blitzstrom: ['ka-gebaeudetechnik-06'],
  konzept: ['ka-gebaeudetechnik-06'],
  pflicht: ['ka-gebaeudetechnik-06', 'wiso-recht-04'],
  koordination: ['ka-gebaeudetechnik-06'],
  jaz: ['ka-gebaeudetechnik-03'],
  cop: ['ka-gebaeudetechnik-03'],
  vorlauf: ['ka-gebaeudetechnik-02'],
  dimensionierung: ['ka-gebaeudetechnik-02', 'sys-spezifikation-03'],
  anschluss: ['ka-gebaeudetechnik-01', 'ka-gebaeudetechnik-08'],
  sperrzeit: ['ka-gebaeudetechnik-02', 'ka-gebaeudetechnik-09'],
  tarif: ['wiso-betrieb-03', 'ka-gebaeudetechnik-09'],
  anmeldung: ['ka-gebaeudetechnik-07', 'ka-gebaeudetechnik-08'],
  netzbetreiber: ['ka-gebaeudetechnik-07'],
  netz: ['ka-gebaeudetechnik-05'],
  blendleistung: ['t1-anlagen-04'],
  blindleistung: ['t1-anlagen-04'],
  bedarf: ['sys-nachhaltigkeit-01', 'sys-nachhaltigkeit-02'],
  verbrauch: ['sys-nachhaltigkeit-01', 'sys-nachhaltigkeit-02'],
  geg: ['sys-nachhaltigkeit-02', 'wiso-umwelt-04'],
  gebaeude: ['sys-nachhaltigkeit-01', 'wiso-umwelt-04'],
  investition: ['wiso-finanzen-05', 'sys-wirtschaft-02'],
  bewertung: ['sys-wirtschaft-05', 'sys-nachhaltigkeit-02'],
  freileitung: ['ka-gebaeudetechnik-06'],
  ueberspannung: ['ka-gebaeudetechnik-06'],
  schirmung: ['ka-verlegung-10'],
  trasse: ['ka-verlegung-06', 'ka-verlegung-08'],
  befestigung: ['ka-verlegung-06'],
  biegeradius: ['ka-verlegung-03', 'ka-verlegung-08'],
  aderfarbe: ['ka-verlegung-09', 'ka-verteilung-07'],
  kennzeichnung: ['ka-verlegung-09', 'ka-verteilung-07'],
  klemme: ['ka-verlegung-05', 'ka-verteilung-09'],
  aderendhuelse: ['ka-verlegung-05'],
  bezeichnung: ['ka-verlegung-01'],
  typ: ['ka-verlegung-01', 'fsa-dokumentation-06'],
  auswahl: ['ka-verteilung-03', 'sys-spezifikation-02'],
  anschaltzeit: ['fsa-schutzbewertung-02'],
  beruehrungsschutz: ['sys-schutz-01'],
  uebersicht: ['ka-plaene-03'],
  schaltplan: ['ka-plaene-01', 'ka-plaene-02'],
  stromlaufplan: ['ka-plaene-01', 'ka-plaene-02'],
  emv_leitung: ['ka-verlegung-10'],
  isolierung: ['ka-messen-04'],
  grundregeln: ['wiso-digital-02'],
  pruefung_geraet: ['ka-pruefung-10'],
  wiederholung: ['ka-pruefung-08'],
  erdungswiderstand: ['ka-messen-05', 'ka-pruefung-04'],
  schleifenwiderstand: ['ka-messen-07', 'ka-inbetriebnahme-05'],
  fehlerstrom: ['ka-verteilung-05', 'ka-messen-06'],
  ausloesestrom: ['ka-verteilung-03'],
  schutzeinrichtung: ['ka-verteilung-05'],
  brandschutz: ['sys-schutz-02', 'ka-sicherheit-05'],
  raeume: ['sys-schutz-05'],
  badezimmer: ['sys-schutz-05'],
  feuchtraum: ['sys-schutz-04', 'ka-gebaeudetechnik-10'],
  aussenbereich: ['sys-schutz-04', 'ka-gebaeudetechnik-06'],
  mechanisch: ['sys-schutz-04'],
  ik: ['sys-schutz-04'],
  ip: ['sys-schutz-04', 'ka-verteilung-01'],
};

/**
 * Zusätzliche Zuordnungen, die quer zu den Schlagwörtern liegen.
 *
 * Ein Fakt trägt oft nur ein Schlagwort, gehört aber in mehreren Bereichen zur
 * Prüfung. Der Fehlersuche-Fakt „Kurzschluss und Erdschluss unterscheiden" ist
 * über `fehlersuche` gebunden; er gehört ebenso in die Funktionsanalyse, wo
 * genau diese Unterscheidung geprüft wird. Statt das Schlagwort am Fakt zu
 * verdoppeln, steht die Ergänzung hier – an einer Stelle, sichtbar und
 * änderbar.
 */
const ZUSATZ_ZU_THEMEN: { tag: string; themen: string[] }[] = [
  { tag: 'schaltplan', themen: ['fsa-dokumentation-01', 'fsa-dokumentation-02'] },
  { tag: 'stromlaufplan', themen: ['fsa-dokumentation-01', 'fsa-dokumentation-02'] },
  { tag: 'typ', themen: ['fsa-dokumentation-05', 'fsa-dokumentation-06'] },
  { tag: 'bezeichnung', themen: ['fsa-dokumentation-06'] },
  { tag: 'messung', themen: ['fsa-verfahren-01', 'fsa-verfahren-04', 'fsa-verfahren-05'] },
  { tag: 'pruefgeraet', themen: ['fsa-verfahren-02'] },
  { tag: 'fehlersuche', themen: ['fsa-fehlersuche-01', 'fsa-fehlersuche-02', 'fsa-fehlersuche-03', 'fsa-fehlersuche-04'] },
  { tag: 'kurzschluss', themen: ['fsa-fehlersuche-02', 'fsa-fehlersuche-03'] },
  { tag: 'erdschluss', themen: ['fsa-fehlersuche-02', 'fsa-fehlersuche-03'] },
  { tag: 'signal', themen: ['fsa-fehlersuche-05'] },
  { tag: 'diagnose', themen: ['fsa-schutzbewertung-03', 'fsa-schutzbewertung-04'] },
  { tag: 'programmierung', themen: ['fsa-programme-01', 'fsa-programme-02', 'fsa-programme-04'] },
  { tag: 'schnittstelle', themen: ['fsa-schnittstellen-01', 'fsa-schnittstellen-03', 'fsa-schnittstellen-04'] },
  { tag: 'knx', themen: ['fsa-schnittstellen-02', 'fsa-schnittstellen-04'] },
  { tag: 'bus', themen: ['fsa-schnittstellen-02'] },
  { tag: 'schutz', themen: ['fsa-schutzbewertung-01'] },
  { tag: 'abschaltbedingung', themen: ['fsa-schutzbewertung-02'] },
  { tag: 'abschaltzeit', themen: ['fsa-schutzbewertung-02'] },
  { tag: 'pruefung', themen: ['fsa-schutzbewertung-04'] },
  { tag: 'knx', themen: ['sys-spezifikation-05'] },
  { tag: 'programmierung', themen: ['sys-spezifikation-05'] },
  { tag: 'ueberspannungsschutz', themen: ['sys-schutz-02', 'sys-schutz-06'] },
  { tag: 'emv', themen: ['sys-schutz-06', 't1-anlagen-07'] },
  { tag: 'netzform', themen: ['sys-schutz-01', 'sys-spezifikation-04'] },
  { tag: 'schutz', themen: ['sys-spezifikation-04'] },
  { tag: 'energie', themen: ['sys-nachhaltigkeit-01', 'sys-nachhaltigkeit-03', 'sys-nachhaltigkeit-06'] },
  { tag: 'umwelt', themen: ['sys-nachhaltigkeit-06'] },
  { tag: 'datenschutz', themen: ['sys-nachhaltigkeit-04', 'sys-nachhaltigkeit-05'] },
  { tag: 'it_sicherheit', themen: ['sys-nachhaltigkeit-05'] },
  { tag: 'kalkulation', themen: ['sys-wirtschaft-01', 'sys-wirtschaft-02'] },
  { tag: 'amortisation', themen: ['sys-wirtschaft-02', 'sys-wirtschaft-06'] },
  { tag: 'kosten', themen: ['sys-wirtschaft-01', 'sys-wirtschaft-05'] },
  { tag: 'wirtschaftlichkeit', themen: ['sys-wirtschaft-05', 'sys-wirtschaft-06'] },
  { tag: 'normreihe', themen: ['sys-spezifikation-03'] },
  { tag: 'querschnitt', themen: ['sys-spezifikation-03'] },
  { tag: 'leitung', themen: ['sys-spezifikation-02', 'sys-spezifikation-03'] },
  { tag: 'strombelastbarkeit', themen: ['sys-spezifikation-03'] },
  { tag: 'messung', themen: ['sys-wirtschaft-04'] },
  { tag: 'pruefung', themen: ['sys-wirtschaft-04'] },
];

/** Ist der Eintrag ein Präfix (endet auf „-")? */
function passtThema(muster: string, atomId: string): boolean {
  return muster.endsWith('-') ? atomId.startsWith(muster) : atomId === muster;
}

/** Die Fakten, die zu einem Thema gehören – über die Schlagwörter. */
export function faktenFuerAtom(atom: Atom): Fact[] {
  const raus: Fact[] = [];
  const gesehen = new Set<string>();
  for (const fakt of FAKTEN) {
    const treffer =
      fakt.tags.some((tag) =>
        (FAKTEN_ZU_THEMEN[tag] ?? []).some((m) => passtThema(m, atom.id)),
      ) ||
      ZUSATZ_ZU_THEMEN.some(
        (z) => fakt.tags.includes(z.tag) && z.themen.some((m) => passtThema(m, atom.id)),
      );
    if (!treffer) continue;
    if (gesehen.has(fakt.id)) continue;
    gesehen.add(fakt.id);
    raus.push(fakt);
  }
  return raus;
}

// ---------------------------------------------------------------------------
// Frageformen
// ---------------------------------------------------------------------------

/**
 * Die Einheiten, die als Antwort auf eine Wertfrage taugen.
 *
 * Eine Einheit wie „Kupfer" oder „Aussage" ist keine Maßeinheit – ein Fakt
 * damit trägt keinen abfragbaren Zahlenwert. Die Liste ist bewusst als Menge
 * geführt und nicht als Muster: Ein regulärer Ausdruck mit Schrägstrichen
 * („lm/W", „m/(Ω·mm²)") ist fehleranfällig und schwer zu lesen.
 */
const MASSEINHEITEN = new Set([
  'V', 'kV', 'mV', 'A', 'mA', 'kA', 's', 'ms', 'min', 'h',
  'Monat', 'Monate', 'Woche', 'Wochen', 'Tage', 'Werktage', 'Jahre',
  'Stunden', 'Teilnehmer', 'J', 'Ω', 'kΩ', 'MΩ', 'W', 'kW', 'kWh',
  'VA', 'var', '°C', 'K', '%', 'mm²', 'm', 'km', 'Hz', 'dBµV',
  'lm/W', 'lx', '× In', 'A · s', '1/K', 'Ω·mm²/m', 'm/(Ω·mm²)', '€', '%/K',
  'cos φ', 'Faktor', 'Kennziffer',
]);

/** Erkennt eine echte Maßeinheit; „Kupfer" oder „siehe Werttabelle" nicht. */
export function istMasseinheit(einheit: string | undefined): boolean {
  if (!einheit) return false;
  const roh = einheit.trim();
  if (MASSEINHEITEN.has(roh)) return true;
  // Einheiten mit erklärendem Zusatz, etwa „A (siehe Werttabelle)". Die
  // Tabellenfakten sind als Einzelwert unbrauchbar – die Rechen-Engine lehnt
  // sie ohnehin ab. Als Wissensfrage mit Aussage sind sie weiterhin gültig.
  return false;
}

/** Die Frageformen für einen Zahlenwert. */
const WERT_FORMEN: ((bez: string) => string)[] = [
  (bez) => `Welchen Wert nennt die Norm für: ${bez}?`,
  (bez) => `Welcher Wert ist für „${bez}" hinterlegt?`,
  (bez) => `Wie lautet der hinterlegte Wert zu „${bez}"?`,
  (bez) => `Welcher Zahlenwert gehört zum Eintrag „${bez}"?`,
  (bez) => `Welchen Wert trägt „${bez}" in der Faktenbasis?`,
  (bez) => `Gesucht ist der Zahlenwert von „${bez}" – welcher ist es?`,
  (bez) => `Welcher Wert gilt nach dem Regelwerk für „${bez}"?`,
  (bez) => `Welcher Wert ist zu „${bez}" zu merken?`,
];

/** Die Frageformen für eine Aussage. */
const AUSSAGE_FORMEN: ((bez: string) => string)[] = [
  (bez) => `Welche Aussage trifft auf „${bez}" zu?`,
  (bez) => `Was gilt für „${bez}"?`,
  (bez) => `Welche der folgenden Aussagen beschreibt „${bez}" richtig?`,
  (bez) => `Was ist zu „${bez}" richtig?`,
];

/** Der Kern einer Aussage – erster Satz, gekürzt. */
function aussageKern(fakt: Fact): string | null {
  const roh = fakt.bemerkung?.trim();
  if (!roh) return null;
  const ersterSatz = roh.split(/(?<=[.!?])\s+/)[0] ?? roh;
  if (ersterSatz.length < 20) return null;
  return ersterSatz.length > 180 ? `${ersterSatz.slice(0, 177)}…` : ersterSatz;
}

// ---------------------------------------------------------------------------
// Erzeugung
// ---------------------------------------------------------------------------

/** Ein Kandidat für die richtige Antwort samt Zusatzangaben. */
interface WissensSpec {
  prompt: string;
  richtig: string;
  falsch: [string, string];
  begruendung: string;
  erklaerung: string;
  factRefs: FactRef[];
  learningGoal: string;
  hint: string;
  stufe: 1 | 2 | 3;
  /** Für die Sortierung: gleiche Zahl bedeutet gleiche Herkunft. */
  gruppe: string;
}

/** Formatiert einen Faktwert als Antworttext. */
function wertText(fakt: Fact): string {
  const einheit = (fakt.einheit ?? '').trim();
  if (fakt.wert === undefined) return '';
  const zahl = formatiereWert(fakt.wert, '');
  return einheit ? `${zahl} ${einheit}` : zahl;
}

/**
 * Ähnliche Zahlenwerte derselben Einheit als falsche Antworten.
 *
 * „Ähnlich" heißt hier: gleiche Einheit, Größenordnung innerhalb eines
 * Faktors 10. Genau das sind die Werte, die man verwechselt. Ist die Auswahl
 * zu klein, wird auf alle Fakten mit derselben Einheit erweitert; erst wenn
 * auch das nicht reicht, entfällt die Frage.
 */
function aehnlicheWerte(fakt: Fact, alle: Fact[]): string[] {
  const basis = fakt.wert!;
  const einheit = (fakt.einheit ?? '').trim();
  const kandidaten = alle.filter(
    (f) =>
      f.id !== fakt.id &&
      f.wert !== undefined &&
      f.wert !== 0 &&
      (f.einheit ?? '').trim() === einheit &&
      Math.abs(f.wert) <= Math.abs(basis) * 10 + 1 &&
      Math.abs(f.wert) >= Math.abs(basis) / 10 - 0.001,
  );
  // Nach Abstand sortieren: die nächstliegenden Werte sind die schwierigsten.
  kandidaten.sort((a, b) => Math.abs(a.wert! - basis) - Math.abs(b.wert! - basis));
  const texte: string[] = [];
  for (const k of kandidaten) {
    const t = wertText(k);
    if (t && t !== wertText(fakt) && !texte.includes(t)) texte.push(t);
    if (texte.length === 2) break;
  }
  return texte;
}

/**
 * Aussagen anderer Fakten als falsche Antworten.
 *
 * Genommen werden Aussagen aus demselben Themenumfeld – dort liegt die
 * Verwechslung. Eine Aussage über den RCD als falsche Antwort zu einer Frage
 * über die Wärmepumpe wäre zu leicht zu durchschauen.
 */
function fremdeAussagen(fakt: Fact, umfeld: Fact[]): string[] {
  const texte: string[] = [];
  for (const f of umfeld) {
    if (f.id === fakt.id) continue;
    const kern = aussageKern(f);
    if (!kern) continue;
    if (texte.includes(kern)) continue;
    texte.push(kern);
    if (texte.length === 2) break;
  }
  return texte;
}

/**
 * Erzeugt die Wissensaufgaben eines Themas.
 *
 * Reine Funktion: Der Aufrufer bestimmt über sein Textgedächtnis, was noch
 * gestellt werden darf. Hier wird nichts gespeichert.
 */
export function wissensFragenFuerAtom(atom: Atom, versatz = 0): Task[] {
  const umfeld = faktenFuerAtom(atom);
  if (umfeld.length === 0) return [];

  const specs: WissensSpec[] = [];

  for (let i = 0; i < umfeld.length; i += 1) {
    const fakt = umfeld[i]!;

    // --- Form 1: Wertfrage ------------------------------------------------
    if (fakt.wert !== undefined && fakt.wert !== 0 && istMasseinheit(fakt.einheit)) {
      const falsch = aehnlicheWerte(fakt, umfeld.length >= 4 ? umfeld : FAKTEN);
      if (falsch.length === 2) {
        const form = WERT_FORMEN[(i + versatz) % WERT_FORMEN.length]!;
        specs.push({
          prompt: form(fakt.bezeichnung),
          richtig: wertText(fakt),
          falsch: [falsch[0]!, falsch[1]!],
          begruendung: fakt.bemerkung ?? `Der Wert gehört zu „${fakt.bezeichnung}".`,
          erklaerung: `${fakt.bezeichnung}: ${wertText(fakt)}.`,
          factRefs: [{ factId: fakt.id, value: fakt.wert }],
          learningGoal: `${fakt.bezeichnung} sicher abrufen können.`,
          hint: `Gesucht ist ein Wert in ${fakt.einheit}; die übrigen Werte gehören zu anderen Größen.`,
          stufe: 1,
          gruppe: `wert:${fakt.id}`,
        });
      }
    }

    // --- Form 2: Aussagefrage --------------------------------------------
    const kern = aussageKern(fakt);
    if (kern) {
      const falsch = fremdeAussagen(fakt, umfeld);
      if (falsch.length === 2) {
        const form = AUSSAGE_FORMEN[(i + versatz) % AUSSAGE_FORMEN.length]!;
        specs.push({
          prompt: form(fakt.bezeichnung),
          richtig: kern,
          falsch: [falsch[0]!, falsch[1]!],
          begruendung: fakt.bemerkung ?? kern,
          erklaerung: kern,
          factRefs: [{ factId: fakt.id }],
          learningGoal: `${fakt.bezeichnung} inhaltlich einordnen können.`,
          hint: 'Nur eine Aussage gehört zu diesem Begriff; die anderen beschreiben andere Größen.',
          stufe: 2,
          gruppe: `aussage:${fakt.id}`,
        });
      }
    }
  }

  // Die Fragen werden als Task gebaut. Was die Validierung nicht besteht,
  // wird still verworfen – die übrigen bleiben.
  const aufgaben: Task[] = [];
  const gesehen = new Set<string>();
  for (const spec of specs) {
    if (gesehen.has(spec.prompt)) continue;
    const aufgabe = baueWissensTask(atom, spec);
    if (!aufgabe) continue;
    gesehen.add(spec.prompt);
    aufgaben.push(aufgabe);
  }
  return aufgaben;
}

/** Baut aus einem Wissensvorschlag eine geprüfte Aufgabe. Gibt null bei Fehler. */
function baueWissensTask(atom: Atom, spec: WissensSpec): Task | null {
  // Die richtige Antwort wird auf eine der drei Positionen gesetzt – sonst
  // stünde sie immer vorn. Der Versatz kommt aus der Aufgabe selbst, damit
  // dieselbe Frage bei jedem Aufruf gleich aussieht.
  const versatz = [...spec.prompt].reduce((s, c) => s + c.charCodeAt(0), 0) % 3;
  const kennungen = ['a', 'b', 'c'];
  const falschIds = kennungen.filter((_, i) => i !== versatz);
  const korrekt = kennungen[versatz]!;

  const optionen = kennungen.map((id) => {
    if (id === korrekt) return { id, text: spec.richtig };
    const index = falschIds.indexOf(id);
    return { id, text: spec.falsch[index]! };
  });

  const rationale: Record<string, string> = { [korrekt]: spec.begruendung };
  for (const id of falschIds) {
    rationale[id] = 'Diese Aussage beschreibt eine andere Größe oder einen anderen Zusammenhang.';
  }

  const bausatz: TaskBausatz = {
    proposal: {
      proposalId: `wissen_${atom.id}_${parameterHash([spec.prompt, spec.richtig])}`,
      format: 'mc',
      stufe: spec.stufe,
      estimatedSeconds: spec.stufe === 1 ? 25 : 40,
      examArea: atom.bereich,
      topicIds: [atom.id],
      prompt: spec.prompt,
      options: optionen,
      factRefs: spec.factRefs,
      learningGoal: spec.learningGoal,
      hint: spec.hint,
      origin: 'statisch',
    },
    paramsHash: parameterHash(['wissen', atom.id, spec.prompt, spec.richtig]),
    correctOptionId: korrekt,
    optionRationale: rationale,
    solutionSteps: [
      { label: 'Gesucht ist', result: spec.prompt },
      { label: 'Zutreffend ist', result: spec.richtig, factId: spec.factRefs[0]?.factId },
      { label: 'Begründung', result: spec.begruendung },
    ],
    explanation: spec.erklaerung,
    validierungsOptionen: { duplikatPruefen: false },
  };

  try {
    return baueTask(bausatz);
  } catch {
    return null;
  }
}

/** Nur für Tests und Berichte: die Fakten, die ein Thema tragen kann. */
export function faktenAnzahlFuerAtom(atom: Atom): number {
  return faktenFuerAtom(atom).length;
}

/** Alle Fakten, die überhaupt in einer Wissensfrage verwendet werden können. */
export function wissensfaehigeFakten(): Fact[] {
  return FAKTEN.filter(
    (f) =>
      (f.wert !== undefined && f.wert !== 0 && istMasseinheit(f.einheit)) ||
      aussageKern(f) !== null,
  );
}

export { holeFakt };
