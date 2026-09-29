import type { ExamArea, TaskFormat } from '../../domain/types.ts';

/**
 * Fallaufgaben und offene Aufgaben.
 *
 * Damit sind die drei Antwortformate der echten Prüfung abgedeckt:
 *
 *   - **fall**        Situationsbeschreibung mit Folgefrage. Bildet das Format
 *                     der Funktions- und Systemanalyse ab: Du bekommst einen
 *                     Anlagenzustand und musst daraus handeln.
 *   - **strukturiert** Offene Aufgabe mit festen Teilaspekten, die einzeln
 *                     aufgeführt sind – wie im Systementwurf.
 *   - **offen**       Freitext mit einer einzigen klaren Frage. Vorkommen in
 *                     Funktionsanalyse und Wirtschafts- und Sozialkunde.
 *
 * Wichtig: Bei offenen Aufgaben ist `richtig` NICHT ein einzelner Satz. Es sind
 * die Begriffe, ohne die die Antwort nicht trägt. Die Musterlösung zeigt, wie
 * eine gute Antwort aussehen könnte – sie ist ein Vorschlag, keine Pflicht.
 */

export interface Folgefrage {
  frage: string;
  optionen: [string, string, string];
  /** Index der richtigen Option. */
  korrekt: number;
  begruendung: string;
}

export interface Teilfrage {
  frage: string;
  /** Begriffe, die in einer gültigen Antwort stehen müssen. */
  pflichtbegriffe: string[];
  /** Hinweis, der die Richtung vorgibt, ohne die Lösung zu verraten. */
  hilfe: string;
  muster: string;
  punkte: number;
}

export interface Fallaufgabe {
  id: string;
  bereich: ExamArea;
  format: Extract<TaskFormat, 'fall' | 'strukturiert' | 'offen'>;
  stufe: 3 | 4 | 5;
  dauerSekunden: number;
  titel: string;
  /** Situationsbeschreibung – der Stoff, um den es geht. */
  situation: string;
  /** Ausgangsdaten. Alle Werte stammen aus der Faktenbasis oder der Engine. */
  ausgangslage: { bezeichnung: string; wert: string; quelle?: string }[];
  frage: string;
  optionen: [string, string, string] | null;
  korrektOption: number | null;
  optionBegruendung: string | null;
  teilfragen: Teilfrage[] | null;
  lernziel: string;
  topicIds: string[];
  verweis: string;
}

type RohFallaufgabe = Omit<
  Fallaufgabe,
  'optionen' | 'korrektOption' | 'optionBegruendung' | 'teilfragen'
> & Partial<Pick<Fallaufgabe, 'optionen' | 'korrektOption' | 'optionBegruendung' | 'teilfragen'>>;

