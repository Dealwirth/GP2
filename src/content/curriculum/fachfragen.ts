import type { ExamArea } from '../../domain/types.ts';

/**
 * Fachwissen – geprüfter Fragenbestand für Systementwurf,
 * Funktions- und Systemanalyse und Kundenauftrag.
 *
 * Diese Fragen haben keinen Zahlenwert. Sie ersetzen die Faktenaufgaben dort,
 * wo die Prüfung Verständnis, Zuordnung und Vorgehensweise prüft – also genau
 * dort, wo ein Normwert nicht weiterhilft.
 *
 * Jede Frage nennt ihre Verweisstelle: das Kapitel des Ausbildungsrahmenplans,
 * aus dem sie stammt. Der Prüfungsbezug ist damit nachvollziehbar, statt dass
 * ein Lernprogramm seine eigenen Schwerpunkte setzt.
 *
 * Regeln für diesen Bestand:
 *   1. Keine frei erfundenen Zahlen. Wo eine Zahl nötig ist, steht sie in der
 *      Faktenbasis und wird von dort bezogen.
 *   2. Jede falsche Option ist aus einem echten Irrtum der Praxis gebildet –
 *      nicht zufällig vertauscht.
 *   3. Was regional oder jahrgangsabhängig ist, wird als solches benannt.
 */

export interface FachFrage {
  id: string;
  bereich: ExamArea;
  frage: string;
  richtig: string;
  falsch: [string, string];
  begruendung: string;
  erklaerung: string;
  topicIds: string[];
  /** Verweis auf die Berufsbildposition bzw. das Lernfeld. */
  verweis: string;
}

