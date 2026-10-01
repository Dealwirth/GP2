import type { Fact } from '../../../domain/types.ts';
import { z, t } from './hilfe.ts';

/**
 * Fachwissen der Elektro- und Gebäudetechnik.
 *
 * Das ist der Kern der Wissensbasis: Grenzwerte, Zuordnungen, Verfahren und
 * Regeln, die in der Gesellenprüfung Teil 2 abgefragt werden. Gegliedert nach
 * den vier Prüfungsbereichen und dem Grundlagenbereich aus Teil 1.
 *
 * Zwei Sorten Einträge:
 *  - `z(...)` trägt einen Zahlenwert. Daraus entstehen Rechen- und
 *    Wertabfrageaufgaben; die Engine kann mit dem Wert weiterrechnen.
 *  - `t(...)` trägt eine Aussage. Daraus entstehen Zuordnungs- und
 *    Verständnisaufgaben. Eine Aussage ohne Zahlenwert ist kein Mangel: Ein
 *    Großteil der Prüfung fragt genau das – Reihenfolge, Zuordnung, Grund.
 *
 * Jeder Eintrag nennt seine Quelle. Wer einen Wert am Original geprüft hat,
 * setzt `geprueft: true`; alles andere bleibt `offen` und wird in der App so
 * gekennzeichnet.
 */

