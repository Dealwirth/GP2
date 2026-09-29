import type { ExamArea } from '../../domain/types.ts';

/**
 * Wirtschafts- und Sozialkunde – Fragenbestand.
 *
 * Anders als die technischen Bereiche gibt es hier keine Normzahlen, sondern
 * Rechts- und Tarifbegriffe. Die Fragen sind deshalb als eigener, geprüfter
 * Bestand geführt statt aus der Faktenbasis erzeugt.
 *
 * Grundlage: Rahmenlehrplan der Berufsschule, Lernfeld „Wirtschafts- und
 * Sozialkunde" sowie das Arbeitsrecht und das Sozialversicherungsrecht in der
 * Fassung, die für den Beruf einschlägig sind. Jede Frage nennt ihr Thema im
 * Lernpfad, damit der Fortschritt dorthin fließt.
 *
 * Bewusst keine Zahlenfragen: in der Prüfung wird Wiso praxisbezogen und
 * überwiegendMultiple Choice gestellt. Erfundene Prozentwerte wären hier der
 * schnellste Weg zu falschem Lernen.
 */

export interface WisoFrage {
  id: string;
  frage: string;
  /** Die richtige Option steht bewusst an erster Stelle – der Generator mischt. */
  richtig: string;
  falsch: [string, string];
  begruendung: string;
  /** Themen im Lernpfad, die diese Frage trainiert. */
  topicIds: string[];
  erklaerung: string;
}

