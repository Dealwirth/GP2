import type { RechenErgebnis } from '../engine/calc/index.ts';
import {
  stromDrehstrom,
  stromEinphasig,
  strombelastbarkeit,
  spannungsfall,
} from '../engine/calc/index.ts';
import { holeFakt } from '../content/facts/index.ts';

/**
 * Der geführte Kundenauftrag.
 *
 * Die praktische Prüfung ist kein Multiple Choice: Sie beginnt mit einem
 * Auftrag, verlangt eine Planung, die stimmen muss, dann Arbeit nach den
 * fünf Sicherheitsregeln, dann Messen mit Protokoll, zuletzt das
 * Fachgespräch. Diesem Verlauf folgt dieses Modell – Schritt für Schritt,
 * mit echter Rechnung aus der Engine und mit Bewertung, die so in der
 * Prüfung gezählt wird (PAL-Schema: Planung, Durchführung, Prüf- und
 * Messergebnisse, Fachgespräch).
 *
 * Bewusst ohne Spielerei: Kein Punktesammler, keine Sticker. Was zählt,
 * ist die Frage „Würde das in der Prüfung durchgehen?“ – und die wird
 * hier nach jeder Entscheidung beantwortet.
 */

// ---------------------------------------------------------------------------
// Szenarien
// ---------------------------------------------------------------------------

export interface AuftragsSzenario {
  id: string;
  titel: string;
  /** Der Auftragstext, wie er auf dem Prüfungsdeckblatt stehen würde. */
  auftrag: string;
  /** Die Bestandsangaben, die der Prüfungsumgebung beiliegen. */
  bestand: string[];
  /** Was der Kundendialog noch ergibt – Fragen, die man stellen muss. */
  kundenAngaben: string[];
  /** Erwartete Planungsentscheidungen mit Prüfung. */
  planungsschritte: PlanungsSchritt[];
  /** Reihenfolge der Ausführungsschritte (richtig = so wäre es prüfungstauglich). */
  ausfuehrung: AusfuehrungsSchritt[];
  /** Die Fragen des situativen Fachgesprächs zu dieser Anlage. */
  fachgespraech: FachgespraechsFrage[];
}

export interface PlanungsSchritt {
  id: string;
  frage: string;
  /** Auswahlmöglichkeiten mit Bewertung: nur eine ist fachlich richtig. */
  optionen: { text: string; korrekt: boolean; begruendung: string }[];
  /** Warum das zählt – wird nach der Antwort gezeigt. */
  hintergrund: string;
}

export interface AusfuehrungsSchritt {
  id: string;
  titel: string;
  /** Was an dieser Stelle fachlich passiert. */
  inhalt: string;
  /** Sicherheitsregel oder Norm, wenn eins betroffen ist. */
  regel?: string;
  /** Wird dieser Schritt übersprungen, fällt das hier auf. */
  folgeBeiUeberspringen: string;
}

/** Frage des situativen Fachgesprächs mit den erwarteten Antwortpunkten. */
export interface FachgespraechsFrage {
  frage: string;
  /** Worauf die Prüfer hören – als Checkliste zum Selbstvergleich. */
  erwartetePunkte: string[];
}

/** Die fünf Sicherheitsregeln, Ausführung immer zuerst. */
export const FUENF_SICHERHEITSREGELN = [
  'Spannungsfrei schalten',
  ' gegen Wiedereinschalten sichern',
  ' Spannungsfreiheit feststellen',
  ' benachbarte, spannungsführende Teile abdecken oder abschranken',
  ' Spannungsfreiheit nochmals feststellen (am Arbeitsplatz)',
] as const;