export const FAKTEN_WISSEN_TECHNIK: Fact[] = [
  // =========================================================================
  // Schutz gegen elektrischen Schlag
  // =========================================================================
  t(
    'schutz-basisschutz',
    'Schutz',
    'Basisschutz (Schutz gegen direktes Berühren)',
    'vde0100_410',
    ['schutz', 'basisschutz', 'beruehrung'],
    {
      geprueft: true,
      bemerkung:
        'Schutz gegen direktes Berühren durch Isolierung der aktiven Teile, ' +
        'Abdeckungen, Umhüllungen, Hindernisse oder Abstand. Für Laien ist nur ' +
        'Isolierung, Abdeckung oder Umhüllung zulässig.',
    },
  ),
  t(
    'schutz-fehlerschutz',
    'Schutz',
    'Fehlerschutz (Schutz bei indirektem Berühren)',
    'vde0100_410',
    ['schutz', 'fehlerschutz', 'beruehrung'],
    {
      geprueft: true,
      bemerkung:
        'Schutz bei indirektem Berühren durch Schutzleiter und automatische ' +
        'Abschaltung, Schutzisolierung, Schutztrennung oder Schutzkleinspannung. ' +
        'Die Schutzmaßnahme heißt heute Schutz durch automatische Abschaltung ' +
        'der Stromversorgung.',
    },
  ),
  t(
    'schutz-zusatzschutz',
    'Schutz',
    'Zusatzschutz durch Fehlerstrom-Schutzeinrichtung',
    'vde0100_410',
    ['schutz', 'rcd', 'personenschutz'],
    {
      geprueft: true,
      bemerkung:
        'Zusätzlicher Schutz mit IΔn höchstens 30 mA an Steckdosen bis 32 A ' +
        'und für Leuchten in Wohnungen. Der Zusatzschutz ist eine zweite Ebene, ' +
        'er ersetzt weder Basisschutz noch Fehlerschutz.',
    },
  ),
  z(
    'abschaltzeit-5s',
    'Schutz',
    'Zulässige Abschaltzeit im TN-System bis 32 A',
    0.4,
    's',
    'vde0100_410',
    ['schutz', 'abschaltzeit', 'tn-system'],
    {
      geprueft: true,
      bemerkung:
        'Für Endstromkreise bis 32 A im TN-System gilt 0,4 s, für Verteilerstromkreise ' +
        '5 s. Im TT-System gilt für alle Stromkreise bis 32 A 0,2 s.',
    },
  ),
  z(
    'abschaltzeit-tt',
    'Schutz',
    'Zulässige Abschaltzeit im TT-System',
    0.2,
    's',
    'vde0100_410',
    ['schutz', 'abschaltzeit', 'tt-system'],
    {
      geprueft: true,
      bemerkung:
        'Im TT-System muss in 0,2 s abgeschaltet werden. Weil der Fehlerstrom ' +
        'dort über die Erde fließt, wird das in der Regel nur mit einer ' +
        'Fehlerstrom-Schutzeinrichtung erreicht.',
    },
  ),
  z(
    'beruehrungsspannung-grenze',
    'Schutz',
    'Grenzwert der Berührungsspannung (AC)',
    50,
    'V',
    'vde0100_410',
    ['schutz', 'beruehrungsspannung'],
    {
      geprueft: true,
      bemerkung:
        'Für Wechselspannung 50 V, für Gleichspannung 120 V. Darunter gilt die ' +
        'Berührung im Normalfall als ungefährlich; oberhalb sind Schutzmaßnahmen ' +
        'zwingend.',
    },
  ),
  z(
    'selv-grenze',
    'Schutz',
    'Grenzspannung SELV/PELV (Wechselspannung)',
    50,
    'V',
    'vde0100_410',
    ['selv', 'kleinspannung', 'schutz'],
    {
      geprueft: true,
      bemerkung:
        'SELV und PELV dürfen bei Wechselspannung höchstens 50 V führen, bei ' +
        'Gleichspannung höchstens 120 V. Im Badezimmerbereich 0 sind es 12 V AC.',
    },
  ),
  t(
    'schutzklassen',
    'Schutz',
    'Schutzklassen elektrischer Betriebsmittel',
    'vde0701',
    ['schutzklasse', 'geraet', 'pruefung'],
    {
      geprueft: true,
      bemerkung:
        'Klasse I: Schutzleiteranschluss und Basisschutz durch Isolierung. ' +
        'Klasse II: verstärkte oder doppelte Isolierung, kein Schutzleiter. ' +
        'Klasse III: Schutzkleinspannung, Betrieb nur an SELV/PELV.',
    },
  ),
  t(
    'isolation-verstaerkt',
    'Schutz',
    'Verstärkte Isolierung nach Schutzklasse II',
    'vde0701',
    ['schutzklasse', 'isolierung'],
    {
      bemerkung:
        'Betriebsmittel der Schutzklasse II tragen das Zeichen „doppeltes Quadrat". ' +
        'Ein Schutzleiteranschluss fehlt bewusst; ein nachträglich angeschlossener ' +
        'Schutzleiter wäre ein Fehler, kein Gewinn.',
    },
  ),

  // =========================================================================
  // Messen und Prüfen
  // =========================================================================
  z(
    'prueffrist-geraete',
    'Prüfung',
    'Empfohlene Prüffrist ortsveränderlicher Geräte auf Baustellen',
    3,
    'Monate',
    'dguv203072',
    ['pruefung', 'prueffrist', 'baustelle'],
    {
      bemerkung:
        'Auf Baustellen drei Monate, in Werkstätten sechs Monate, in Büros ' +
        'zwölf bis vierundzwanzig Monate. Die Frist folgt aus einer Gefährdungs- ' +
        'beurteilung, nicht aus einer Tabelle allein.',
    },
  ),
  z(
    'prueffrist-anlage-4j',
    'Prüfung',
    'Empfohlene Prüffrist ortsfester elektrischer Anlagen',
    4,
    'Jahre',
    'dguv203072',
    ['pruefung', 'prueffrist', 'anlage'],
    {
      bemerkung:
        'Ortsfeste Anlagen werden in der Regel alle vier Jahre geprüft, ' +
        'sicherheitsrelevante Anlagen wie Sicherheitsbeleuchtung jährlich. ' +
        'Maßgeblich ist auch hier die Gefährdungsbeurteilung.',
    },
  ),
  t(
    'erstpruefung-reihenfolge',
    'Prüfung',
    'Reihenfolge der Erstprüfung nach DIN VDE 0100-600',
    'vde0100_600',
    ['pruefung', 'erstpruefung', 'reihenfolge'],
    {
      geprueft: true,
      bemerkung:
        'Erst Besichtigen, dann Erproben, dann Messen. Gemessen wird in dieser ' +
        'Reihenfolge: Schutzleiterwiderstand, Isolationswiderstand, ' +
        'Schleifenwiderstand, Auslöseprüfung der RCD, Funktionsprüfung.',
    },
  ),
  t(
    'durchgang-pruefung',
    'Prüfung',
    'Durchgangsprüfung bei spannungsfreier Anlage',
    'vde0100_600',
    ['pruefung', 'durchgang', 'messung'],
    {
      bemerkung:
        'Der Durchgang wird bei spannungsfreier Anlage mit dem Niederohm-Messbereich ' +
        'geprüft. Ein Wert nahe null bedeutet Durchgang, ein hoher oder unendlicher ' +
        'Wert eine Unterbrechung. Geprüft werden Leitungen, Klemmen und Schutzkontakte.',
    },
  ),
  t(
    'rcd-ausloesepruefung',
    'Prüfung',
    'Auslöseprüfung der Fehlerstrom-Schutzeinrichtung',
    'vde0100_600',
    ['pruefung', 'rcd', 'messung'],
    {
      geprueft: true,
      bemerkung:
        'Geprüft wird mit dem Prüfgerät am eingebauten Zustand: Auslösung bei ' +
        'IΔn innerhalb der zulässigen Zeit, Nichtauslösung bei 0,5 · IΔn. Die ' +
        'Prüftaste am Gerät ersetzt diese Messung nicht.',
    },
  ),
  t(
    'isolationsmessung-verfahren',
    'Prüfung',
    'Isolationswiderstand messen – Vorbereitung',
    'vde0100_600',
    ['pruefung', 'isolation', 'messung'],
    {
      bemerkung:
        'Vor der Messung die Anlage freischalten, gegen Wiedereinschalten sichern, ' +
        'Spannungsfreiheit feststellen. Verbraucher und elektronische Betriebsmittel ' +
        'abklemmen, sonst verfälschen sie das Ergebnis oder nehmen Schaden.',
    },
  ),
  z(
    'messfehler-toleranz',
    'Prüfung',
    'Zulässige Abweichung eines Prüfgeräts der Klasse 2,5',
    2.5,
    '%',
    'vde0100_600',
    ['messung', 'messunsicherheit', 'pruefgeraet'],
    {
      bemerkung:
        'Ein Messgerät der Genauigkeitsklasse 2,5 darf vom Bezugswert um höchstens ' +
        '2,5 % abweichen, bezogen auf den Skalenendwert. Für Prüfungen nach ' +
        'DIN VDE 0100-600 sind Geräte mit mindestens dieser Klasse zulässig.',
    },
  ),
  t(
    'messgeraet-kategorien',
    'Prüfung',
    'Messkategorien CAT II, CAT III, CAT IV',
    'vde0105_100',
    ['messung', 'pruefgeraet', 'sicherheit'],
    {
      bemerkung:
        'CAT II: Messung an Geräten am Steckdosenstromkreis. CAT III: Messung in ' +
        'der Verteilung und an festen Installationen. CAT IV: Messung am ' +
        'Netzanschluss und an Freileitungen. Die Kategorie beschreibt die ' +
        'Überspannungsfestigkeit, nicht den Messbereich.',
    },
  ),
  t(
    'spannungsfreiheit-feststellen',
    'Sicherheit',
    'Spannungsfreiheit feststellen – Prüfmittel',
    'vde0105_100',
    ['sicherheit', 'spannungsfreiheit', 'pruefung'],
    {
      geprueft: true,
      bemerkung:
        'Spannungsfreiheit wird mit einem zweipoligen Spannungsprüfer festgestellt, ' +
        'nicht mit dem Duspol allein gegen Erde und nicht mit dem Multimeter. ' +
        'Vor und nach der Prüfung wird der Spannungsprüfer auf Funktion getestet.',
    },
  ),
  t(
    'fuenf-sicherheitsregeln',
    'Sicherheit',
    'Die fünf Sicherheitsregeln',
    'dguv3',
    ['sicherheit', 'freischalten', 'regeln'],
    {
      geprueft: true,
      bemerkung:
        '1. Freischalten. 2. Gegen Wiedereinschalten sichern. 3. Spannungsfreiheit ' +
        'feststellen. 4. Erden und Kurzschließen. 5. Benachbarte, unter Spannung ' +
        'stehende Teile abdecken oder abschranken. Die Reihenfolge ist bindend.',
    },
  ),
  t(
    'fehlersuche-verfahren',
    'Fehlersuche',
    'Systematische Fehlersuche – Vorgehen',
    'vde0105_100',
    ['fehlersuche', 'diagnose', 'verfahren'],
    {
      bemerkung:
        'Vom Fehlerbild über die Eingrenzung zur Ursache und zur Beseitigung. ' +
        'Zuerst wird die halbe Anlage ausgeschlossen, dann halbiert man den Rest. ' +
        'Bauteiletausch auf Verdacht ist kein Verfahren und verdeckt den Fehler.',
    },
  ),
  t(
    'fehlerbild-kurzschluss',
    'Fehlersuche',
    'Kurzschluss und Erdschluss unterscheiden',
    'vde0105_100',
    ['fehlersuche', 'kurzschluss', 'erdschluss'],
    {
      bemerkung:
        'Kurzschluss: leitende Verbindung zwischen zwei Außenleitern oder ' +
        'Außenleiter und N. Erdschluss: Verbindung eines aktiven Teils mit Erde ' +
        'oder Schutzleiter. Der Kurzschluss löst den Leitungsschutzschalter ' +
        'magnetisch aus, der Erdschluss die Fehlerstrom-Schutzeinrichtung.',
    },
  ),
  t(
    'signalverfolgung',
    'Fehlersuche',
    'Signalverfolgung in der Anlage',
    'vde0105_100',
    ['fehlersuche', 'signal', 'messung'],
    {
      bemerkung:
        'Beim Verfolgen eines Signals wird vom Speisepunkt zum Verbraucher gemessen ' +
        'und an jedem Knoten geprüft, ob das Signal noch anliegt. Der erste Punkt ' +
        'ohne Signal liegt hinter der Unterbrechung.',
    },
  ),

  // =========================================================================
  // Leitungen und Verlegung
  // =========================================================================
  t(
    'leitung-bezeichnung',
    'Leitung',
    'Bezeichnung von Leitungen und Kabeln (Aderzahl, Querschnitt, Typ)',
    'vde0298_4',
    ['leitung', 'bezeichnung', 'typ'],
    {
      geprueft: true,
      bemerkung:
        'NYM-J 3x1,5: Mantelleitung, PVC-isoliert, mit Schutzleiter, drei Adern, ' +
        '1,5 mm². NYY-J: Erdkabel mit PVC-Mantel. H07V-U: eindrähtige Aderleitung, ' +
        'H07V-K: feindrähtig, H07V-R: mehrdrähtig.',
    },
  ),
  t(
    'verlegearten-uebersicht',
    'Leitung',
    'Verlegearten A bis F – Zuordnung',
    'vde0298_4',
    ['leitung', 'verlegeart', 'strombelastbarkeit'],
    {
      geprueft: true,
      bemerkung:
        'A1/A2: in wärmegedämmter Wand. B1/B2: in Rohr oder Kanal in bzw. auf der Wand. ' +
        'C: direkt an der Wand, Kabel auf Wand oder Pritsche. D: im Erdreich. ' +
        'E: in Wasser. F: mehradrige Kabel frei in Luft. Je besser die Wärme ' +
        'abgeführt wird, desto höher der zulässige Strom.',
    },
  ),
  t(
    'leitungsdimensionierung-reihenfolge',
    'Leitung',
    'Reihenfolge der Leitungsdimensionierung',
    'vde0100_430',
    ['leitung', 'dimensionierung', 'schutz'],
    {
      bemerkung:
        'Erst den Betriebsstrom ermitteln, dann den Querschnitt über die ' +
        'Strombelastbarkeit wählen, dann den Spannungsfall prüfen, dann die ' +
        'Absicherung festlegen. Die Abschaltbedingung wird zuletzt nachgewiesen.',
    },
  ),
  t(
    'absicherungsregel-drei',
    'Leitung',
    'Zusammenwirken von Belastbarkeit, Absicherung und Betriebsstrom',
    'vde0100_430',
    ['leitung', 'absicherung', 'strombelastbarkeit'],
    {
      geprueft: true,
      bemerkung:
        'Es muss gelten I_b kleiner gleich I_n kleiner gleich I_z, und außerdem ' +
        '1,45 · I_z größer gleich I_n. I_b ist der Betriebsstrom, I_n der ' +
        'Bemessungsstrom der Schutzeinrichtung, I_z die Strombelastbarkeit der Leitung.',
    },
  ),
  t(
    'kabeltragsysteme',
    'Leitung',
    'Kabeltragsysteme und ihre Verwendung',
    'vde0100_520',
    ['leitung', 'trasse', 'befestigung'],
    {
      bemerkung:
        'Kabelrinnen für Kabelbündel, Kabelleitern für große Lasten, ' +
        'Installationsrohre für Leitungen in der Wand, Kabelkanäle für sichtbare ' +
        'Verlegung. Metallene Trassen sind zu erden und über Trennstellen ' +
        'durchgängig leitend zu verbinden.',
    },
  ),
  t(
    'biegeradius',
    'Leitung',
    'Mindestbiegeradius von Kabeln und Leitungen',
    'vde0298_4',
    ['leitung', 'biegeradius', 'verlegung'],
    {
      bemerkung:
        'Als Richtwert gilt das Vierfache des Außendurchmessers bei fest verlegten ' +
        'Leitungen, das Acht- bis Zehnfache bei Kabeln und mehr bei feindrähtigen ' +
        'Adern. Ein zu enger Radius beschädigt die Isolierung dauerhaft.',
    },
  ),
  t(
    'aderfarben',
    'Leitung',
    'Aderfarben in der Niederspannungsinstallation',
    'vde0100_510',
    ['leitung', 'aderfarbe', 'kennzeichnung'],
    {
      geprueft: true,
      bemerkung:
        'Außenleiter L1 braun oder schwarz, L2 schwarz, L3 grau. Neutralleiter N ' +
        'blau. Schutzleiter PE grün-gelb. Grün-gelb darf ausschließlich für den ' +
        'Schutzleiter verwendet werden.',
    },
  ),
  t(
    'klemmen-und-aderendhuelsen',
    'Leitung',
    'Aderendhülsen und Klemmen',
    'vde0100_520',
    ['leitung', 'klemme', 'aderendhuelse'],
    {
      bemerkung:
        'Feindrähtige Adern erhalten Aderendhülsen, bevor sie in eine Schraub- oder ' +
        'Federzugklemme geführt werden. Ohne Hülse spreizen sich die Einzeldrähte, ' +
        'der Kontakt wird warm und die Klemmstelle brennt aus.',
    },
  ),
  t(
    'schirmung-emv',
    'EMV',
    'Schirmung und EMV-gerechte Verlegung',
    'vde0100_444',
    ['emv', 'schirmung', 'verlegung'],
    {
      bemerkung:
        'Signalleitungen werden getrennt von Leistungsleitungen geführt. ' +
        'Schirme werden einseitig am Bezugspotential aufgelegt, um Ausgleichsströme ' +
        'zu vermeiden. Kreuzungen erfolgen möglichst im rechten Winkel.',
    },
  ),

  // =========================================================================
  // Verteiler, Schaltgeräte, Absicherung
  // =========================================================================
  t(
    'ls-ausloeseverhalten',
    'Schaltgerät',
    'Auslöseverhalten des Leitungsschutzschalters',
    'vde0100_530',
    ['ls', 'kennlinie', 'absicherung'],
    {
      geprueft: true,
      bemerkung:
        'Thermisch löst er bei dauerhafter Überlast aus: bei 1,13 · I_n nie, ' +
        'bei 1,45 · I_n innerhalb einer Stunde. Magnetisch löst er bei Kurzschluss ' +
        'aus. Der Leitungsschutzschalter schützt die Leitung, nicht den Verbraucher.',
    },
  ),
  t(
    'kennlinien-zuordnung',
    'Schaltgerät',
    'Wahl der Kennlinie B, C oder D',
    'vde0100_530',
    ['ls', 'kennlinie', 'auswahl'],
    {
      geprueft: true,
      bemerkung:
        'B für Beleuchtung und Steckdosen mit geringem Einschaltstrom, ' +
        'C für Motoren und Verbraucher mit mäßigem Anlaufstrom, ' +
        'D für Transformatoren und Verbraucher mit hohem Einschaltstrom. ' +
        'Der magnetische Bereich ist B 3 bis 5 · I_n, C 5 bis 10 · I_n, D 10 bis 20 · I_n.',
    },
  ),
  t(
    'rcd-typen',
    'Schaltgerät',
    'Typen der Fehlerstrom-Schutzeinrichtung',
    'vde0100_530',
    ['rcd', 'typ', 'personenschutz'],
    {
      geprueft: true,
      bemerkung:
        'Typ AC erfasst nur Wechselstromfehler. Typ A erfasst zusätzlich ' +
        'pulsierende Gleichfehler und ist heute Standard. Typ B erfasst auch ' +
        'glatte Gleichfehler, etwa bei Frequenzumrichtern und Ladeinfrastruktur. ' +
        'Typ F deckt Mischfälle mit Frequenzen bis 1 kHz ab.',
    },
  ),
  t(
    'rcd-selektivitaet',
    'Schaltgerät',
    'Selektivität zwischen Fehlerstrom-Schutzeinrichtungen',
    'vde0100_530',
    ['rcd', 'selektivitaet', 'schutz'],
    {
      bemerkung:
        'Vorgeschaltet wird ein selektiver Typ S mit kurzer Verzögerung, ' +
        'nachgeschaltet der unverzögerte Typ mit kleinerem IΔn. So löst nur die ' +
        'betroffene Ebene aus und der Rest der Anlage bleibt in Betrieb.',
    },
  ),
  t(
    'sls-aufgabe',
    'Schaltgerät',
    'Aufgabe des selektiven Leitungsschutzschalters (SLS)',
    'taevo',
    ['sls', 'absicherung', 'zaehler'],
    {
      bemerkung:
        'Der SLS sitzt vor dem Zähler und schützt die Zuleitung und den Zählerplatz. ' +
        'Er ist selektiv zum Leitungsschutzschalter im Verteiler und wird vom ' +
        'Netzbetreiber verlangt. Üblich sind 35 A oder 63 A.',
    },
  ),
  z(
    'sls-standard',
    'Schaltgerät',
    'Üblicher Bemessungsstrom eines SLS im Haushalt',
    35,
    'A',
    'taevo',
    ['sls', 'absicherung'],
    {
      bemerkung:
        'Für Hausanschlüsse bis 63 A ist 35 A üblich, bei größeren Anlagen 50 A ' +
        'oder 63 A. Der SLS ist kein Ersatz für den Leitungsschutzschalter ' +
        'im Verteiler.',
    },
  ),
  t(
    'verteiler-aufbau',
    'Schaltgerät',
    'Aufbau eines Zählerschranks',
    'taevo',
    ['verteiler', 'zaehler', 'aufbau'],
    {
      bemerkung:
        'Von oben nach unten: Hauptleitungsklemme, SLS oder Hauptschalter, Zähler, ' +
        'darunter die Verteilerfelder mit Leitungsschutzschaltern und ' +
        'Fehlerstrom-Schutzeinrichtungen. Der Raum darüber bleibt für die ' +
        'Netzseite reserviert.',
    },
  ),
  t(
    'phasenschienen',
    'Schaltgerät',
    'Phasenschienen im Verteiler',
    'din_en_61439',
    ['verteiler', 'phasenschiene', 'klemme'],
    {
      bemerkung:
        'Phasenschienen verbinden mehrere Leitungsschutzschalter auf einer Phase. ' +
        'Sie müssen zum Bemessungsstrom der Schalter passen; eine zu schwache ' +
        'Schiene wird warm und ist eine häufige Brandursache.',
    },
  ),
  z(
    'schutzart-verteiler',
    'Schaltgerät',
    'Mindestschutzart eines Verteilers im Innenbereich',
    2,
    'IP-Code (erste Kennziffer)',
    'din_en_61439',
    ['verteiler', 'schutzart', 'ip'],
    {
      bemerkung:
        'Im trockenen Innenbereich genügt IP 2X (Fingerschutz). In Garagen, ' +
        'Werkstätten und Feuchträumen mindestens IP 44, im Freien IP 54 oder höher.',
    },
  ),

  // =========================================================================
  // Teil 1: Grundlagen
  // =========================================================================
  z(
    'ohm-formel',
    'Grundlagen',
    'Ohmsches Gesetz',
    0,
    'Formel',
    'schultabelle',
    ['grundlagen', 'formel', 'widerstand'],
    {
      formel: 'U = R · I',
      bemerkung:
        'Spannung gleich Widerstand mal Strom. Umgestellt: R = U / I und I = U / R. ' +
        'Gilt für Gleichstrom und für Augenblickswerte des Wechselstroms.',
      relevanz: ['Berufsschule'],
    },
  ),
  z(
    'leistung-gleichstrom',
    'Grundlagen',
    'Elektrische Leistung bei Gleichstrom',
    0,
    'Formel',
    'schultabelle',
    ['grundlagen', 'formel', 'leistung'],
    {
      formel: 'P = U · I',
      bemerkung:
        'Leistung gleich Spannung mal Strom. Mit dem Ohmschen Gesetz ergeben sich ' +
        'P = I² · R und P = U² / R. Die Einheit ist das Watt.',
      relevanz: ['Berufsschule'],
    },
  ),
  z(
    'arbeit-formel',
    'Grundlagen',
    'Elektrische Arbeit',
    0,
    'Formel',
    'schultabelle',
    ['grundlagen', 'formel', 'arbeit'],
    {
      formel: 'W = P · t',
      bemerkung:
        'Arbeit gleich Leistung mal Zeit. 1 kWh = 3,6 MJ. Die Arbeit ist die ' +
        'Grundlage der Stromabrechnung, nicht die Leistung.',
      relevanz: ['Berufsschule'],
    },
  ),
  z(
    'cosphi-bedeutung',
    'Grundlagen',
    'Leistungsfaktor cos φ',
    0,
    'Formel',
    'schultabelle',
    ['grundlagen', 'leistungsfaktor', 'drehstrom'],
    {
      formel: 'P = S · cos φ',
      bemerkung:
        'Der Leistungsfaktor ist der Quotient aus Wirkleistung und Scheinleistung. ' +
        'Ein Motor mit cos φ = 0,85 nimmt bei gleicher Wirkleistung mehr Strom auf ' +
        'als ein ohmscher Verbraucher mit cos φ = 1.',
      relevanz: ['Berufsschule'],
    },
  ),
  z(
    'drehstrom-verketttung',
    'Grundlagen',
    'Verkettungsfaktor im Drehstromnetz',
    1.732,
    'Faktor',
    'schultabelle',
    ['grundlagen', 'drehstrom', 'formel'],
    {
      formel: 'U = √3 · U_Strang',
      bemerkung:
        'Der Verkettungsfaktor beträgt rund 1,732. Aus 230 V Strangspannung werden ' +
        '400 V Außenleiterspannung. Die Scheinleistung im Drehstromnetz ist ' +
        'S = √3 · U · I.',
      relevanz: ['Berufsschule'],
    },
  ),
  t(
    'reihe-parallel',
    'Grundlagen',
    'Reihen- und Parallelschaltung von Widerständen',
    'schultabelle',
    ['grundlagen', 'widerstand', 'schaltung'],
    {
      bemerkung:
        'In Reihe addieren sich die Widerstände, der Strom ist überall gleich. ' +
        'Parallel addieren sich die Leitwerte, die Spannung ist überall gleich. ' +
        'Der Ersatzwiderstand parallel ist stets kleiner als der kleinste Einzelwiderstand.',
      relevanz: ['Berufsschule'],
    },
  ),
  t(
    'wechselstrom-scheitelwert',
    'Grundlagen',
    'Scheitelwert und Effektivwert im Wechselstrom',
    'schultabelle',
    ['grundlagen', 'wechselstrom', 'effektivwert'],
    {
      bemerkung:
        'Der Scheitelwert ist √2 mal der Effektivwert, also 1,414 · U_eff. Die ' +
        'Netzspannung von 230 V ist ein Effektivwert; der Scheitelwert beträgt ' +
        'rund 325 V. Frequenz der öffentlichen Versorgung: 50 Hz.',
      relevanz: ['Berufsschule'],
    },
  ),
  z(
    'netzfrequenz',
    'Grundlagen',
    'Frequenz der öffentlichen Stromversorgung',
    50,
    'Hz',
    'vde0100',
    ['grundlagen', 'frequenz'],
    {
      bemerkung:
        '50 Hz in Europa, 60 Hz in Nordamerika. Bahnstrom wird mit 16,7 Hz betrieben. ' +
        'Die Frequenz ist ein Maß für die Stabilität des Netzes.',
    },
  ),
  t(
    'drehstrom-nullleiterstrom',
    'Grundlagen',
    'Strom im Neutralleiter bei Drehstrom',
    'schultabelle',
    ['grundlagen', 'drehstrom', 'neutralleiter'],
    {
      bemerkung:
        'Bei symmetrischer Belastung heben sich die Ströme der drei Außenleiter auf, ' +
        'der Neutralleiter führt keinen Strom. Bei unsymmetrischer Belastung oder ' +
        'Oberschwingungen fließt ein Ausgleichsstrom im Neutralleiter.',
      relevanz: ['Berufsschule'],
    },
  ),
  t(
    'betriebsmittel-arten',
    'Grundlagen',
    'Betriebsmittel und ihr Verhalten',
    'schultabelle',
    ['grundlagen', 'betriebsmittel'],
    {
      bemerkung:
        'Ohmsche Betriebsmittel setzen elektrische Energie in Wärme um, cos φ = 1. ' +
        'Induktive wie Motoren und Drosseln bauen ein Magnetfeld auf, cos φ kleiner 1. ' +
        'Kapazitive wie Kompensationskondensatoren wirken dem entgegen.',
      relevanz: ['Berufsschule'],
    },
  ),
  t(
    'blindstrom-kompensation',
    'Grundlagen',
    'Blindstromkompensation',
    'schultabelle',
    ['grundlagen', 'blindstrom', 'kompensation'],
    {
      bemerkung:
        'Kondensatoren nehmen kapazitiven Blindstrom auf und heben den ' +
        'Leistungsfaktor wieder in Richtung 1. Das entlastet die Zuleitungen und ' +
        'senkt die Blindstromkosten. Überkompensation ist zu vermeiden.',
      relevanz: ['Berufsschule'],
    },
  ),
  z(
    'kupfer-leitfaehigkeit',
    'Grundlagen',
    'Elektrische Leitfähigkeit von Kupfer',
    56,
    'm/(Ω·mm²)',
    'vde0298_4',
    ['grundlagen', 'kupfer', 'leitfaehigkeit'],
    {
      bemerkung:
        'Kupfer hat κ = 56 m/(Ω·mm²), Aluminium κ = 35 m/(Ω·mm²). Der ' +
        'Widerstandsbelag ist der Kehrwert: Kupfer 0,0175 Ω·mm²/m, ' +
        'Aluminium 0,028 Ω·mm²/m.',
    },
  ),
];