export const WISO_FRAGEN: WisoFrage[] = [
  {
    id: 'w-01',
    frage:
      'Wer schließt mit dir den Ausbildungsvertrag?',
    richtig: 'Der Ausbildende, in der Regel der Betrieb',
    falsch: ['Die IHK', 'Die Berufsschule'],
    begruendung:
      'Ausbildungsvertrag wird zwischen Ausbilder und Betrieb geschlossen. Die IHK ' +
      'organisiert die Prüfung, die Berufsschule den Unterricht – beide sind nicht Vertragspartei.',
    topicIds: ['wiso-beruf-01'],
    erklaerung: 'Ausbildungsvertrag: Betrieb und Azubi. IHK und Schule kommen später dazu.',
  },
  {
    id: 'w-02',
    frage: 'Wer bezahlt deine Vergütung während der Ausbildung?',
    richtig: 'Der Ausbildungsbetrieb',
    falsch: ['Die Bundesagentur für Arbeit', 'Die Handwerkskammer'],
    begruendung:
      'Die Ausbildungsvergütung ist Entgelt für die Ausbildung und wird vom ' +
      'Ausbildungsbetrieb gezahlt. Förderungen der Agentur für Arbeit gibt es nur ' +
      'in besonderen Förderfällen.',
    topicIds: ['wiso-beruf-01', 'wiso-finanzen-01'],
    erklaerung: 'Vergütung zahlt der Betrieb – das ist vertraglich geregelt.',
  },
  {
    id: 'w-03',
    frage: 'Wie lange dauert die Probezeit im Arbeitsverhältnis?',
    richtig:
      'Während der ersten sechs Monate, längstens jedoch bis zum Ende des ersten Ausbildungsjahres',
    falsch: [
      'Genau drei Monate, danach ist sie beendet',
      'Ein Jahr',
    ],
    begruendung:
      'Die gesetzliche Regelung nennt sechs Monate, höchstens bis zum Ende des ' +
      'ersten Ausbildungsjahres. Eine längere Probezeit ist unzulässig.',
    topicIds: ['wiso-beruf-03'],
    erklaerung: 'Probezeit: höchstens bis zum Ende des ersten Ausbildungsjahres.',
  },
  {
    id: 'w-04',
    frage: 'Was bedeutet die Fürsorgepflicht des Arbeitgebers?',
    richtig:
      'Der Arbeitgeber muss dafür sorgen, dass du gesund und arbeitsfähig bleibst, und dich bei Gefahren unterweisen.',
    falsch: [
      'Der Arbeitgeber haftet für jede Verletzung ohne Ausnahme',
      'Der Arbeitgeber darf deinen Arbeitsplatz jederzeit ohne Grund wechseln',
    ],
    begruendung:
      'Aus der Fürsorgepflicht folgen Unterweisung, Schutzmaßnahmen und die ' +
      'Möglichkeit, bei Gefährdung die Arbeit zu verweigern.',
    topicIds: ['wiso-beruf-02', 'ka-sicherheit-01'],
    erklaerung: 'Fürsorgepflicht → Unterweisung, Schutz, Arbeitsverweigerungsrecht.',
  },
  {
    id: 'w-05',
    frage: 'Welche Sozialversicherungszweige gibt es?',
    richtig:
      'Kranken-, Renten-, Unfall-, Pflege- und Arbeitslosenversicherung',
    falsch: ['Hausrat- und Rechtsschutzversicherung', 'Bausparversicherung'],
    begruendung:
      'Die fünf Zweige der Sozialversicherung sind KV, RV, UV, PV und ALV. ' +
      'Private Versicherungen zählen nicht dazu.',
    topicIds: ['wiso-finanzen-04', 'wiso-finanzen-02'],
    erklaerung: 'Fünf Zweige: Kranken, Renten, Unfall, Pflege, Arbeitslosigkeit.',
  },
  {
    id: 'w-06',
    frage: 'Welche Aufgabe hat die Unfallversicherung?',
    richtig:
      'Sie entschädigt Arbeitsunfälle und Berufskrankheiten – unabhängig davon, ob ein Verschulden vorliegt.',
    falsch: [
      'Sie zahlt Renten ab dem 65. Lebensjahr',
      'Sie trägt die Beiträge der Arbeitnehmer allein',
    ],
    begruendung:
      'Die Unfallversicherung ist der einzige Zweig, in dem die Versicherung auch ' +
      'ohne Verschulden des Versicherten leistet. Sie wird allein vom Arbeitgeber ' +
      'finanziert.',
    topicIds: ['wiso-finanzen-04'],
    erklaerung: 'Unfallversicherung: Leistung auch ohne Verschulden, allein vom Arbeitgeber finanziert.',
  },
  {
    id: 'w-07',
    frage: 'Wer trägt die Beiträge zur gesetzlichen Krankenversicherung eines Ausbildenden?',
    richtig:
      'Arbeitgeber und Arbeitnehmer jeweils zur Hälfte',
    falsch: [
      'Nur der Arbeitgeber',
      'Nur die Auszubildenden',
    ],
    begruendung:
      'Die Beiträge werden paritätisch geteilt, jeweils anteilig am Bruttoentgelt. ' +
      'Deshalb ist die Hälfte der Beiträge steuerfrei.',
    topicIds: ['wiso-finanzen-02'],
    erklaerung: 'KV-Beiträge je zur Hälfte bei Arbeitgeber und Azubi.',
  },
  {
    id: 'w-08',
    frage: 'Was ist ein Tarifvertrag?',
    richtig:
      'Eine Vereinbarung zwischen Arbeitgeberverbänden und Gewerkschaften, die Arbeitsbedingungen regelt.',
    falsch: [
      'Ein Vertrag zwischen Betrieb und Azubi',
      'Ein Gesetz, das die Ausbildungsvergütung festlegt',
    ],
    begruendung:
      'Der Tarifvertrag wird zwischen den Tarifpartnern geschlossen und gilt dann ' +
      'unmittelbar – oder über die Einbindung im Arbeitsvertrag.',
    topicIds: ['wiso-betrieb-03'],
    erklaerung: 'Tarifvertrag: zwischen Arbeitgeberverband und Gewerkschaft, nicht mit dem Azubi.',
  },
  {
    id: 'w-09',
    frage: 'Wer ist in einem Elektrobetrieb für die Prüfungen der elektrischen Anlagen zuständig?',
    richtig: 'Eine Elektrofachkraft mit entsprechender Qualifikation und Befugung',
    falsch: [
      'Jede Person im Betrieb, die sich auskennt',
      'Ausschließlich der Geschäftsführer',
    ],
    begruendung:
      'Arbeiten an elektrischen Anlagen dürfen nur von Elektrofachkräften ' +
      'durchgeführt werden. Die Befugung ergibt sich aus Ausbildung und Erfahrung.',
    topicIds: ['wiso-recht-03', 'ka-sicherheit-01'],
    erklaerung: 'Arbeiten an elektrischen Anlagen: nur Elektrofachkräfte mit Befugung.',
  },
  {
    id: 'w-10',
    frage: 'Was musst du tun, wenn du während der Arbeit bemerkst, dass eine Schutzmaßnahme fehlt?',
    richtig:
      'Die Arbeit unterbrechen und die Gefahr melden, bis sie beseitigt ist',
    falsch: [
      'Trotzdem weiterarbeiten und es später melden',
      'Die Arbeit selbst umgehen und weiterarbeiten',
    ],
    begruendung:
      'Das Arbeitsschutzgesetz gibt dir ausdrücklich ein ' +
      'Arbeitsverweigerungsrecht bei Gefährdung. Es ist keine Pflichtverletzung, ' +
      'sondern die vorgesehene Reaktion.',
    topicIds: ['wiso-recht-02', 'ka-sicherheit-02'],
    erklaerung: 'Gefahr erkannt → Arbeit unterbrechen, melden, erst nach Beseitigung fortfahren.',
  },
  {
    id: 'w-11',
    frage: 'Wofür haftet ein Fachbetrieb nach dem Produkthaftungsgesetz?',
    richtig:
      'Für Schäden durch fehlerhafte Produkte, auch bei ordnungsgemäßer Nutzung',
    falsch: [
      'Nur für Schäden bei falscher Bedienung durch den Kunden',
      'Nur bei Vorsatz',
    ],
    begruendung:
      'Die Produkthaftung ist verschuldensunabhängig. Ein Fehler des Produkts ' +
      'genügt – auch wenn der Betrieb selbst nichts falsch gemacht hat.',
    topicIds: ['wiso-recht-03'],
    erklaerung: 'Produkthaftung: verschuldensunabhängig, Fehler des Produkts genügt.',
  },
  {
    id: 'w-12',
    frage: 'Was ist beim Datenschutz in der Gebäudeautomation zu beachten?',
    richtig:
      'Personenbezogene Daten dürfen nur zweckgebunden verarbeitet, geschützt und nicht ohne Grund weitergegeben werden.',
    falsch: [
      'Daten von Mietern dürfen intern frei weitergegeben werden',
      'Datenschutz betrifft nur den Internetauftritt eines Betriebs',
    ],
    begruendung:
      'In der Gebäudeautomation werden Raumnutzung, Anwesenheit und Verbrauch ' +
      'erfasst. Das sind personenbezogene Daten mit Zweckbindung und ' +
      'Löschpflicht.',
    topicIds: ['wiso-recht-04', 'sys-nachhaltigkeit-05'],
    erklaerung: 'Gebäudeautomation verarbeitet Personen- und Nutzungsdaten: Zweckbindung und Löschfristen gelten.',
  },
  {
    id: 'w-13',
    frage: 'Was ist beim Kundenauftrag in der Prüfung besonders wichtig?',
    richtig:
      'Am Kundenwunsch orientiert arbeiten, Normen einhalten und die eigene Arbeit fachlich erklären können',
    falsch: [
      'Nur das einwandfreie Funktionieren sicherstellen, die Normen sind zweitrangig',
      'Den Auftrag möglichst schnell abschließen, um Zeit zu sparen',
    ],
    begruendung:
      'Der Kundenauftrag bewertet Planung, Ausführung, Sicherheit und das ' +
      'situative Fachgespräch. Eine schnelle, nicht normgerechte Lösung bringt nichts.',
    topicIds: ['ka-auftraege-01', 'wiso-betrieb-01'],
    erklaerung: 'Kundenauftrag: Wunsch erfüllen, Norm einhalten, eigene Arbeit erklären können.',
  },
  {
    id: 'w-14',
    frage: 'Welche Bedeutung hat die Dokumentation am Ende eines Auftrags?',
    richtig:
      'Sie belegt die ausgeführten Arbeiten und ist Grundlage für Wartung, Fehlersuche und Haftung',
    falsch: [
      'Sie dient nur der Rechnungsstellung',
      'Sie wird nur bei Beanstandungen erstellt',
    ],
    begruendung:
      'Ohne Protokoll ist nicht nachweisbar, was geprüft und mit welchem Ergebnis. ' +
      'Was nicht dokumentiert ist, existiert in der Bewertung nicht.',
    topicIds: ['ka-pruefung-01', 'ka-dokumentation-01', 'fsa-schutzbewertung-04', 'wiso-recht-03'],
    erklaerung: 'Dokumentation ist Nachweis, Grundlage für Wartung und Teil der Bewertung.',
  },
  {
    id: 'w-15',
    frage: 'Was ist der Unterschied zwischen Erzeugerstrom und Verbraucherstrom?',
    richtig:
      'Erzeugerstrom wird eingespeist und ins Netz zurückgespeist, Verbraucherstrom wird aus dem Netz bezogen.',
    falsch: [
      'Es gibt keinen Unterschied, beides heißt Netzstrom',
      'Verbraucherstrom wird nur bei Gewerbebetrieben gezählt',
    ],
    begruendung:
      'Bei Photovoltaik oder Beteiligung an einer Einspeisung entstehen beide ' +
      'Richtungen. Die Zählung und die steuerliche Behandlung unterscheiden sich.',
    topicIds: ['wiso-umwelt-03', 'ka-gebaeudetechnik-03'],
    erklaerung: 'Erzeugerstrom fließt ins Netz zurück, Verbraucherstrom kommt aus dem Netz.',
  },
  {
    id: 'w-16',
    frage: 'Wie wirkt sich eine energetische Sanierung auf die Betriebskosten aus?',
    richtig:
      'Sie senkt den Energieverbrauch und damit die laufenden Kosten, erfordert aber eine höhere Investition.',
    falsch: [
      'Sie senkt sofort alle Kosten ohne Investition',
      'Sie erhöht ausschließlich den Stromverbrauch',
    ],
    begruendung:
      'Amortisation entscheidet. Erneuerbare Anlagen haben geringere laufende ' +
      'Kosten, dafür höhere Anschaffungskosten und Förderung ist oft möglich.',
    topicIds: ['wiso-finanzen-05', 'wiso-umwelt-04', 'sys-nachhaltigkeit-01'],
    erklaerung: 'Sanierung: geringere laufende Kosten, höhere Investition – die Amortisation entscheidet.',
  },
  {
    id: 'w-17',
    frage: 'Wer trägt im Mietverhältnis die Kosten für den Strom in der Wohnung?',
    richtig: 'Der Mieter',
    falsch: ['Der Vermieter', 'Die Hausverwaltung des Vermieters'],
    begruendung:
      'Der Mieter trägt die laufenden Kosten. Der Vermieter trägt Instandhaltung ' +
      'und Modernisierung – und darf die Miete dafür nicht automatisch erhöhen.',
    topicIds: ['wiso-betrieb-02', 'wiso-umwelt-04'],
    erklaerung: 'Mieter zahlt Verbrauch, Vermieter trägt Instandhaltung und Modernisierung.',
  },
  {
    id: 'w-18',
    frage: 'Was gehört zu den arbeitspsychologischen Belastungen im Elektrohandwerk?',
    richtig:
      'Monotonie, Zeitdruck, Lärm und das Arbeiten in unbequemer Haltung',
    falsch: [
      'Nur körperliche Schwerarbeit',
      'Nur die Gefahr durch Stromschlag',
    ],
    begruendung:
      'Belastungen sind vielfältig. Im Elektrohandwerk kommen hinzu: Arbeiten in ' +
      'Höhe, enge Räume, Lärm durch Werkzeuge, Unterbrechungen durch Baustellen.',
    topicIds: ['wiso-betrieb-01', 'wiso-umwelt-01'],
    erklaerung: 'Belastung: Monotonie, Zeitdruck, Lärm, Zwangshaltung, Höhe – nicht nur Stromschlag.',
  },
  {
    id: 'w-19',
    frage:
      'Wie lang muss die Ruhepause bei einer Arbeitszeit von mehr als sechs Stunden sein?',
    richtig: 'Mindestens 30 Minuten',
    falsch: ['Mindestens 60 Minuten', 'Eine Ruhepause ist nicht vorgeschrieben'],
    begruendung:
      'Bei mehr als sechs Stunden zusammenhängender Arbeit ist eine Ruhepause von ' +
      'mindestens 30 Minuten zu gewähren, die in die Arbeitszeit fällt.',
    topicIds: ['wiso-recht-01'],
    erklaerung: 'Über sechs Stunden arbeiten: mindestens 30 Minuten Ruhepause, die in die Arbeitszeit fällt.',
  },
  {
    id: 'w-20',
    frage: 'Warum gibt es eine Fortbildungspflicht im Elektrohandwerk?',
    richtig:
      'Weil sich Technik und Normen ändern – wer sich nicht fortbildet, verliert die fachliche Qualifikation.',
    falsch: [
      'Weil sie vom Finanzamt vorgeschrieben wird',
      'Nur um die Ausbildungsvergütung zu erhöhen',
    ],
    begruendung:
      'Normen, Vorschriften und Technik entwickeln sich weiter. Fortbildung ist ' +
      'deshalb Bestandteil der beruflichen Qualifikation, nicht bloß Karriereplanung.',
    topicIds: ['wiso-beruf-04'],
    erklaerung: 'Fortbildung ist Qualifikationserhalt – Technik und Normen ändern sich.',
  },
  {
    id: 'w-21',
    frage: 'Was bedeutet Mitbestimmung im Betrieb?',
    richtig:
      'Arbeitnehmer wirken in Aufsichtsrat oder Betriebsrat mit, etwa über Wahl und Abberufung der Leitungsebene.',
    falsch: [
      'Arbeitnehmer entscheiden über Investitionen',
      'Arbeitnehmer bestimmen den Tarifvertrag',
    ],
    begruendung:
      'Mitbestimmung betrifft die Leitungsebene und die soziale Ausgestaltung. Über ' +
      'Investitionen und Tarife wird nicht mitbestimmt.',
    topicIds: ['wiso-betrieb-04'],
    erklaerung: 'Mitbestimmung: Beteiligung an Aufsichtsrat und Betriebsrat – nicht an Investitionen oder Tarifen.',
  },
  {
    id: 'w-22',
    frage: 'Welche Steuerlast trägt ein Elektrobetrieb typischerweise?',
    richtig:
      'Umsatzsteuer auf die Umsätze, Lohnsteuer auf die Löhne und Einkommen- bzw. Gewerbesteuer auf den Gewinn.',
    falsch: [
      'Erbschaftsteuer auf den Betrieb',
      'Grundsteuer auf die Betriebsfläche',
    ],
    begruendung:
      'Umsatzsteuer wird auf die Umsätze erhoben, Lohnsteuer auf die Löhne, die ' +
      'Einkommensteuer auf den Gewinn. Die abziehbare Vorsteuer mindert die ' +
      'Umsatzsteuer für den Betrieb.',
    topicIds: ['wiso-finanzen-03'],
    erklaerung: 'Steuern des Betriebs: Umsatz, Lohn und Einkommen – Vorsteuer mindert die Umsatzsteuer.',
  },
  {
    id: 'w-23',
    frage: 'Wie sind ausgediente Leuchtmittel und Leuchten zu entsorgen?',
    richtig:
      'Getrennt über die dafür vorgesehenen Sammelstellen, mit Nachweis – nicht über den Hausmüll.',
    falsch: [
      'Über den Hausmüll, wenn sie nicht mehr leuchten',
      'Durch Zerbrechen in der Tonne',
    ],
    begruendung:
      'Leuchtmittel enthalten Quecksilber, Leuchten teils Schadstoffe. Die ' +
      'getrennte Entsorgung mit Nachweis ist vorgeschrieben.',
    topicIds: ['wiso-umwelt-02'],
    erklaerung: 'Leuchtmittel und Leuchten: getrennt entsorgen, mit Nachweis.',
  },
  {
    id: 'w-24',
    frage: 'Worin besteht die Energiewende auf Verbraucherseite?',
    richtig:
      'In erneuerbarer Erzeugung, elektrifizierter Wärme, Speicher und zeitlich steuerbarem Verbrauch.',
    falsch: [
      'Nur im Bau von Windrädern',
      'Nur im Austausch von Leuchtmitteln',
    ],
    begruendung:
      'Die Energiewende betrifft die ganze Kette. Erst wenn erneuerbare Leistung ' +
      'gespeichert und der Verbrauch verschoben werden kann, wirkt sie auch bei dir.',
    topicIds: ['wiso-umwelt-05', 'ka-gebaeudetechnik-01'],
    erklaerung: 'Erneuerbar erzeugen · Wärme elektrifizieren · speichern · Verbrauch verschieben.',
  },
];

/** Verteilung der Fragen auf die Kapitel des Wirtschafts- und Sozialkunde-Bereichs. */
export const WISO_BEREICH: ExamArea = 'wiso';

export function wisoThemen(): string[] {
  return [...new Set(WISO_FRAGEN.flatMap((f) => f.topicIds))].filter((id) => id.startsWith('wiso-'));
}