const SZENARIO_WAERMEPUMPE: AuftragsSzenario = {
  id: 'waermepumpe',
  titel: 'Kundenauftrag: Wärmepumpe ans Netz',
  auftrag:
    'In einem Einfamilienhaus (Bj. 2018) wird eine Luft-Wasser-Wärmepumpe ' +
    '(16 kW, 400 V, Drehstrom) installiert. Der Verteiler im Keller bietet ' +
    'Reserve. Herrsche Leitungslänge Zähler–Anlage: 28 m. Vorgesehen ist ' +
    'NYM-J 5×6 mm² in Verlegeart C. Prüfungsrelevant: Planung, Montage, ' +
    'Prüfung mit Protokoll, Übergabe.',
  bestand: [
    'Zählerschrank mit Reserveplätze, Hauptsicherung 63 A',
    'Freier Leitungsschutzschalter-Platz, Zuleitung vom Hausanschluss',
    'Leitungsweg Keller außenmauer mit ca. 4 Bögen, Gesamtlänge 28 m',
    'Bestehende Anlage nach VDE 0100-600 geprüft (Schleifenwiderstand 0,8 Ω)',
  ],
  kundenAngaben: [
    'Die Wärmepumpe hat einen elektronischen Anlauf (keine hohen Einschaltströme)',
    'Betriebszeit ca. 4000 h/a – der Stromverbrauch ist ein Kostenfaktor',
    'Im Keller ist ein Arbeitsplatz mit Kontakt zu spannungsführenden Teilen nicht ausgeschlossen',
  ],
  planungsschritte: [
    {
      id: 'p-strom',
      frage: 'Welchen Betriebsstrom zieht die Wärmepumpe (cos φ = 0,92)?',
      optionen: [
        { text: 'etwa 25,2 A', korrekt: true, begruendung: 'I = P/(√3·U·cos φ) = 16000/(1,732·400·0,92)' },
        { text: 'etwa 43,5 A', korrekt: false, begruendung: 'Das wäre die Rechnung ohne √3 (einphasig gerechnet).' },
        { text: 'etwa 16,0 A', korrekt: false, begruendung: 'Das wäre die Leistung als Strom bei 1000 V gelesen.' },
      ],
      hintergrund:
        'Bei Drehstrom immer mit √3 rechnen. 16 kW bei 400 V und cos φ = 0,92 ' +
        'gibt rund 25 A – die Zuleitung muss das dauerhaft tragen.',
    },
    {
      id: 'p-querschnitt',
      frage: 'Ist NYM-J 5×6 mm² ausreichend dimensioniert?',
      optionen: [
        { text: 'Ja – I_z = 36 A > 25,2 A, mit Reservetraum', korrekt: true, begruendung: 'Verlegeart C, 6 mm² Cu → 36 A' },
        { text: 'Nein – es braucht 10 mm²', korrekt: false, begruendung: '10 mm² wäre knapp überdimensioniert, 6 mm² trägt 36 A.' },
        { text: 'Ja, aber nur bei 20 °C', korrekt: false, begruendung: 'Keller ist bei 30 °C Referenz – der Wert gilt direkt.' },
      ],
      hintergrund:
        '6 mm² Cu in Verlegeart C trägt 36 A. Bei 25,2 A Betriebsstrom bleibt ' +
        'eine Reservetraum von gut 40 % – Norm gerecht, wenn auch knapp bemessen.',
    },
    {
      id: 'p-absicherung',
      frage: 'Welche Absicherung gehört an den Anfang der Zuleitung?',
      optionen: [
        { text: 'B 32 A – trägt dauerhaft, schützt 6 mm²', korrekt: true, begruendung: 'I_B ≤ I_n ≤ I_z: 25,2 ≤ 32 ≤ 36' },
        { text: 'B 40 A – passt zur Hauptsicherung', korrekt: false, begruendung: '40 A > 36 A – das Kabel wäre nicht geschützt.' },
        { text: 'C 32 A wegen Anlaufstrom', korrekt: false, begruendung: 'Elektronischer Anlauf braucht keine C-Kennlinie.' },
      ],
      hintergrund:
        'Der Drei-Satz der Leitungssicherung: I_B ≤ I_n ≤ I_z. B 32 A erfüllt ' +
        'ihn (25,2 ≤ 32 ≤ 36). B 40 verletzt die zweite Grenze – das Kabel ' +
        'trüge dauerhaft mehr, als es darf.',
    },
    {
      id: 'p-spannungsfall',
      frage: 'Wie groß ist der Spannungsfall auf 28 m mit 6 mm² bei 25,2 A?',
      optionen: [
        { text: 'etwa 0,98 % – zulässig', korrekt: true, begruendung: 'ΔU% = 2·ρ·l·I/(A·U)·100' },
        { text: 'etwa 3,4 % – gerade noch zulässig', korrekt: false, begruendung: 'Der Faktor 2 (Hin- und Rückleiter) fehlt in dieser Rechnung nicht, hier stimmt die Größenordnung nicht.' },
        { text: 'etwa 5,1 % – unzulässig', korrekt: false, begruendung: 'Diese Höhe käme erst bei über 100 m Leitungslänge zustande.' },
      ],
      hintergrund:
        'Mit ρ = 0,018, l = 28 m, I = 25,2 A, A = 6 mm², U = 400 V: 0,98 %. ' +
        'Deutlich unter den üblichen 3–4 % Grenzwert – die Dimension passt ' +
        'auch vom Spannungsfall her.',
    },
    {
      id: 'p-rcd',
      frage: 'Welcher Fehlerstromschutz gehört in diesen Stromkreis?',
      optionen: [
        { text: '30 mA, Typ A', korrekt: true, begruendung: 'Steckdosen bis 32 A und Anlagen mit Elektronik → 30 mA, Typ A' },
        { text: '300 mA, nur Brandschutz', korrekt: false, begruendung: '300 mA schützt die Anlage, nicht den Menschen.' },
        { text: 'Keiner, es ist ein fester Anschluss', korrekt: false, begruendung: 'Auch feste Anschlüsse im Hausanschlussbereich gehören unter 30 mA, wenn Personen berühren können.' },
      ],
      hintergrund:
        'Die Wärmepumpe hat Elektronik (Umrichter) – pulsförmige Gleichanteile ' +
        'sind zu erwarten. Typ A ist Pflicht, 30 mA ist Personenschutz.',
    },
  ],
  ausfuehrung: [
    {
      id: 'a-freischalten',
      titel: 'Freischalten am Zählerschrank',
      inhalt:
        'Sicherung raus, Schild „Nicht einschalten“, Abschlosschloss, ' +
        'Spannungsfreiheit am Arbeitsplatz feststellen und dokumentieren.',
      regel: 'DGUV Vorschrift 3 – die fünf Sicherheitsregeln, vollständig',
      folgeBeiUeberspringen:
        'Ohne Freischaltung endet die Prüfung sofort mit „nicht bestanden“ – ' +
        'das ist die einzige automatische 0.',
    },
    {
      id: 'a-leitung',
      titel: 'Leitung verlegen und zurichten',
      inhalt:
        'NYM-J 5×6 mm² vom Zählerschrank zur Anlage, Bögen mit Radius ≥ 8×d, ' +
        'Zugentlastung, Aderfarben prüfen (PE grün-gelb unangetastet).',
      regel: 'VDE 0100-520 (Verlegeart C)',
      folgeBeiUeberspringen: 'Ohne Zugentlastung rutscht der Schutzleiter aus der Klemme – häufigster Punktabzug.',
    },
    {
      id: 'a-anschluss',
      titel: 'Gerät anschließen und beschriften',
      inhalt:
        'Drehstrom-L1/L2/L3, N, PE an der vorgesehenen Klemmleiste, ' +
        'Stromkreis im Schaltplan beschriften, Klemmenplan fort führen.',
      folgeBeiUeberspringen: 'Unbeschriftete Stromkreise sind in der Bewertung ein „nicht nachvollziehbar“ – Punkte weg.',
    },
    {
      id: 'a-pruefen',
      titel: 'Messen und Protokoll führen',
      inhalt:
        'Durchgang PE, Isolationswiderstand, Schleifenwiderstand, ' +
        'Auslösezeit, Spannungsfall – in dieser Reihenfolge, ins Protokoll.',
      regel: 'VDE 0100-600 – Reihenfolge der Wiederholungsprüfung',
      folgeBeiUeberspringen: 'Was nicht im Protokoll steht, existiert in der Bewertung nicht.',
    },
    {
      id: 'a-inbetrieb',
      titel: 'Inbetriebnahme und Funktionsprüfung',
      inhalt:
        'Einschalten unter Beobachtung, Drehfeld prüfen, Betriebswerte ' +
        'aufnehmen, Wärmepumpe eine Umlaufzeit laufen lassen.',
      folgeBeiUeberspringen: 'Ohne Funktionsprüfung ist die Anlage nicht abgenommen – Nacharbeit zählt als Fehler.',
    },
    {
      id: 'a-uebergabe',
      titel: 'Übergabe und Einweisung',
      inhalt:
        'Protokoll unterschreiben, Kundeneinweisung (Bedienung, ' +
        'Wiederholungsprüfung, Sicherungszuordnung), Anlage besenrein übergeben.',
      regel: 'PAL-IHK: Übergabe gehört zur Bewertung',
      folgeBeiUeberspringen: 'Die Übergabe trägt Punkte – wer sie weglässt, verschenkt sie.',
    },
  ],
  fachgespraech: [
    {
      frage: 'Warum haben Sie 6 mm² gewählt – und was würde eine größere Verlegeart ändern?',
      erwartetePunkte: [
        'I_B ≤ I_n ≤ I_z genannt (25,2 ≤ 32 ≤ 36)',
        'Verlegeart C als Bezug der I_z-Werte genannt',
        'Größerer Querschnitt: teurer, kein fachlicher Vorteil, Biegeradien im Klemmbereich',
      ],
    },
    {
      frage: 'Ihre Wärmepumpe hat einen Umrichter. Welches Problem kann das für den Fehlerstromschutzschalter bedeuten?',
      erwartetePunkte: [
        'Pulsförmige Gleichfehlerströme möglich',
        'Typ A statt Typ AC nötig, Begründung',
        'Blindwirkung/Vorlast des RCD erwähnt (max. Last am RCD)',
      ],
    },
    {
      frage: 'Welche Prüfungen gehören in Ihr Protokoll, und in welcher Reihenfolge führen Sie sie aus?',
      erwartetePunkte: [
        'Besichtigen, Erproben, Messen als Grundfolge nach VDE 0100-600',
        'Durchgang PE, Isolation, Schleifenwiderstand, RCD-Auslösung',
        'Spannungsfreiheit vor jeder Messung, die es verlangt',
      ],
    },
  ],
};