const ROH: RohFallaufgabe[] = [
  // -------------------------------------------------------------------------
  // Funktions- und Systemanalyse – Fallaufgaben
  // -------------------------------------------------------------------------
  {
    id: 'fa-01',
    bereich: 'funktionsanalyse',
    format: 'fall',
    stufe: 3,
    dauerSekunden: 180,
    titel: 'Der Lichtkreis flackert',
    situation:
      'In einem Bürogebäude fällt der Lichtkreis im zweiten Stock sporadisch aus. ' +
      'Die Sicherung hält. Beim Herausnehmen der Leuchte aus der Dose lässt sich ' +
      'der Fehler nicht mehr feststellen – die Störung tritt nur im Betrieb auf, ' +
      'und zwar dann, wenn die Heizung im Raum läuft.',
    ausgangslage: [
      { bezeichnung: 'Leuchtmittel', wert: '2 × 36 W Leuchtstofflampen', quelle: 'Aufgabenstellung' },
      { bezeichnung: 'Leitung', wert: '1,5 mm², Verlegeart C', quelle: 'Faktenbasis' },
      { bezeichnung: 'Absicherung', wert: 'B16, Fehlerstromschutz 30 mA', quelle: 'Aufgabenstellung' },
    ],
    frage: 'Wie grenzt du den Fehler zuerst ein?',
    optionen: [
      'Messung im eingebauten Zustand, unter Last und bei eingeschalteter Heizung – Temperaturabhängigkeit gezielt prüfen',
      'Sofort die gesamte Leitung austauschen, da sie zu dünn dimensioniert ist',
      'Den Leitungsschutzschalter gegen einen größeren austauschen, damit er nicht mehr auslöst',
    ],
    korrektOption: 0,
    optionBegruendung:
      'Die Störung ist temperaturabhängig und im ausgebauten Zustand nicht vorhanden. ' +
      'Das spricht für eine lose Klemme oder einen thermischen Übergangswiderstand. ' +
      'Grundlage ist § 13 ElekAusbV: Fehlerursache bestimmen und beseitigen – ' +
      'nicht durch Raten ersetzen.',
    lernziel: 'Fehlerbild nutzen, um die Messstrategie zu bestimmen.',
    topicIds: ['fsa-fehlersuche-01', 'fsa-fehlersuche-02', 'fsa-verfahren-04'],
    verweis: 'Berufsbildposition 6 – Funktions- und Systemanalyse, § 13',
  },
  {
    id: 'fa-02',
    bereich: 'funktionsanalyse',
    format: 'fall',
    stufe: 3,
    dauerSekunden: 180,
    titel: 'FI löst nicht aus',
    situation:
      'Bei der Wiederholungsprüfung zeigt die Funktionsprüfung des ' +
      'Fehlerstromschutzes keinen Fehler. Im Prüfprotokoll ist die Schleifenimpedanz ' +
      'eingetragen, der Wert liegt jedoch deutlich über dem, den die Anlage bei der ' +
      'Erstprüfung aufwies.',
    ausgangslage: [
      { bezeichnung: 'Nennspannung', wert: '230 V', quelle: 'Faktenbasis u0-230' },
      { bezeichnung: 'Bemessungsfehlerstrom', wert: '30 mA', quelle: 'Faktenbasis idn-personenschutz' },
      { bezeichnung: 'Schleifenimpedanz neu', wert: '9,2 Ω', quelle: 'Messprotokoll' },
      { bezeichnung: 'Schleifenimpedanz Erstprüfung', wert: '0,9 Ω', quelle: 'Messprotokoll' },
    ],
    frage: 'Was bedeutet dieser Unterschied für die Abnahme?',
    optionen: [
      'Der Wert ist technisch nicht zu beanstanden, wenn der FI weiterhin auslöst',
      'Der Wert überschreitet die Abschaltbedingung deutlich; die Anlage ist so nicht abzunehmen und der Anlagenfehler ist zu suchen',
      'Die Abschaltbedingung gilt nur für die Erstprüfung und später nicht mehr',
    ],
    korrektOption: 1,
    optionBegruendung:
      'R_A ≤ U₀ / I_Δn gilt jederzeit, nicht nur bei der Erstprüfung. Ein ' +
      'Zunahme um das Zehnfache deutet auf eine nachträgliche Änderung, einen ' +
      'schlechten Übergang oder eine unzulässige Verlängerung hin.',
    lernziel: 'Die Abschaltbedingung als fortgeltende Anforderung verstehen.',
    topicIds: ['fsa-schutzbewertung-02', 'fsa-schutzbewertung-04', 'fsa-verfahren-05'],
    verweis: 'Berufsbildposition 6 – Funktions- und Systemanalyse, § 13',
  },
  {
    id: 'fa-03',
    bereich: 'funktionsanalyse',
    format: 'fall',
    stufe: 3,
    dauerSekunden: 240,
    titel: 'Busbetriebeinteilte Anlage',
    situation:
      'Eine Anlage mit KNX-Bus meldet am Bedienpanel „Aktor 3 nicht erreichbar". ' +
      'Die übrigen Aktoren arbeiten. Die Leitungen zu Aktor 3 wurden bei einer ' +
      'Tiefbaumaßnahme des Nachbarn unterbrochen.',
    ausgangslage: [
      { bezeichnung: 'Fehlermeldung', wert: 'Aktor 3 nicht erreichbar', quelle: 'Aufgabenstellung' },
      { bezeichnung: 'Adressierung', wert: 'Adressen 1 bis 12 vergeben', quelle: 'Aufgabenstellung' },
    ],
    frage: 'In welcher Reihenfolge gehst du vor?',
    optionen: [
      'Alle Aktoren neu parametrieren, dann testen',
      'Adressierung am Panel prüfen, dann die Busleitung bis Aktor 3 durchmessen und den Aktor einzeln testen',
      'Den Aktor sofort austauschen, da Busgeräte selten defekt sind',
    ],
    korrektOption: 1,
    optionBegruendung:
      'Die Reihenfolge folgt dem Aufbau: zuerst die logische Ebene (Adresse, ' +
      'Parametrierung), dann die physikalische (Leitung), zuletzt das Gerät. ' +
      'So wird der Fehler eingegrenzt, nicht umgangen.',
    lernziel: 'Signalverfolgung entlang der Busschnittstelle üben.',
    topicIds: ['fsa-schnittstellen-02', 'fsa-fehlersuche-07', 'fsa-programme-03'],
    verweis: 'Berufsbildposition 6 – Funktions- und Systemanalyse, § 13',
  },

  // -------------------------------------------------------------------------
  // Systementwurf – offene Aufgaben mit festen Teilaspekten
  // -------------------------------------------------------------------------
  {
    id: 'so-01',
    bereich: 'systementwurf',
    format: 'strukturiert',
    stufe: 5,
    dauerSekunden: 900,
    titel: 'Entwurf: Erweiterung eines Bürogebäudes um eine Wärmepumpe',
    situation:
      'Ein Bürogebäude (Baujahr 1998) soll um eine Luft-Wasser-Wärmepumpe für die ' +
      'Heizung und das Warmwasser erweitert werden. Der Bestand wird mit Gas beheizt. ' +
      'Der Kunde wünscht eine Lösung ohne Unterbrechung des Betriebs und erwartet ' +
      'eine belastbare Aussage zu den Betriebskosten.',
    ausgangslage: [
      { bezeichnung: 'Anforderung Heizlast', wert: 'vor Ort ermitteln', quelle: 'Berufsbildposition 1' },
      { bezeichnung: 'Vorlauf-/Rücklauftemperatur', wert: 'niedrig, Heizkörpertafel', quelle: 'Bestandsaufnahme' },
      { bezeichnung: 'Warmwasserbedarf', wert: 'aus Nutzerverhalten ableiten', quelle: 'Kundenauskunft' },
    ],
    frage:
      'Beschreibe den Entwurf. Gliedere ihn nach Anforderungsaufnahme, ' +
      'Lösungsvarianten, Anlagenspezifikation, Komponentenauswahl und Datenschutz.',
    teilfragen: [
      {
        frage: 'Welche Angaben musst du vor der Angebotsphase erheben?',
        pflichtbegriffe: [
          'Heizlast',
          'bauphysikalische',
          'Warmwasser',
          'Betriebszeiten',
          'Platzbedarf',
          'Schall',
          'Bestandsanlage',
        ],
        hilfe: 'Denke an alles, was die Dimensionierung beeinflusst – nicht nur an die Leistung.',
        muster:
          'Heizlastermittlung nach Gebäudetyp und Bauweise, Warmwasserbedarf aus Nutzerverhalten, ' +
          'bauphysikalische Kennwerte des Gebäudes, verfügbare Aufstellfläche, Schallimmissionen für ' +
          'die Nachbarn, Anschluss an die Bestandsanlage, Bauzeit und Betriebsunterbrechung.',
        punkte: 6,
      },
      {
        frage: 'Welche Lösungsvarianten würdest du gegenüberstellen?',
        pflichtbegriffe: [
          'Wärmepumpe',
          'Gas',
          'Fernwärme',
          'Vergleich',
          'Betriebskosten',
          'Investition',
          'Emission',
        ],
        hilfe: 'Der Kunde will einen belastbaren Vergleich, keine Empfehlung aus dem Bauchgefühl.',
        muster:
          'Wärmepumpe allein, Wärmepumpe mit Spitzenlastkessel, Fernwärmeanschluss, ' +
          'Sanierung der Gebäudehülle mit anschließend kleinerer Wärmeerzeugung. ' +
          'Jeweils gegenüberstellen: Investition, laufende Kosten, Wartung, Emission, Ausfallrisiko.',
        punkte: 6,
      },
      {
        frage: 'Was gehört in die Anlagenspezifikation und in die Komponentenauswahl?',
        pflichtbegriffe: [
          'Wärmeleistung',
          'Heizlast',
          'Auslegung',
          'Betriebsmedium',
          'Schall',
          'Schnittstelle',
          'Regelung',
        ],
        hilfe: 'Die Spezifikation muss so genau sein, dass zwei Anbieter dasselbe Angebot machen könnten.',
        muster:
          'Heizleistung mindestens nach berechneter Heizlast ausgelegt, Auslegungspunkt und ' +
          'Bivalenzpunkt festlegen, Medium und Temperaturen, Pufferspeicher und Hydraulik, ' +
          'Regelungsstrategie, Schallpegel am Nachbarhaus, Schnittstellen zur Gebäudeautomation.',
        punkte: 5,
      },
      {
        frage: 'Welche Datenschutz- und Informationssicherheitsanforderungen entstehen?',
        pflichtbegriffe: [
          'personenbezogen',
          'Zugriffsschutz',
          'Passwort',
          'Netzwerk',
          'Fernzugriff',
          'Verschlüsselung',
          'Update',
        ],
        hilfe: 'Ein Heizungsregler im Haus ist ein netzwerkfähiges Gerät – auch ohne Display.',
        muster:
          'Fernwartung nur mit Zugriffsschutz und Passwort, Fernzugriff dokumentiert und widerrufbar, ' +
          'getrenntes Netzsegment für die Gebäudeautomation, Verschlüsselung der Übertragung, ' +
          'Update- und Schwachstellenmanagement, keine personenbezogenen Daten im Heizungsregler.',
        punkte: 5,
      },
    ],
    lernziel: 'Den vollständigen Entwurfsschritt vom Bedarf bis zur Dokumentation durchlaufen.',
    topicIds: [
      'sys-analyse-01',
      'sys-analyse-02',
      'sys-analyse-03',
      'sys-varianten-01',
      'sys-varianten-02',
      'sys-spezifikation-01',
      'sys-spezifikation-02',
      'sys-schutz-01',
      'sys-schutz-03',
      'sys-nachhaltigkeit-05',
      'sys-dokumentation-01',
    ],
    verweis: 'Berufsbildposition 1 – Konzipieren, § 12',
  },
  {
    id: 'so-02',
    bereich: 'systementwurf',
    format: 'strukturiert',
    stufe: 5,
    dauerSekunden: 900,
    titel: 'Entwurf: Erneuerung der Beleuchtung eines Parkhauses',
    situation:
      'Ein 240 Plätze großes Parkhaus ist mit veralteten Leuchtstoffleuchten ' +
      'ausgestattet. Der Betreiber möchte auf LED umstellen, erwartet aber auch eine ' +
      'Aussage zu Ausfallrisiko, Wartung und möglicher Einbindung einer ' +
      'Präsenzsteuerung.',
    ausgangslage: [
      { bezeichnung: 'Anzahl Leuchten', wert: '240', quelle: 'Aufgabenstellung' },
      { bezeichnung: 'Betriebszeit', wert: 'durchgehend', quelle: 'Aufgabenstellung' },
      { bezeichnung: 'Umgebung', wert: 'Staub, Feuchte, gelegentlich Wasser', quelle: 'Bestandsaufnahme' },
    ],
    frage:
      'Beschreibe den Entwurf mit Blick auf Auswahl, Schutz, Verfügbarkeit und Dokumentation.',
    teilfragen: [
      {
        frage: 'Nach welchen Kriterien wählst du die Leuchte aus?',
        pflichtbegriffe: [
          'Schutzart',
          'Wirkungsgrad',
          'Lichtstrom',
          'Farbwiedergabe',
          'Betriebsdauer',
          'Schaltzyklen',
        ],
        hilfe: 'Ein Parkhaus ist kein Büro – die Umgebungsbedingungen entscheiden mit.',
        muster:
          'Schutzart mindestens passend für Staub und Feuchte, hoher Wirkungsgrad, Lichtstrom und ' +
          'Ausleuchtung nachvollziehbar berechnet, ausreichende Farbwiedergabe für Fahrer, ' +
          'ausgelegt auf hohe Einschaltzyklen, Ersatzteilstrategie und Betriebsdauer.',
        punkte: 6,
      },
      {
        frage: 'Wie sicherst du die Verfügbarkeit ab?',
        pflichtbegriffe: [
          'Redundanz',
          'Ausfall',
          'Sicherung',
          'Kennlinie',
          'Absicherung',
          'Funktionstest',
        ],
        hilfe: 'Denk an den Fall, dass eine Leuchte ausfällt – und an die Sicherungsebene.',
        muster:
          'Leuchtenschaltung je Sicherung so dimensionieren, dass ein Ausfall nicht den ganzen Strang ' +
          'nimmt, gleichmäßige Aufteilung, Reserve im Verteiler, Funktionsprüfung nach ' +
          'Inbetriebnahme, ausdrückliche Regelung des Betriebs bei Ausfall.',
        punkte: 5,
      },
      {
        frage: 'Wie würdest du eine Präsenzsteuerung einbinden, und was ist dabei zu beachten?',
        pflichtbegriffe: [
          'Präsenzmelder',
          'Schalthysterese',
          'Standby',
          'Nachtabsenkung',
          'Datenschutz',
          'personenbezogen',
          'Wartung',
        ],
        hilfe: 'Präsenzsteuerung spart Energie, erzeugt aber Daten.',
        muster:
          'Präsenzmelder je Zone, ausreichende Schalthysterese gegen Flackern, ' +
          'Standby- und Nachtabsenkung, klare Bedienstrategie, Datenschutz: keine Erfassung von ' +
          'Personen über das hinaus, was für die Beleuchtung nötig ist, sowie Wartungszugang.',
        punkte: 5,
      },
    ],
    lernziel: 'Anlagenauswahl wirtschaftlich und schutztechnisch begründen.',
    topicIds: [
      'sys-analyse-04',
      'sys-varianten-02',
      'sys-spezifikation-04',
      'sys-spezifikation-05',
      'sys-schutz-04',
      'sys-schutz-05',
      'sys-nachhaltigkeit-03',
      'sys-nachhaltigkeit-05',
      'sys-dokumentation-02',
    ],
    verweis: 'Berufsbildposition 1 – Konzipieren, § 12',
  },

  // -------------------------------------------------------------------------
  // Funktions- und Systemanalyse – offene Aufgabe
  // -------------------------------------------------------------------------
  {
    id: 'fo-01',
    bereich: 'funktionsanalyse',
    format: 'offen',
    stufe: 4,
    dauerSekunden: 600,
    titel: 'Bewertung einer übernommenen Anlage',
    situation:
      'Du übernimmst die Erstprüfung einer älteren Wohnungsanlage. Bei der Sichtprüfung ' +
      'findest du eine Steckdose ohne Abdeckung, eine Steckdose in der Nasszone ohne ' +
      'Fehlerstromschutz und ein veraltetes Schienenverteilersystem ohne Kennzeichnung.',
    ausgangslage: [
      { bezeichnung: 'Baujahr', wert: '1994', quelle: 'Aufgabenstellung' },
      { bezeichnung: 'Steckdosen Bad', wert: 'ohne FI, ohne erhöhte Schutzart', quelle: 'Sichtprüfung' },
    ],
    frage: 'Wie gehst du mit den festgestellten Mängeln um?',
    teilfragen: [
      {
        frage: 'Welche Mängel sind sofort zu beheben, welche sind zu dokumentieren?',
        pflichtbegriffe: [
          'Gefahr',
          'sofort',
          'Fehlerstromschutz',
          'Schutzart',
          'dokumentieren',
          'Auftrag',
          'gesperrt',
        ],
        hilfe: 'Die Steckdose ohne Abdeckung und die ohne Fehlerstromschutz sind unterschiedlich dringend.',
        muster:
          'Steckdose ohne Abdeckung in Feuchträumen: sofort beheben oder bis dahin nicht benutzen, da ' +
          'Berührungs- und Brandgefahr besteht. Fehlender Fehlerstromschutz und fehlende erhöhte ' +
          'Schutzart: Mangel feststellen, Nachrüstung beauftragen, erneute Prüfung vereinbaren. ' +
          'Unbeschriftetes Schienensystem: kennzeichnen, Anlagendokumentation erstellen.',
        punkte: 8,
      },
    ],
    lernziel: 'Prüfmängel nach Gefährdung einstufen und die nächsten Schritte begründen.',
    topicIds: [
      'fsa-schutzbewertung-01',
      'fsa-schutzbewertung-04',
      'fsa-dokumentation-01',
      'fsa-dokumentation-02',
    ],
    verweis: 'Berufsbildposition 6 – Funktions- und Systemanalyse, § 13',
  },
];

/**
 * Jede Aufgabe bekommt alle Felder – auch die nicht benutzten.
 * Dadurch muss beim Lesen nicht geprüft werden, ob etwas fehlt.
 */
export const FALLAUFGABEN: Fallaufgabe[] = ROH.map((f) => ({
  ...f,
  optionen: f.optionen ?? null,
  korrektOption: f.korrektOption ?? null,
  optionBegruendung: f.optionBegruendung ?? null,
  teilfragen: f.teilfragen ?? null,
}));

export function fallaufgabenVon(bereich: ExamArea): Fallaufgabe[] {
  return FALLAUFGABEN.filter((f) => f.bereich === bereich);
}