export const FACHFRAGEN: FachFrage[] = [
  // -------------------------------------------------------------------------
  // Systementwurf
  // -------------------------------------------------------------------------
  {
    id: 'f-sw-01',
    bereich: 'systementwurf',
    frage: 'Was ist der erste Schritt bei der Problemanalyse für einen Systementwurf?',
    richtig:
      'Ausgangslage und Ziel des Kunden klären – Lasten, Randbedingungen, Betriebszeiten und vorhandene Anlagenteile erfassen',
    falsch: [
      'Sofort ein geeignetes Produkt auswählen und danach rechnen',
      'Den Stromlaufplan zeichnen und die Baustelle danach beurteilen',
    ],
    begruendung:
      'Ohne geklärte Anforderungen ist jede Auswahl eine Vermutung. Die Prüfung ' +
      'bewertet die Reihenfolge: erst verstehen, dann entwerfen, dann auswählen.',
    erklaerung: 'Erst Anforderungen klären, dann Lösungsvarianten, dann Auswahl.',
    topicIds: ['sys-analyse-01', 'sys-analyse-02'],
    verweis: 'Berufsbildposition 1 – Konzipieren energie- und gebäudetechnischer Anlagen',
  },
  {
    id: 'f-sw-02',
    bereich: 'systementwurf',
    frage: 'Wann ist eine Redundanz in einer gebäudetechnischen Anlage sinnvoll?',
    richtig:
      'Wenn Ausfall kritisch ist und der zusätzliche Aufwand vertretbar bleibt – etwa bei sicherheitsrelevanten oder wirtschaftlich hohen Anlagen',
    falsch: [
      'Immer, unabhängig vom Zweck der Anlage',
      'Nie, weil Redundanz in der Elektrotechnik unzulässig ist',
    ],
    begruendung:
      'Redundanz erhöht Verfügbarkeit und Kosten. Sie ist eine bewusste Abwägung, ' +
      'die im Entwurf begründet werden muss.',
    erklaerung: 'Redundanz ist eine Abwägung zwischen Ausfallrisiko und Aufwand.',
    topicIds: ['sys-varianten-01', 'sys-analyse-03'],
    verweis: 'Berufsbildposition 1 – Konzipieren energie- und gebäudetechnischer Anlagen',
  },
  {
    id: 'f-sw-03',
    bereich: 'systementwurf',
    frage: 'Was ist bei der Anlagenspezifikation ausdrücklich anzugeben?',
    richtig:
      'Anforderungen, technische Kennwerte, Schnittstellen, Schutzmaßnahmen und die geforderte Dokumentation',
    falsch: [
      'Nur die Produktbezeichnung des Herstellers',
      'Nur der Preis der Komponenten',
    ],
    begruendung:
      'Eine Spezifikation ist die Aufgabenstellung an die Ausführung. Ohne ' +
      'Schnittstellen und Schutzangaben ist sie nicht prüfbar.',
    erklaerung: 'Spezifikation = Anforderungen, Kennwerte, Schnittstellen, Schutz, Dokumentation.',
    topicIds: ['sys-spezifikation-01', 'sys-spezifikation-02'],
    verweis: 'Berufsbildposition 1 – Konzipieren energie- und gebäudetechnischer Anlagen',
  },
  {
    id: 'f-sw-04',
    bereich: 'systementwurf',
    frage: 'Welche Angaben braucht die Auswahl eines Leitungsschutzschalters mindestens?',
    richtig:
      'Bemessungsstrom des Stromkreises, Kennlinie, Strombelastbarkeit der Leitung und Verlegeart',
    falsch: [
      'Nur die Leistung des Verbrauchers in Watt',
      'Nur die Länge der Leitung',
    ],
    begruendung:
      'Der Leitungsschutzschalter muss den Leiter thermisch und magnetisch ' +
      'schützen und den Bemessungsstrom des Kreises nicht überschreiten.',
    erklaerung: 'LS-Auswahl: In nach Bemessungsstrom, Leitung nach I_z, passende Kennlinie.',
    topicIds: ['sys-spezifikation-03', 'sys-schutz-03'],
    verweis: 'Berufsbildposition 1 – Konzipieren energie- und gebäudetechnischer Anlagen',
  },
  {
    id: 'f-sw-05',
    bereich: 'systementwurf',
    frage: 'Was verlangt die Norm für Räume besonderer Art, etwa Badezimmer oder Sauna?',
    richtig:
      'Einen Fehlerstromschutz mit 30 mA und eine angepasste Schutzart der Betriebsmittel',
    falsch: [
      'Nur eine höhere Absicherung des Stromkreises',
      'Eine Verringerung der Nennspannung auf 24 V',
    ],
    begruendung:
      'Feuchtigkeit und Berührung erhöhen das Risiko. Beides wird über ' +
      'Fehlerstromschutz und Schutzart beherrscht, nicht über Absicherung.',
    erklaerung: 'Räume besonderer Art: 30 mA und passende Schutzart (IP), nicht Absicherung.',
    topicIds: ['sys-schutz-04', 'sys-schutz-05'],
    verweis: 'Berufsbildposition 1 – Konzipieren energie- und gebäudetechnischer Anlagen',
  },
  {
    id: 'f-sw-06',
    bereich: 'systementwurf',
    frage: 'Was bedeutet Datenschutz bei der Gebäudeautomation konkret?',
    richtig:
      'Personenbezogene Daten wie Nutzungs- und Anwesenheitsprofile zweckgebunden erheben, schützen und nach Wegfall des Zwecks löschen',
    falsch: [
      'Alle Daten anonymisieren und dauerhaft speichern',
      'Datenschutz ist in der Gebäudeautomation nicht geregelt',
    ],
    begruendung:
      'Raumnutzung, Belegung und Verbrauch sind personenbezogene Daten. Es gelten ' +
      'Zweckbindung, Datenminimierung und Löschfristen.',
    erklaerung: 'Gebäudeautomation: Zweckbindung, Datenminimierung, Löschfristen.',
    topicIds: ['sys-nachhaltigkeit-05'],
    verweis: 'Berufsbildposition 1 – Konzipieren energie- und gebäudetechnischer Anlagen',
  },
  {
    id: 'f-sw-07',
    bereich: 'systementwurf',
    frage: 'Was ist beim Kabeltrasse und bei der Elektromagnetischen Verträglichkeit zu beachten?',
    richtig:
      'Leitungen mit großen Lastströmen und empfindliche Leitungen getrennt führen und Erdung sowie Abschirmung sinnvoll nutzen',
    falsch: [
      'Alle Leitungen gebündelt verlegen, das spart Platz und Kupfer',
      'Abschirmung ist bei Niederspannung nicht erforderlich',
    ],
    begruendung:
      'Starkstromleitungen erzeugen Störfelder. Trennung, Abstand und Abschirmung ' +
      'schützen empfindliche Leitungen und Anlagen.',
    erklaerung: 'EMV: Laststromleitungen von empfindlichen Leitungen trennen, abschirmen, erden.',
    topicIds: ['sys-schutz-06'],
    verweis: 'Berufsbildposition 1 – Konzipieren energie- und gebäudetechnischer Anlagen',
  },
  {
    id: 'f-sw-08',
    bereich: 'systementwurf',
    frage: 'Wie begründet man die Auswahl einer Komponente gegenüber dem Kunden?',
    richtig:
      'Mit Anforderungen, Kennwerten, Kosten und Wartbarkeit – nicht mit Markenname oder Preis allein',
    falsch: [
      'Mit dem Argument, das Gerät sei das teuerste und deshalb das beste',
      'Gar nicht, die Auswahl ist eine reine Handwerksentscheidung ohne Erläuterung',
    ],
    begruendung:
      'Die Begründung gehört zur Dokumentation. Sie macht die Entscheidung ' +
      'nachvollziehbar und ist Teil der fachtechnischen Bewertung.',
    erklaerung: 'Komponentenauswahl wird begründet: Anforderung, Kennwert, Kosten, Wartbarkeit.',
    topicIds: ['sys-varianten-02', 'sys-spezifikation-02'],
    verweis: 'Berufsbildposition 1 – Konzipieren energie- und gebäudetechnischer Anlagen',
  },
  {
    id: 'f-sw-09',
    bereich: 'systementwurf',
    frage: 'Was ist bei der Wirtschaftlichkeitsbetrachtung einer Anlage zu beachten?',
    richtig:
      'Investitionskosten, laufende Kosten, Wartung und Nutzungsdauer gemeinsam betrachten – nicht nur der Anschaffungspreis',
    falsch: [
      'Nur den Anschaffungspreis vergleichen',
      'Nur die Leistungsaufnahme vergleichen',
    ],
    begruendung:
      'Die günstigste Anschaffung ist nicht die wirtschaftlichste Lösung. Amortisation ' +
      'und Wartungskosten entscheiden.',
    erklaerung: 'Wirtschaftlichkeit = Investition + laufende Kosten + Wartung + Nutzungsdauer.',
    topicIds: ['sys-wirtschaft-01', 'sys-nachhaltigkeit-01'],
    verweis: 'Berufsbildposition 1 – Konzipieren energie- und gebäudetechnischer Anlagen',
  },
  {
    id: 'f-sw-10',
    bereich: 'systementwurf',
    frage: 'Welche Unterlagen gehören zur Anlagendokumentation?',
    richtig:
      'Stromlaufplan, Klemmenplan, Apparateskizze, Betriebsanleitung, Prüfprotokolle und Angaben zur Softwareversion',
    falsch: [
      'Nur der Stromlaufplan',
      'Nur das Prüfprotokoll der Erstprüfung',
    ],
    begruendung:
      'Ohne vollständige Unterlagen ist die Anlage später nicht wartbar. ' +
      'Bei Gebäudeautomation kommt die Softwareversion hinzu, sonst ist die ' +
      'Wiederherstellung unmöglich.',
    erklaerung: 'Dokumentation: Stromlauf-, Klemmenplan, Skizze, Anleitung, Protokolle, Softwareversion.',
    topicIds: ['sys-dokumentation-01', 'sys-dokumentation-02', 'sys-dokumentation-03'],
    verweis: 'Berufsbildposition 1 – Konzipieren energie- und gebäudetechnischer Anlagen',
  },
  {
    id: 'f-sw-11',
    bereich: 'systementwurf',
    frage: 'Wodurch unterscheidet sich ein BUS-System von einer konventionellen Sternverdrahtung?',
    richtig:
      'Beim BUS teilen sich alle Teilnehmer eine gemeinsame Leitung; Informationen werden adressiert übertragen, nicht über eigene Leitungen je Funktion',
    falsch: [
      'Der BUS benötigt für jede Funktion eine eigene Leitung wie die Sternverdrahtung',
      'Der BUS ist ausschließlich eine Sicherheitsschaltung',
    ],
    begruendung:
      'Beim BUS sinkt der Verdrahtungsaufwand mit der Zahl der Funktionen. Das ist ' +
      'der Grund für seinen Einsatz in der Gebäudetechnik.',
    erklaerung: 'BUS: eine gemeinsame Leitung, adressierte Übertragung – weniger Verdrahtung.',
    topicIds: ['sys-analyse-04', 'sys-spezifikation-05'],
    verweis: 'Berufsbildposition 1 – Konzipieren energie- und gebäudetechnischer Anlagen',
  },
  {
    id: 'f-sw-12',
    bereich: 'systementwurf',
    frage: 'Welche Rolle spielt der energetische Fachmann bei der Energieeffizienz?',
    richtig:
      'Er bewertet Verbrauch, Verluste und Betriebszeiten, wählt Betriebsmittel mit hohem Wirkungsgrad und macht die Einsparung messbar',
    falsch: [
      'Er ersetzt die Energieberatung durch eine einmalige Geräteauswahl',
      'Er berechnet ausschließlich den Leitungsquerschnitt',
    ],
    begruendung:
      'Effizienz entsteht aus Geräteauswahl, Steuerung, Betrieb und Nachweis – ' +
      'nicht aus dem Kauf eines Geräts.',
    erklaerung: 'Energieeffizienz: Wirkungsgrad, Steuerung, Betriebszeiten und Messung.',
    topicIds: ['sys-nachhaltigkeit-02', 'sys-nachhaltigkeit-03'],
    verweis: 'Berufsbildposition 1 – Konzipieren energie- und gebäudetechnischer Anlagen',
  },

  // -------------------------------------------------------------------------
  // Funktions- und Systemanalyse
  // -------------------------------------------------------------------------
  {
    id: 'f-fa-01',
    bereich: 'funktionsanalyse',
    frage: 'Womit beginnt die Funktionsanalyse einer Anlage?',
    richtig:
      'Mit der Auswertung der vorhandenen Unterlagen – Stromlaufplan, Klemmenplan und Betriebsanleitung',
    falsch: [
      'Mit dem Austausch des ältesten Bauteils',
      'Mit einem-general Prüfung aller Funktionen, bevor man die Unterlagen liest',
    ],
    begruendung:
      'Die Unterlagen zeigen die Soll-Funktion. Erst danach lässt sich der ' +
      'Ist-Zustand sinnvoll bewerten.',
    erklaerung: 'Erst Unterlagen auswerten, dann Ist-Funktion prüfen.',
    topicIds: ['fsa-dokumentation-01', 'fsa-dokumentation-02'],
    verweis: 'Berufsbildposition 6 – Funktions- und Systemanalyse',
  },
  {
    id: 'f-fa-02',
    bereich: 'funktionsanalyse',
    frage: 'Wie grenzt man einen Fehler in einer Anlage systematisch ein?',
    richtig:
      'Durch Aufteilen in Abschnitte und gezielte Messung an festgelegten Punkten, nicht durch blindes Tauschen von Bauteilen',
    falsch: [
      'Durch Austausch aller Bauteile im Verdachtsbereich',
      'Durch Neustart der Anlage und Warten auf Besserung',
    ],
    begruendung:
      'Systematisches Eingrenzen schont die Anlage, dokumentiert den Fehler und ' +
      'ist das, was in der Prüfung bewertet wird.',
    erklaerung: 'Fehlersuche: Anlage teilen, Messpunkt setzen, messen, dokumentieren.',
    topicIds: ['fsa-fehlersuche-01', 'fsa-fehlersuche-02'],
    verweis: 'Berufsbildposition 6 – Funktions- und Systemanalyse',
  },
  {
    id: 'f-fa-03',
    bereich: 'funktionsanalyse',
    frage: 'Ein Stromkreis fällt sporadisch aus. Was ist die wahrscheinlichste Ursache?',
    richtig:
      'Eine mechanische oder thermische Unterbrechung, die nur in bestimmter Stellung oder Erwärmung auftritt – etwa eine lose Klemme',
    falsch: [
      'Der Leitungsschutzschalter ist zu groß dimensioniert',
      'Die Nennspannung ist zu hoch',
    ],
    begruendung:
      'Ein sporadischer Ausfall spricht für einen beweglichen oder ' +
      'temperaturabhängigen Fehler. Ein zu großer LS würde nicht sporadisch auslösen.',
    erklaerung: 'Sporadisch = beweglich oder thermisch. Lose Klemmen zuerst prüfen.',
    topicIds: ['fsa-fehlersuche-03', 'fsa-fehlersuche-04'],
    verweis: 'Berufsbildposition 6 – Funktions- und Systemanalyse',
  },
  {
    id: 'f-fa-04',
    bereich: 'funktionsanalyse',
    frage: 'Was bedeutet ein negatives Ergebnis bei der Durchgangsprüfung des Schutzleiters?',
    richtig:
      'Der Schutzleiter ist unterbrochen oder hat zu hohen Übergangswiderstand – der Personenschutz ist nicht wirksam',
    falsch: [
      'Der Verbraucher ist zu klein dimensioniert',
      'Die Anlage ist zu gut geerdet',
    ],
    begruendung:
      'Der Schutzleiter muss den Fehlerstrom ableiten. Ohne ihn findet der ' +
      'Fehlerstromschutz keinen Weg zum Abschalten.',
    erklaerung: 'PE-Durchgang negativ = Schutzleiter wirkt nicht. Personenschutz nicht gegeben.',
    topicIds: ['fsa-schutzbewertung-01', 'fsa-verfahren-01', 'fsa-fehlersuche-03'],
    verweis: 'Berufsbildposition 6 – Funktions- und Systemanalyse',
  },
  {
    id: 'f-fa-05',
    bereich: 'funktionsanalyse',
    frage: 'Womit unterscheidet sich die Abschaltbedingung von der Auslösezeit?',
    richtig:
      'Die Abschaltbedingung prüft den Widerstandswert (R_A ≤ U₀ / I_Δn), die Auslösezeit prüft, wie schnell der Schalter reagiert',
    falsch: [
      'Beides ist die dieselbe Größe unter anderem Namen',
      'Die Auslösezeit wird nur am Leitungsschutzschalter gemessen',
    ],
    begruendung:
      'Zwei verschiedene Prüfungen mit zwei verschiedenen Messgeräten. Beide ' +
      'gehören ins Prüfprotokoll.',
    erklaerung: 'Abschaltbedingung = Widerstand. Auslösezeit = Zeit. Zwei Prüfungen.',
    topicIds: ['fsa-schutzbewertung-02', 'fsa-verfahren-01'],
    verweis: 'Berufsbildposition 6 – Funktions- und Systemanalyse',
  },
  {
    id: 'f-fa-06',
    bereich: 'funktionsanalyse',
    frage: 'Welches Messgerät gehört zur Isolationsmessung?',
    richtig: 'Ein Isolationsmessgerät mit etwa 500 V Gleichspannung',
    falsch: [
      'Ein Durchgangsprüfer',
      'Ein Stromzangenmessgerät',
    ],
    begruendung:
      'Die Durchgangsprüfung misst niederohmig, die Isolationsmessung hochohmig. ' +
      'Ein falsches Gerät liefert kein verwertbares Ergebnis.',
    erklaerung: 'Isolationsmessung = Isolationsmessgerät mit Prüfspannung, nicht der Durchgangsprüfer.',
    topicIds: ['fsa-verfahren-02', 'fsa-verfahren-01'],
    verweis: 'Berufsbildposition 6 – Funktions- und Systemanalyse',
  },
  {
    id: 'f-fa-07',
    bereich: 'funktionsanalyse',
    frage: 'Wie ordnet man ein Signal an einer Schnittstelle zu?',
    richtig:
      'Über die Funktion: Eingang, Ausgang, Zustand oder Meldung – und über die logische Ebene, auf der es übertragen wird',
    falsch: [
      'Nur über die Farbe der Ader',
      'Nur über die Nummer der Klemme im Verteiler',
    ],
    begruendung:
      'Die Zuordnung muss aus der Dokumentation und der Funktion abgeleitet ' +
      'werden. Farbe und Klemmnummer sind Hinweise, keine Zuordnung.',
    erklaerung: 'Signalzuordnung: Funktion und Logikebene – nicht Farbe oder Klemmnummer.',
    topicIds: ['fsa-schnittstellen-01', 'fsa-schnittstellen-02', 'fsa-fehlersuche-07'],
    verweis: 'Berufsbildposition 6 – Funktions- und Systemanalyse',
  },
  {
    id: 'f-fa-08',
    bereich: 'funktionsanalyse',
    frage: 'Was ist bei der Wiederholungsprüfung gegenüber der Erstprüfung anders?',
    richtig:
      'Sie wird in festgelegten Abständen wiederholt, um den unveränderten sicheren Zustand zu bestätigen – nicht um den Zustand zu verbessern',
    falsch: [
      'Sie ersetzt die Erstprüfung vollständig',
      'Sie wird nur nach einem Schadensfall durchgeführt',
    ],
    begruendung:
      'Die Wiederholungsprüfung ist der Nachweis, dass der sichere Zustand ' +
      'weiterhin besteht. Sie ist planmäßig, nicht anlassbezogen.',
    erklaerung: 'Wiederholungsprüfung: planmäßiger Nachweis, dass der Zustand sicher bleibt.',
    topicIds: ['fsa-schutzbewertung-04', 'fsa-dokumentation-02'],
    verweis: 'Berufsbildposition 6 – Funktions- und Systemanalyse',
  },
  {
    id: 'f-fa-09',
    bereich: 'funktionsanalyse',
    frage: 'Wie wirkt sich ein zu hoher Spannungsfall auf eine Anlage aus?',
    richtig:
      'Betriebsmittel erhalten zu wenig Spannung, gehen in Störung oder schalten nicht mehr zuverlässig',
    falsch: [
      'Der Spannungsfall wirkt sich nur auf die Stromrechnung aus',
      'Ein zu hoher Spannungsfall schützt zusätzlich vor Überlastung',
    ],
    begruendung:
      'Der Spannungsfall ist ein Wirkungsgradproblem der Leitung. Es zeigt sich ' +
      'an den Verbrauchern – und ist zugleich ein Hinweis auf zu geringen Querschnitt.',
    erklaerung: 'Zu hoher Spannungsfall: Verbraucher bekommt zu wenig – Hinweis auf Leiterquerschnitt.',
    topicIds: ['fsa-verfahren-04', 'fsa-verfahren-05'],
    verweis: 'Berufsbildposition 6 – Funktions- und Systemanalyse',
  },
  {
    id: 'f-fa-10',
    bereich: 'funktionsanalyse',
    frage: 'Was ist bei einem Programmfehler in einer Anlage zu dokumentieren?',
    richtig:
      'Fehlerbild, Fehlerursache, geänderte Parameter oder Zeilen, sowie die anschließende Funktionsprüfung',
    falsch: [
      'Nur, dass die Anlage wieder läuft',
      'Nichts, Programmänderungen werden nicht dokumentiert',
    ],
    begruendung:
      'Ohne dokumentierte Änderung ist die Anlage später nicht mehr im ' +
      'ursprünglichen Zustand reproduzierbar.',
    erklaerung: 'Programmänderung dokumentieren: Fehlerbild, Ursache, Änderung, Gegenprüfung.',
    topicIds: ['fsa-programme-01', 'fsa-programme-02'],
    verweis: 'Berufsbildposition 6 – Funktions- und Systemanalyse',
  },
  {
    id: 'f-fa-11',
    bereich: 'funktionsanalyse',
    frage: 'Welche Rolle spielt die Messunsicherheit bei der Prüfung?',
    richtig:
      'Sie entscheidet, ob ein Messwert innerhalb oder außerhalb eines Grenzwerts liegt – deshalb gehört sie ins Protokoll',
    falsch: [
      'Sie ist unerheblich, Messwerte sind immer exakt',
      'Sie wird erst im Streitfall relevant und gehört daher nicht ins Protokoll',
    ],
    begruendung:
      'Nahe am Grenzwert entscheidet die Unsicherheit über das Ergebnis. Ohne ' +
      'Angabe ist die Bewertung nicht nachvollziehbar.',
    erklaerung: 'Nahe am Grenzwert entscheidet die Messunsicherheit – deshalb protokollieren.',
    topicIds: ['fsa-verfahren-06', 'fsa-verfahren-05', 'fsa-dokumentation-05'],
    verweis: 'Berufsbildposition 6 – Funktions- und Systemanalyse',
  },
  {
    id: 'f-fa-12',
    bereich: 'funktionsanalyse',
    frage: 'Woran erkennst du, dass eine Diagnoseanzeige den Fehler richtig eingrenzt?',
    richtig:
      'Daran, dass der gemeldete Kreis oder Busteil nach einer gezielten Prüfung tatsächlich die Fehlerstelle ist',
    falsch: [
      'Daran, dass überhaupt eine Meldung erscheint',
      'Daran, dass die Anzeige bei jedem Fehler denselben Text zeigt',
    ],
    begruendung:
      'Eine Diagnose ist ein Hinweis, kein Befund. Sie muss durch Messung oder ' +
      'Sichtprüfung bestätigt werden.',
    erklaerung: 'Diagnoseanzeige ist ein Hinweis – bestätigen, nicht übernehmen.',
    topicIds: ['fsa-fehlersuche-05', 'fsa-schnittstellen-05', 'fsa-verfahren-03'],
    verweis: 'Berufsbildposition 6 – Funktions- und Systemanalyse',
  },

  // -------------------------------------------------------------------------
  // Kundenauftrag
  // -------------------------------------------------------------------------
  {
    id: 'f-ka-01',
    bereich: 'kundenauftrag',
    frage: 'Was gehört zu Beginn in den Fragenkatalog an den Kunden?',
    richtig:
      'Lasten, Betriebszeiten, gewünschte Funktion, bauliche Randbedingungen und was mit der vorhandenen Anlage geschehen soll',
    falsch: [
      'Nur die gewünschte Farbe der Leitungen',
      'Nur das Budget für die Materialien',
    ],
    begruendung:
      'Der Fragenkatalog ist die Grundlage der Planung. Was nicht erfragt wird, ' +
      'wird später falsch angenommen.',
    erklaerung: 'Fragenkatalog: Last, Betriebszeit, Funktion, Randbedingungen, Bestand.',
    topicIds: ['ka-auftraege-01', 'ka-auftraege-02'],
    verweis: 'Berufsbildposition 2 – Auftragsanalyse und Kundenkommunikation',
  },
  {
    id: 'f-ka-02',
    bereich: 'kundenauftrag',
    frage: 'Wofür wird der Klemmenplan in der Praxis gebraucht?',
    richtig:
      'Um bei Service und Erweiterung nachvollziehen zu können, welche Ader woher und wohin führt',
    falsch: [
      'Um die Abrechnung nach zu berechnen',
      'Um die Absicherung festzulegen',
    ],
    begruendung:
      'Der Klemmenplan ist das Werkzeug für den nächsten Techniker. Ohne ihn ' +
      'wird jede Erweiterung zur Vermutung.',
    erklaerung: 'Klemmenplan: Anschlussnachweis für Wartung und Erweiterung.',
    topicIds: ['ka-plaene-01', 'ka-verteilung-09'],
    verweis: 'Berufsbildposition 4 – Installations- und Verdrahtungspläne',
  },
  {
    id: 'f-ka-03',
    bereich: 'kundenauftrag',
    frage: 'Welche Reihenfolge gilt beim Errichten eines Verteilers?',
    richtig:
      'Verteiler einbauen, Haupt- und Fehlerstromschutzeinrichtung setzen, dann Stromkreise aufbauen und beschriften',
    falsch: [
      'Erst alle Verbraucher anschließen und dann die Schutzeinrichtungen setzen',
      'Erst verdrahten und danach die Absicherung festlegen',
    ],
    begruendung:
      'Die Reihenfolge folgt dem Aufbau der Anlage. Sie macht den ' +
      'Stromlaufplan nachvollziehbar und verhindert Verwechslungen.',
    erklaerung: 'Verteiler: Einbau → Schutzeinrichtung → Stromkreise → Beschriftung.',
    topicIds: ['ka-verteilung-01', 'ka-verteilung-07'],
    verweis: 'Berufsbildposition 3 – Aufstellen elektrischer Geräte und Anlagen',
  },
  {
    id: 'f-ka-04',
    bereich: 'kundenauftrag',
    frage: 'Was ist vor dem Betreten eines Arbeitsbereichs mit elektrischen Anlagen zwingend?',
    richtig:
      'Anlage spannungsfrei schalten, gegen Wiedereinschalten sichern und die Spannungsfreiheit feststellen',
    falsch: [
      'Ein Warnschild aufstellen',
      'Den Hauptkennschalter umlegen – das genügt als Spannungsfreiheit',
    ],
    begruendung:
      'Erst die Spannungsfreiheit feststellen erlaubt das Arbeiten. Abschalten ' +
      'allein genügt nicht – Rückschalten muss unmöglich sein.',
    erklaerung: 'Fünf Schritte: freischalten, gegen Wiedereinschalten sichern, spannungsfrei feststellen, erden, absperren.',
    topicIds: ['ka-sicherheit-02', 'ka-sicherheit-01'],
    verweis: 'Berufsbildposition 11 – Arbeitsschutz und Sicherheit',
  },
  {
    id: 'f-ka-05',
    bereich: 'kundenauftrag',
    frage: 'Wie erkennst du, ob ein Stromkreis überlastet ist?',
    richtig:
      'Der Laststrom liegt über der Absicherung oder über der magnetischen Auslösegrenze der Kennlinie',
    falsch: [
      'Der Stromkreis ist überlastet, wenn der Leiter warm wird',
      'Ein Stromkreis ist nie überlastet, solange der Leitungsschutzschalter hält',
    ],
    begruendung:
      'Überlastung zeigt sich am Verhältnis von Laststrom zu Absicherung und ' +
      'Kennlinie – noch bevor es zum Auslösen kommt.',
    erklaerung: 'Überlastung: Laststrom gegen In und magnetischen Auslösepunkt der Kennlinie.',
    topicIds: ['ka-verteilung-03', 'ka-verteilung-04'],
    verweis: 'Berufsbildposition 3 – Aufstellen elektrischer Geräte und Anlagen',
  },
  {
    id: 'f-ka-06',
    bereich: 'kundenauftrag',
    frage: 'Was gehört in die Übergabe an den Kunden?',
    richtig:
      'Erklärung der Bedienung, Übergabe der Dokumentation, Besichtigung gemeinsam und Protokoll der Übergabe',
    falsch: [
      'Ein Schlüssel und der Hinweis, alles sei fertig',
      'Nur die Rechnung',
    ],
    begruendung:
      'Die Übergabe ist der Abschluss der Arbeit. Sie umfasst Einweisung, ' +
      'Unterlagen und ein gemeinsames Protokoll.',
    erklaerung: 'Übergabe: Einweisung, Unterlagen, gemeinsame Besichtigung, Protokoll.',
    topicIds: ['ka-inbetriebnahme-08', 'ka-inbetriebnahme-09', 'ka-dokumentation-02'],
    verweis: 'Berufsbildposition 8 – Instandhaltung und Abnahme',
  },
  {
    id: 'f-ka-07',
    bereich: 'kundenauftrag',
    frage: 'Wie ist mit Restmaterial auf der Baustelle umzugehen?',
    richtig:
      'Getrennt lagern, ordentlich beschriften und dem Kunden übergeben oder fachgerecht entsorgen',
    falsch: [
      'Im Verteiler oder auf dem Boden liegen lassen',
      'Ungefragt mitnehmen, wenn es gebraucht wird',
    ],
    begruendung:
      'Material auf der Baustelle ist Eigentum des Betriebs. Der Kunde muss ' +
      'darüber entscheiden können, nicht die Baustelle.',
    erklaerung: 'Restmaterial: beschriften, lagern, übergeben – nicht liegen lassen.',
    topicIds: ['ka-planung-06', 'ka-planung-07'],
    verweis: 'Berufsbildposition 2 – Planung und Termin',
  },
  {
    id: 'f-ka-08',
    bereich: 'kundenauftrag',
    frage: 'Was ist bei der Auswahl der Verlegeart für eine Leitung entscheidend?',
    richtig:
      'Die Verlegeart bestimmt die zulässige Strombelastbarkeit des Leiters',
    falsch: [
      'Die Verlegeart ist reine Geschmackssache',
      'Die Verlegeart wirkt sich nur auf das Aussehen der Anlage aus',
    ],
    begruendung:
      'Gleicher Leiter, andere Verlegeart, andere Belastbarkeit. Deshalb gehört ' +
      'die Verlegeart in die Berechnung und in die Dokumentation.',
    erklaerung: 'Verlegeart bestimmt I_z. Ohne sie ist die Leiterdimensionierung unvollständig.',
    topicIds: ['ka-verlegung-04', 'ka-verteilung-04'],
    verweis: 'Berufsbildposition 3 – Aufstellen elektrischer Geräte und Anlagen',
  },
  {
    id: 'f-ka-09',
    bereich: 'kundenauftrag',
    frage: 'Wie verhältst du dich, wenn der Kunde eine Änderung während der Arbeit fordert?',
    richtig:
      'Auswirkung auf Aufwand, Termin und Sicherheit klären, Änderung dokumentieren und erst nach Freigabe umsetzen',
    falsch: [
      'Sofort umsetzen, der Kunde zahlt ja',
      'Die Änderung ignorieren, der Termin ist wichtiger',
    ],
    begruendung:
      'Nachträge sind im Kundenauftrag normal. Sie gehören dokumentiert, sonst ' +
      'entstehen später Streit und Fehler in der Ausführung.',
    erklaerung: 'Nachtrag: Auswirkung klären, dokumentieren, freigeben lassen, dann umsetzen.',
    topicIds: ['ka-auftraege-05', 'ka-dokumentation-01'],
    verweis: 'Berufsbildposition 2 – Auftragsanalyse und Kundenkommunikation',
  },
  {
    id: 'f-ka-10',
    bereich: 'kundenauftrag',
    frage: 'Was ist beim Anschluss einer Wallbox in einem Verbraucherkreis zu beachten?',
    richtig:
      'Anforderungen an Typ und Absicherung, Leiterbelastung, Abschaltmöglichkeit und die Rückwirkungen auf den Gesamtstromkreis prüfen',
    falsch: [
      'Nur Stecker und Leitung nach Länge wählen',
      'Die Wallbox über eine Leitung des Lichtstromkreises versorgen, um Leitungen zu sparen',
    ],
    begruendung:
      'Eine Wallbox gehört in einen eigenen, passend abgesicherten Stromkreis. Die ' +
      'Rückwirkungen auf den Bestand sind zu prüfen.',
    erklaerung: 'Wallbox: eigener Stromkreis, Typ, Absicherung, Abschaltmöglichkeit, Rückwirkung prüfen.',
    topicIds: ['ka-gebaeudetechnik-08', 'ka-gebaeudetechnik-09'],
    verweis: 'Berufsbildposition 7 – Gebäudetechnik',
  },
  {
    id: 'f-ka-11',
    bereich: 'kundenauftrag',
    frage: 'Wofür stehen die beiden Teile der DIN VDE 0701-0702?',
    richtig:
      '0701 für die Prüfung nach Instandsetzung oder Änderung, 0702 für die Wiederholungsprüfung im Betrieb',
    falsch: [
      '0701 für ortsfeste Anlagen, 0702 für ortsveränderliche Geräte',
      '0701 für die Erstprüfung, 0702 für die Abnahme durch den Netzbetreiber',
    ],
    begruendung:
      '0701 und 0702 haben denselben Messumfang, aber einen anderen Anlass: 0701 ' +
      'nach einer Änderung oder Reparatur, 0702 als planmäßige Wiederholungsprüfung. ' +
      'Die Prüfung der ortsfesten Anlage dagegen steht in DIN VDE 0100-600.',
    erklaerung: '0701 = nach Instandsetzung/Änderung, 0702 = Wiederholungsprüfung.',
    topicIds: ['ka-pruefung-01', 'ka-pruefung-08'],
    verweis: 'Berufsbildposition 7 – Prüfen von Geräten und Betriebsmitteln',
  },

  // -------------------------------------------------------------------------
  // Teil 1 – zählt mit 30 % ins Gesamtergebnis, auch wenn es nicht mehr
  // Gegenstand von Teil 2 ist.
  // -------------------------------------------------------------------------
  {
    id: 'f-t1-01',
    bereich: 'teil1',
    frage: 'Wie berechnet sich die Wirkleistung bei einphasigem Wechselstrom?',
    richtig: 'P = U · I · cos φ',
    falsch: ['P = U · I', 'P = U · I · sin φ'],
    begruendung:
      'U · I ist die Scheinleistung. Die Wirkleistung entsteht erst durch den ' +
      'Leistungsfaktor cos φ. Ohne ihn rechnet man zu groß.',
    erklaerung: 'Scheinkraft S = U · I, Wirkleistung P = U · I · cos φ.',
    topicIds: ['t1-anlagen-01', 't1-anlagen-04'],
    verweis: 'Prüfungsbereich Teil 1 – Elektrotechnische Anlagen und Betriebsmittel',
  },
  {
    id: 'f-t1-02',
    bereich: 'teil1',
    frage: 'Welche Spannung ergibt sich bei Drehstrom aus 230 V gegen den Nullleiter?',
    richtig:
      'Die verkettete Spannung zwischen zwei Außenleitern beträgt das √3-Fache, also rund 400 V',
    falsch: [
      'Genau 230 V, weil alle drei Leiter dieselbe Spannung haben',
      'Das Doppelte, also 460 V',
    ],
    begruendung:
      '230 V ist die Spannung gegen den Sternpunkt. Zwischen zwei Außenleitern ' +
      'stehen um 120° versetzte Spannungen – daraus folgt der Faktor √3.',
    erklaerung: 'Sternspannung 230 V · √3 = verkettete Spannung 400 V.',
    topicIds: ['t1-anlagen-03'],
    verweis: 'Prüfungsbereich Teil 1 – Elektrotechnische Anlagen und Betriebsmittel',
  },
  {
    id: 'f-t1-03',
    bereich: 'teil1',
    frage: 'Was bedeutet der Leistungsfaktor?',
    richtig:
      'Das Verhältnis von Wirkleistung zu Scheinleistung – er zeigt, wie wirksam ein Betriebsmittel Energie nutzt',
    falsch: [
      'Der Anteil der Energie, der als Wärme verloren geht',
      'Der Zählerstand des Stromzählers',
    ],
    begruendung:
      'cos φ = P / S. Je kleiner er ist, desto mehr Blindstrom fließt, desto größer ' +
      'sind Strom und Leitungsverluste bei gleicher Wirkleistung.',
    erklaerung: 'cos φ = P / S. Kleiner Leistungsfaktor = mehr Strom für dieselbe Arbeit.',
    topicIds: ['t1-anlagen-04'],
    verweis: 'Prüfungsbereich Teil 1 – Elektrotechnische Anlagen und Betriebsmittel',
  },
  {
    id: 'f-t1-04',
    bereich: 'teil1',
    frage: 'Wofür steht die Schutzart IP bei einem Betriebsmittel?',
    richtig:
      'Für den Schutz gegen das Eindringen von Fremdkörpern und Wasser, getrennt durch zwei Ziffern',
    falsch: [
      'Für die Isolationsklasse des Motors',
      'Für die maximale Umgebungstemperatur',
    ],
    begruendung:
      'Die erste Ziffer steht für Fremdkörper, die zweite für Wasser. Die ' +
      'Isolationsklasse wird mit F oder H und der Temperatur mit B, F oder H angegeben.',
    erklaerung: 'IP = Eindringungsschutz Fremdkörper (1. Ziffer) und Wasser (2. Ziffer).',
    topicIds: ['t1-anlagen-05'],
    verweis: 'Prüfungsbereich Teil 1 – Elektrotechnische Anlagen und Betriebsmittel',
  },
  {
    id: 'f-t1-05',
    bereich: 'teil1',
    frage: 'Welche Maßnahmen zählen zur elektromagnetischen Verträglichkeit?',
    richtig:
      'Leitungen mit starken Lastströmen von empfindlichen Leitungen trennen, abschirmen und Gehäuse erden',
    falsch: [
      'Alle Leitungen möglichst eng zusammen verlegen',
      'Nur die Absicherung erhöhen',
    ],
    begruendung:
      'Störungen entstehen durch hohe dv/dt und hohe Stromänderungen. Abstand, ' +
      'Abschirmung und Erdung sind die wirksamen Gegenmaßnahmen.',
    erklaerung: 'EMV-Maßnahmen: Abstand, Abschirmung, Erdung – nicht Absicherung.',
    topicIds: ['t1-anlagen-07'],
    verweis: 'Prüfungsbereich Teil 1 – Elektrotechnische Anlagen und Betriebsmittel',
  },
  {
    id: 'f-t1-06',
    bereich: 'teil1',
    frage: 'Wie unterscheidet sich Wechselstrom von Gleichstrom?',
    richtig:
      'Die Polarität wechselt periodisch; im Transformator entsteht dadurch eine veränderbare Spannung',
    falsch: [
      'Er fließt schneller',
      'Er kann nur in Metallleitungen transportiert werden',
    ],
    begruendung:
      'Das Umschalten der Polarität ist der Grund, warum ein Transformator mit ' +
      'Wechselstrom arbeitet. Frequenz und Spannung sind frei wählbar, bei Gleichstrom nicht.',
    erklaerung: 'Wechselstrom wechselt die Polarität – deshalb funktioniert der Transformator.',
    topicIds: ['t1-anlagen-02'],
    verweis: 'Prüfungsbereich Teil 1 – Elektrotechnische Anlagen und Betriebsmittel',
  },
];

export function fachFragenVon(bereich: ExamArea): FachFrage[] {
  return FACHFRAGEN.filter((f) => f.bereich === bereich);
}