const SZENARIO_WALLBOX: AuftragsSzenario = {
  id: 'wallbox',
  titel: 'Kundenauftrag: Wallbox in der Garage',
  auftrag:
    'Garage am Haus, 11 kW Wallbox (3-phasig, 16 A, Typ 2). Leitungsweg ' +
    'Verteiler–Garage 22 m, unter Putz (Verlegeart A1). Zur Auswahl stehen ' +
    'NYM-J und NYY-J. Die Garage ist feucht (Fahrradstation, Wäsche). ' +
    'Bestehende Anlage: Schleifenwiderstand 1,1 Ω.',
  bestand: [
    'Verteiler mit Reserve, B 16 A für Hausstromkreis vorhanden',
    'Leitungsweg durch Kellermauer und Garagenwand, 22 m',
    'In der Garage: Feuchtigkeit, aber keine direkte Spritzwasser-zone',
  ],
  kundenAngaben: [
    'Das Fahrzeug lädt nachts über 6 Stunden mit voller Leistung',
    'Der Kunde will später eine zweite Wallbox daneben',
    'In der Garage stehen Kinderfahrräder – leichte Beschädigung möglich',
  ],
  planungsschritte: [
    {
      id: 'p-w-strom',
      frage: 'Welchen Strom zieht die Wallbox bei 11 kW (3-phasig)?',
      optionen: [
        { text: '16 A', korrekt: true, begruendung: 'I = P/(√3·U) = 11000/(1,732·400) ≈ 15,9 A' },
        { text: '27,5 A', korrekt: false, begruendung: 'Das wäre einphasig gerechnet – die Box nutzt alle drei Phasen.' },
        { text: '11 A', korrekt: false, begruendung: 'Das wäre P/U ohne cos φ und ohne √3.' },
      ],
      hintergrund:
        '11 kW auf drei Phasen sind pro Phase nur 16 A. Genau deshalb kann ' +
        'die Wallbox mit einem 16-A-Leitungsschutzschalter laufen.',
    },
    {
      id: 'p-typ',
      frage: 'Welches Leitungstyp gehört in die feuchte Garage?',
      optionen: [
        { text: 'NYY-J – auch für Feuchträume zugelassen', korrekt: true, begruendung: 'NYY-J darf außen und in Feuchträumen, NYM-J nur in trockenen Räumen.' },
        { text: 'NYM-J – Standard im Hausbau', korrekt: false, begruendung: 'NYM-J ist für Innenräume ohne Feuchtigkeit vorgesehen.' },
        { text: 'H05VV-F – flexibel und witterungsfest', korrekt: false, begruendung: 'Das ist eine flexible Anschlussleitung, keine Installation.' },
      ],
      hintergrund:
        'Feuchtraum → NYY-J. Die Frage fällt in jeder mündlichen Prüfung, ' +
        'weil sie genau den Unterschied zwischen „im Haus üblich“ und ' +
        '„hier zulässig“ prüft.',
    },
    {
      id: 'p-querschnitt-wb',
      frage: 'Welcher Querschnitt bei 22 m, Verlegeart A1, 16 A Betriebsstrom?',
      optionen: [
        { text: '2,5 mm² (I_z = 19,5 A) – reicht knapp', korrekt: false, begruendung: 'Zu knapp bemessen, und der Spannungsfall auf 22 m wäre grenzwertig.' },
        { text: '4 mm² (I_z = 25,5 A) – Dimension mit Reservetraum', korrekt: true, begruendung: '16 ≤ 20 ≤ 25,5 mit B 20 A, Spannungsfall bleibt unter 1 %.' },
        { text: '1,5 mm² reicht bei 16 A', korrekt: false, begruendung: 'I_z = 13,5 A < 16 A – das Kabel wird überlastet.' },
      ],
      hintergrund:
        'Der Drei-Satz entscheidet, nicht das Bauchgefühl: I_B (16) ≤ I_n (20) ' +
        '≤ I_z (25,5). 4 mm² erfüllt alle drei – 2,5 mm² scheitert an der ' +
        'Reserve und am Spannungsfall.',
    },
    {
      id: 'p-rcd-wb',
      frage: 'Welcher RCD-Typ bei einer Wallbox mit Umrichter?',
      optionen: [
        { text: 'Typ B – erfasst glatte Gleichfehlerströme', korrekt: true, begruendung: 'Ladegeräte können glatte DC-Fehlerströme erzeugen, die einen Typ A „blinden“.' },
        { text: 'Typ A reicht, es sind nur Wechselströme', korrekt: false, begruendung: 'Genau das ist die Falle: DC-Anteile machen Typ A unbemerkt unwirksam.' },
        { text: 'Kein RCD, die Box hat eine eigene Schutzelektronik', korrekt: false, begruendung: 'Die Elektronik der Box ersetzt keine installationseigene Schutzmaßnahme.' },
      ],
      hintergrund:
        'Wallbox → Typ B (oder Typ A mit zusätzlichem DC-Erkennungsmodul in ' +
        'der Box – das muss die Herstellerunterlage belegen). Diese Frage ist ' +
        'im Fachgespräch Standard.',
    },
  ],
  ausfuehrung: [
    {
      id: 'a-freischalten-wb',
      titel: 'Freischalten und sichern',
      inhalt: 'Wie überall: die fünf Regeln, dokumentiert, bevor die erste Ader bewegt wird.',
      regel: 'Fünf Sicherheitsregeln',
      folgeBeiUeberspringen: 'Sofortiges Ende der Prüfung.',
    },
    {
      id: 'a-montage-wb',
      titel: 'Wallbox montieren (Schutzbereich beachten)',
      inhalt:
        'Montagehöhe nach Hersteller (typisch 0,8–1,3 m), Schutzart bei ' +
        'Feuchte prüfen (mindestens IP44), Zugentlastung an der Box.',
      regel: 'VDE 0100-722 (Ladeeinrichtungen)',
      folgeBeiUeberspringen: 'Falsche Schutzart in Feuchtraum ist ein sicherer Punktabzug im Fachgespräch.',
    },
    {
      id: 'a-pruefen-wb',
      titel: 'Prüfen mit Protokoll (inkl. RCD-Typ)',
      inhalt:
        'Durchgang, Isolation, Schleifenwiderstand, RCD-Auslösung mit ' +
        'Gleichfehleranteil nach Herstellerangabe, Funktionsprüfung mit Fahrzeug.',
      regel: 'VDE 0100-600, -722',
      folgeBeiUeberspringen: 'Ohne RCD-Prüfung ist die Ladeeinrichtung nicht abgenommen.',
    },
    {
      id: 'a-uebergabe-wb',
      titel: 'Übergabe: Bedienung und Wiederholungsprüfung erklären',
      inhalt: 'Ladeplanung dem Kunden zeigen, Prüffrist nennen, Protokoll aushändigen.',
      folgeBeiUeberspringen: 'Unvollständige Übergabe kostet die Übergabe-Punkte.',
    },
  ],
  fachgespraech: [
    {
      frage: 'Warum NYY-J und nicht NYM-J – wo genau liegt der Unterschied?',
      erwartetePunkte: [
        'NYY-J für außen/Feuchtraum zugelassen, NYM-J nur trockene Innenräume',
        'Mantelaufbau (A-Mantel) als Unterschied genannt',
        'Bezug auf die feuchte Garage als Entscheidungsgrund',
      ],
    },
    {
      frage: 'Was passiert, wenn die Wallbox einen glatten Gleichfehlerstrom erzeugt und nur ein Typ-A-RCD verbaut wurde?',
      erwartetePunkte: [
        'Der RCD „verblindet“ – er löst bei echtem Fehler nicht mehr aus',
        'Typ B oder DC-Erkennungsmodul nach Herstellerunterlage',
        'Begründung über die Halbleiter im Ladekreis',
      ],
    },
    {
      frage: 'Der Kunde will später eine zweite Wallbox. Was planen Sie heute schon?',
      erwartetePunkte: [
        'Reserve im Verteiler und im Leitungskanal',
        'Lastmanagement als Alternative zu zweitem Zuleitungskreis',
        'Querschnitt/absicherung so wählen, dass Erweiterung ohne Neuverlegung geht',
      ],
    },
  ],
};

const SZENARIO_PV: AuftragsSzenario = {
  id: 'pv',
  titel: 'Kundenauftrag: PV-Wechselrichter anschließen',
  auftrag:
    'Auf dem Dach eines Einfamilienhauses läuft eine PV-Anlage (2 Stränge, ' +
    'je 8 Module, 440 Wp/Modul). Der Wechselrichter (10 kW, einphasig) ' +
    'wird im Keller angeschlossen. Leitungsweg 18 m, NYM-J 3×4 mm² ' +
    'vorgesehen. Netzanschluss nach VDE-AR-N 4105.',
  bestand: [
    'Zählerschrank mit Zählerplatz für Einspeisezähler',
    'Wechselrichter mit DC-Eingängen für 2 Stränge',
    'Dachleitungen bereits verlegt (2×6 mm² PV1-F)',
  ],
  kundenAngaben: [
    'Die Anlage soll später erweitert werden (Platz für 4 weitere Module)',
    'Der Zähler wird vom Netzbetreiber gestellt',
  ],
  planungsschritte: [
    {
      id: 'p-pv-strom',
      frage: 'Welchen Wechselrichter-Ausgangsstrom muss die AC-Leitung tragen?',
      optionen: [
        { text: 'etwa 43,5 A – einphasig bei 230 V', korrekt: true, begruendung: 'I = P/U = 10000/230' },
        { text: 'etwa 14,4 A – drehstrom gerechnet', korrekt: false, begruendung: 'Der Wechselrichter ist einphasig – √3 wäre hier falsch.' },
        { text: 'etwa 25 A – nur PV-Kennlinie', korrekt: false, begruendung: 'Das wäre der DC-Strom eines Strangs, nicht der AC-Ausgang.' },
      ],
      hintergrund:
        'Einphasiger 10-kW-Wechselrichter → 43,5 A auf der AC-Seite. Die ' +
        'Dimensionierung der AC-Leitung richtet sich nach diesem Wert, nicht ' +
        'nach den DC-Eingängen.',
    },
    {
      id: 'p-pv-leitung',
      frage: 'Ist NYM-J 3×4 mm² für 43,5 A ausreichend?',
      optionen: [
        { text: 'Nein – I_z = 25,5 A < 43,5 A, es braucht 10 mm² (I_z = 50 A)', korrekt: true, begruendung: 'Der Drei-Satz scheitert an der ersten Grenze.' },
        { text: 'Ja, 4 mm² trägt 25 A und der Wechselrichter regelt runter', korrekt: false, begruendung: 'Dauerhaft 43,5 A auf 4 mm² ist eine Überlast – das Kabel wird warm.' },
        { text: 'Ja, weil der Wechselrichter nur kurz Vollast läuft', korrekt: false, begruendung: 'PV läuft stundenlang am Limit – das ist Dauerbetrieb.' },
      ],
      hintergrund:
        '4 mm² in Verlegeart C trägt 25,5 A – weit unter den 43,5 A. Hier ' +
        'wird die engste Stelle der Prüfung gerissen: Wer nur die DC-Seite ' +
        'rechnet, verliert die Leitung.',
    },
    {
      id: 'p-pv-absicherung',
      frage: 'Welche Absicherung auf der AC-Seite?',
      optionen: [
        { text: 'B 50 A (I_B = 43,5 ≤ 50 ≤ 50)', korrekt: true, begruendung: 'Gerade noch erfüllt; in der Praxis nehmen Prüfer 63 A-Ableitung mit 10 mm².' },
        { text: 'B 32 A, wie im Haus üblich', korrekt: false, begruendung: '32 A < 43,5 A – der Wechselrichter würde ständig abschalten.' },
        { text: 'Keine, der Wechselrichter schaltet selbst ab', korrekt: false, begruendung: 'Die Anlagenelektronik ersetzt keine Leitungsabsicherung.' },
      ],
      hintergrund:
        'AC-seitig gilt der gleiche Drei-Satz. Dass hier 10 mm² plus 50 A ' +
        'realistischer ist, gehört zur Begründung im Fachgespräch.',
    },
    {
      id: 'p-pv-rcd',
      frage: 'Welcher RCD bei einem einphasigen PV-Wechselrichter mit Potentialfreisetzung?',
      optionen: [
        { text: '30 mA, Typ A – Herstellerfreigabe prüfen', korrekt: true, begruendung: 'Ohne galvanische Trennung kann der WR DC-Fehler erzeugen – Herstellerunterlage entscheidet.' },
        { text: 'Kein RCD, PV ist DC-seitig isoliert', korrekt: false, begruendung: 'Nur bei WR mit galvanischer Trennung; die steht in der Unterlage, nicht in der Annahme.' },
        { text: '300 mA Brandschutz reicht', korrekt: false, begruendung: 'Personenschutz bleibt Pflicht, 300 mA schützt nicht die Person.' },
      ],
      hintergrund:
        'Die Herstellerfreigabe ist der Schlüssel: Nur sie sagt, ob Typ A ' +
        'reicht oder Typ B nötig ist. Im Fachgespräch wird genau diese ' +
        'Begründung erwartet.',
    },
  ],
  ausfuehrung: [
    {
      id: 'a-freischalten-pv',
      titel: 'DC-seitig und AC-seitig freischalten',
      inhalt:
        'DC-Trenner am Wechselrichter öffnen, AC-Sicherung entfernen, ' +
        'beide Seiten auf Spannungsfreiheit prüfen – PV-Module liefern Licht!.',
      regel: 'Fünf Sicherheitsregeln, DC und AC getrennt',
      folgeBeiUeberspringen: 'PV-Stränge sind bei Tageslicht immer unter Spannung – sofortiges Ende der Prüfung.',
    },
    {
      id: 'a-dc-pv',
      titel: 'DC-Anschlüsse prüfen (Polung!)',
      inhalt:
        'Strangspannung und Polarität messen (± Toleranz des WR), ' +
        'Steckverbindungen auf Sitz prüfen, Biegeradius der PV1-F beachten.',
      folgeBeiUeberspringen: 'Verpolung beschädigt den Wechselrichter – teuerster Fehler des Tages.',
    },
    {
      id: 'a-ac-pv',
      titel: 'AC-Anschluss und Zählerfeld',
      inhalt:
        'Leitung dimensioniert verlegen, Einspeisezähler-Anschlussplan ' +
        'folgen, Kennzeichnung „Einspeisung“ am Zählerplatz.',
      regel: 'VDE-AR-N 4105',
      folgeBeiUeberspringen: 'Ohne Kennzeichnung ist die Anlage für den Netzbetreiber nicht abnehmbar.',
    },
    {
      id: 'a-protokoll-pv',
      titel: 'Protokoll und Inbetriebnahme',
      inhalt:
        'Isolationswiderstand DC-seitig (1000 V), AC-seitig (500 V), ' +
        'Funktionsprüfung, Netzspezifikation ins Protokoll, WR-Einstellungen dokumentieren.',
      folgeBeiUeberspringen: 'PV-Anlagen werden mit Protokoll abgenommen – ohne geht es nicht.',
    },
  ],
  fachgespraech: [
    {
      frage: 'Warum richtet sich die AC-Leitung nach 43,5 A und nicht nach dem DC-Strom der Stränge?',
      erwartetePunkte: [
        'AC-Ausgang ist die beanspruchte Seite des Wechselrichters',
        'Einphasig 10 kW → 43,5 A bei 230 V',
        'DC-seitig andere Schutzlogik (Strangtrenner, Verpolung)',
      ],
    },
    {
      frage: 'PV-Module liefern bei Tageslicht immer Spannung. Wie arbeiten Sie trotzdem sicher?',
      erwartetePunkte: [
        'DC-Trenner öffnen, Stranganschlussbox/Trennstecker nutzen',
        'Nie unter Last trennen, Lichtbogenrisiko genannt',
        'Spannungsfreiheit DC-seitig feststellen und dokumentieren',
      ],
    },
    {
      frage: 'Was prüfen Sie vor der Inbetriebnahme an den Wechselrichter-Einstellungen?',
      erwartetePunkte: [
        'Netzform/Landesparameter nach VDE-AR-N 4105',
        'Herstellerfreigabe für den RCD-Typ',
        'Überspannungsschutz-Konzept (DC/AC, Typ 1/2) erwähnt',
      ],
    },
  ],
};

export const SZENARIEN: AuftragsSzenario[] = [
  SZENARIO_WAERMEPUMPE,
  SZENARIO_WALLBOX,
  SZENARIO_PV,
];

export function holeSzenario(id: string): AuftragsSzenario | undefined {
  return SZENARIEN.find((s) => s.id === id);
}

// ---------------------------------------------------------------------------
// Planung prüfen
// ---------------------------------------------------------------------------

/** Ergebnis eines beantworteten Planungsschritts. */
export interface PlanungsAntwort {
  schrittId: string;
  optionIndex: number;
  korrekt: boolean;
}

/** Nimmt eine Planungsentscheidung und bewertet sie. */
export function bewertePlanung(
  szenario: AuftragsSzenario,
  antworten: Record<string, number>,
): { richtig: number; gesamt: number; quittung: PlanungsAntwort[] } {
  const quittung: PlanungsAntwort[] = [];
  let richtig = 0;
  for (const schritt of szenario.planungsschritte) {
    const index = antworten[schritt.id];
    if (index === undefined) continue;
    const option = schritt.optionen[index];
    if (!option) continue;
    if (option.korrekt) richtig += 1;
    quittung.push({ schrittId: schritt.id, optionIndex: index, korrekt: option.korrekt });
  }
  return { richtig, gesamt: szenario.planungsschritte.length, quittung };
}

// ---------------------------------------------------------------------------
// Ausführung prüfen
// ---------------------------------------------------------------------------

/**
 * Die Ausführung wird als geplante Reihenfolge geprüft: Der Nutzer wählt die
 * Schritte in der Reihenfolge, in der er sie ausführen würde. Sicherheits-
 * regeln zuerst – sonst fällt die Bewertung aus.
 */
export function bewerteReihenfolge(
  szenario: AuftragsSzenario,
  reihenfolge: string[],
): { korrekt: boolean; begruendung: string } {
  const erster = szenario.ausfuehrung.find((s) => s.id === reihenfolge[0]);
  if (!erster) {
    return { korrekt: false, begruendung: 'Kein Schritt gewählt.' };
  }
  if (!erster.id.startsWith('a-freischalten')) {
    return {
      korrekt: false,
      begruendung:
        'Der erste Schritt ist nicht das Freischalten. In der Prüfung endet ' +
        'jede Arbeit, die nicht mit den fünf Sicherheitsregeln beginnt, sofort.',
    };
  }
  // Alle Schritte in plausibler Reihenfolge? (Vereinfachung: Reihenfolge
  // wie im Modell ist zulässig; wer umsortiert, muss es begründen können.)
  const modellReihenfolge = szenario.ausfuehrung.map((s) => s.id);
  const gleichLang = reihenfolge.length === modellReihenfolge.length;
  if (!gleichLang) {
    const fehlen = modellReihenfolge.filter((id) => !reihenfolge.includes(id));
    const übersprungen = szenario.ausfuehrung.find((s) => s.id === fehlen[0]);
    return {
      korrekt: false,
      begruendung: übersprungen
        ? `Übersprungen: „${übersprungen.titel}“. ${übersprungen.folgeBeiUeberspringen}`
        : 'Die Reihenfolge ist unvollständig.',
    };
  }
  return {
    korrekt: true,
    begruendung:
      'Sicherheitsregeln zuerst, dann Aufbau, dann Prüfung, dann Übergabe – ' +
      'so würde die Reihenfolge in der Bewertung durchgehen.',
  };
}

// ---------------------------------------------------------------------------
// Machinegerechte Planungsrechnung
// ---------------------------------------------------------------------------

/**
 * Rechnet die Planung eines Szenarios maschinell nach. Jeder Wert kommt aus
 * der Engine – die Planungsantworten des Nutzers werden gegen echte Rechnung
 * gehalten, nicht gegen gemerkte Zahlen.
 */
export function szenarioRechnung(szenarioId: string): Record<string, RechenErgebnis> {
  const ergebnisse: Record<string, RechenErgebnis> = {};
  if (szenarioId === 'waermepumpe') {
    ergebnisse['p-strom'] = stromDrehstrom({ leistungW: 16000, uV: 400, cosPhi: 0.92 });
    ergebnisse['p-querschnitt'] = strombelastbarkeit({ querschnittMm2: 6, weg: 'referenz-iz' });
    ergebnisse['p-spannungsfall'] = spannungsfall({ laengeM: 28, stromA: 25.2, querschnittMm2: 6, u0: 400 });
  }
  if (szenarioId === 'wallbox') {
    ergebnisse['p-w-strom'] = stromDrehstrom({ leistungW: 11000, uV: 400, cosPhi: 1 });
    ergebnisse['p-querschnitt-wb'] = strombelastbarkeit({ querschnittMm2: 4, weg: 'referenz-iz' });
    ergebnisse['p-spannungsfall-wb'] = spannungsfall({ laengeM: 22, stromA: 16, querschnittMm2: 4, u0: 400 });
  }
  if (szenarioId === 'pv') {
    ergebnisse['p-pv-strom'] = stromEinphasig({ leistungW: 10000, uV: 230, cosPhi: 1 });
    ergebnisse['p-pv-leitung'] = strombelastbarkeit({ querschnittMm2: 4, weg: 'referenz-iz' });
    ergebnisse['p-pv-10mm'] = strombelastbarkeit({ querschnittMm2: 10, weg: 'referenz-iz' });
  }
  return ergebnisse;
}

/** Fakten-Hinweis für einen Szenario-Planungsschritt (für die Anzeige). */
export function quelleFuerSchritt(schrittId: string): string | null {
  const map: Record<string, string> = {
    'p-querschnitt': 'iz-tabelle-verlegeart-c',
    'p-querschnitt-wb': 'iz-tabelle-verlegeart-c',
    'p-pv-leitung': 'iz-tabelle-verlegeart-c',
    'p-pv-10mm': 'iz-tabelle-verlegeart-c',
    'p-rcd': 'idn-personenschutz',
    'p-rcd-wb': 'idn-personenschutz',
    'p-pv-rcd': 'idn-personenschutz',
    'p-absicherung': 'ls-kennlinie-b-magnetisch',
    'p-spannungsfall': 'rho-kupfer',
  };
  const id = map[schrittId];
  if (!id) return null;
  const f = holeFakt(id);
  return f ? `${f.bezeichnung} (${f.quelleId})` : null;
}
