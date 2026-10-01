import type { ExamArea } from '../../domain/types.ts';

/**
 * Kuratierte Fragen in den interaktiven Formaten.
 *
 * Die Faktenbasis trägt Werte und Aussagen. Daraus lassen sich Wert- und
 * Zuordnungsfragen bauen – aber nicht jede Prüfungsform. Was hier steht, deckt
 * genau die Lücken:
 *
 *   - **wahr-falsch** für Aussagen, bei denen es auf ein einziges Wort
 *     ankommt („muss" gegen „kann", „vor" gegen „nach").
 *   - **zuordnung** für Paare, die in der Prüfung gegeneinander gestellt
 *     werden (Kennlinie → Einsatz, Messgröße → Messgerät, Schutzart → Raum).
 *   - **reihenfolge** für Arbeitsabläufe: die fünf Sicherheitsregeln, die
 *     Prüfschritte, der Ablauf der Fehlersuche.
 *   - **luecke** für Fachbegriffe, die im Satz sitzen müssen.
 *
 * Regeln für diesen Bestand – dieselben wie überall:
 *   1. Keine erfundenen Zahlen. Wo eine Zahl nötig ist, stammt sie aus der
 *      Faktenbasis und wird von dort bezogen.
 *   2. Jede falsche Aussage ist ein echter Irrtum der Praxis, kein Zufall.
 *   3. Jede Frage nennt ihr Thema im Lernpfad – sonst liefe ihr Ergebnis ins
 *      Leere.
 */

export interface WfFrage {
  id: string;
  thema: string;
  bereich: ExamArea;
  aussage: string;
  wahr: boolean;
  begruendung: string;
  erklaerung: string;
  stufe?: 1 | 2 | 3;
  factIds?: string[];
}

export interface ZuordFrage {
  id: string;
  thema: string;
  bereich: ExamArea;
  frage: string;
  paare: [string, string][];
  begruendung: string;
  erklaerung: string;
  stufe?: 1 | 2 | 3;
  factIds?: string[];
}

export interface ReihenfolgeFrage {
  id: string;
  thema: string;
  bereich: ExamArea;
  frage: string;
  schritte: string[];
  begruendung: string;
  erklaerung: string;
  stufe?: 1 | 2 | 3;
}

export interface LueckFrage {
  id: string;
  thema: string;
  bereich: ExamArea;
  /** Der Satz mit `___` an jeder Lücke. */
  text: string;
  loesungen: { loesung: string; alternativen?: string[] }[];
  begruendung: string;
  erklaerung: string;
  stufe?: 1 | 2 | 3;
  factIds?: string[];
}

// ===========================================================================
// Wahr / Falsch
// ===========================================================================

export const WF_FRAGEN: WfFrage[] = [
  // --- Sicherheit (ka-sicherheit) -----------------------------------------
  {
    id: 'wf-sich-01',
    thema: 'ka-sicherheit-02',
    bereich: 'kundenauftrag',
    aussage: 'Vor dem Freischalten muss die Spannungsfreiheit festgestellt werden.',
    wahr: false,
    begruendung:
      'Die Reihenfolge ist umgekehrt: Erst freischalten, dann gegen Wiedereinschalten sichern, dann Spannungsfreiheit feststellen.',
    erklaerung:
      'Spannungsfreiheit wird nach dem Freischalten festgestellt, nicht davor – sonst arbeitet man am spannungsführenden Teil.',
    stufe: 1,
  },
  {
    id: 'wf-sich-02',
    thema: 'ka-sicherheit-01',
    bereich: 'kundenauftrag',
    aussage: 'Zu den fünf Sicherheitsregeln gehört das Sichern gegen Wiedereinschalten.',
    wahr: true,
    begruendung:
      'Die fünf Regeln lauten: Freischalten, gegen Wiedereinschalten sichern, Spannungsfreiheit feststellen, Erden und Kurzschließen, benachbarte Teile abdecken.',
    erklaerung: 'Das Sichern gegen Wiedereinschalten ist die zweite der fünf Sicherheitsregeln.',
    stufe: 1,
  },
  {
    id: 'wf-sich-03',
    thema: 'ka-sicherheit-01',
    bereich: 'kundenauftrag',
    aussage: 'Erden und Kurzschließen steht vor dem Feststellen der Spannungsfreiheit.',
    wahr: false,
    begruendung:
      'Erst wird die Spannungsfreiheit festgestellt, dann geerdet und kurzgeschlossen. Umgekehrt würde man ins spannungsführende Netz erden.',
    erklaerung: 'Die Reihenfolge der Sicherheitsregeln ist zwingend einzuhalten.',
    stufe: 1,
  },
  {
    id: 'wf-sich-04',
    thema: 'ka-sicherheit-04',
    bereich: 'kundenauftrag',
    aussage: 'Persönliche Schutzausrüstung ersetzt die fünf Sicherheitsregeln nicht.',
    wahr: true,
    begruendung:
      'PSA ist die letzte Barriere. Die Sicherheitsregeln bleiben zwingend – PSA tritt ergänzend hinzu.',
    erklaerung: 'PSA ergänzt die Sicherheitsregeln, sie ersetzt sie nicht.',
    stufe: 1,
  },
  {
    id: 'wf-sich-05',
    thema: 'ka-sicherheit-05',
    bereich: 'kundenauftrag',
    aussage: 'Ein Not-Aus muss in seiner Wirkung selbsttätig überwacht oder zwangsläufig sein.',
    wahr: true,
    begruendung:
      'Nach DIN EN ISO 13850 muss die Wirkung des Not-Aus durch zwangsläufige Schaltungsgestaltung oder selbsttätige Überwachung sichergestellt sein.',
    erklaerung: 'Der Not-Aus muss zwangsläufig oder überwacht wirken.',
    stufe: 2,
  },

  // --- Prüfung (ka-pruefung) ----------------------------------------------
  {
    id: 'wf-pruef-01',
    thema: 'ka-pruefung-01',
    bereich: 'kundenauftrag',
    aussage:
      'Die Erstprüfung umfasst Besichtigen, Erproben und Messen.',
    wahr: true,
    begruendung:
      'Nach DIN VDE 0100-600 gehören Besichtigen, Erproben und Messen zur Erstprüfung – in dieser Reihenfolge.',
    erklaerung: 'Erstprüfung = Besichtigen, Erproben, Messen.',
    stufe: 1,
  },
  {
    id: 'wf-pruef-02',
    thema: 'ka-pruefung-01',
    bereich: 'kundenauftrag',
    aussage: 'Bei der Erstprüfung genügt das Messen; Besichtigen und Erproben sind freiwillig.',
    wahr: false,
    begruendung:
      'Alle drei Schritte sind vorgeschrieben. Ohne Besichtigung bleiben sichtbare Mängel unentdeckt.',
    erklaerung: 'Besichtigen, Erproben und Messen sind gleichermaßen Teil der Erstprüfung.',
    stufe: 1,
  },
  {
    id: 'wf-pruef-03',
    thema: 'ka-pruefung-08',
    bereich: 'kundenauftrag',
    aussage:
      'Für ortsveränderliche elektrische Betriebsmittel gilt nach DGUV Vorschrift 3 eine Prüffrist von vier Jahren.',
    wahr: false,
    begruendung:
      'Für ortsveränderliche Betriebsmittel gilt in der Regel eine Prüffrist von sechs Monaten; die vier Jahre gelten für ortsfeste Anlagen nach Gefährdungsbeurteilung.',
    erklaerung: 'Ortsveränderliche Betriebsmittel: Prüffrist regelmäßig sechs Monate.',
    stufe: 2,
  },
  {
    id: 'wf-pruef-04',
    thema: 'ka-pruefung-04',
    bereich: 'kundenauftrag',
    aussage: 'Der Schutzleiterwiderstand wird mit dem Durchgangsprüfer gemessen.',
    wahr: true,
    begruendung:
      'Der Schutzleiterwiderstand ist eine Durchgangsmessung mit mindestens 200 mA Prüfstrom.',
    erklaerung: 'Schutzleiterdurchgang wird mit ausreichendem Prüfstrom gemessen.',
    stufe: 1,
  },
  {
    id: 'wf-pruef-05',
    thema: 'ka-pruefung-10',
    bereich: 'kundenauftrag',
    aussage: 'Der Isolationswiderstand wird im spannungsfreien Zustand gemessen.',
    wahr: true,
    begruendung:
      'Die Isolationsmessung erfolgt immer spannungsfrei – sonst zerstört die Prüfspannung das Messgerät und liefert falsche Werte.',
    erklaerung: 'Isolationsmessung immer spannungsfrei.',
    stufe: 1,
  },

  // --- Messen (ka-messen) --------------------------------------------------
  {
    id: 'wf-mess-01',
    thema: 'ka-messen-04',
    bereich: 'kundenauftrag',
    aussage: 'Der Mindest-Isolationswiderstand einer Anlage bis 500 V beträgt 1 MΩ.',
    wahr: true,
    begruendung: 'Nach DIN VDE 0100-600 gilt für Anlagen bis 500 V ein Mindestwert von 1 MΩ.',
    erklaerung: 'Mindest-Isolationswiderstand bei 500 V Prüfspannung: 1 MΩ.',
    stufe: 1,
    factIds: ['riso-grenzwert'],
  },
  {
    id: 'wf-mess-02',
    thema: 'ka-messen-01',
    bereich: 'kundenauftrag',
    aussage: 'Ein Duspol ist ein zweipoliger Spannungsprüfer mit Lastzuschaltung.',
    wahr: true,
    begruendung:
      'Der zweipolige Spannungsprüfer prüft mit Lastzuschaltung und zeigt auch induktive Spannungen als nicht gefährlich an.',
    erklaerung: 'Duspol: zweipoliger Spannungsprüfer mit Lastzuschaltung.',
    stufe: 1,
  },
  {
    id: 'wf-mess-03',
    thema: 'ka-messen-07',
    bereich: 'kundenauftrag',
    aussage: 'Der Schleifenwiderstand wird zwischen Außenleiter und Schutzleiter gemessen.',
    wahr: true,
    begruendung:
      'Der Fehlerschleifenwiderstand ist der Widerstand des Kreises Außenleiter–Schutzleiter und bestimmt die Abschaltbedingung.',
    erklaerung: 'Schleifenwiderstand: Außenleiter gegen Schutzleiter.',
    stufe: 2,
  },
  {
    id: 'wf-mess-04',
    thema: 'ka-messen-03',
    bereich: 'kundenauftrag',
    aussage: 'Ein Kurzschluss und ein Erdschluss sind dasselbe.',
    wahr: false,
    begruendung:
      'Ein Kurzschluss verbindet zwei Außenleiter oder Außenleiter und Neutralleiter. Ein Erdschluss verbindet einen Außenleiter mit Erde.',
    erklaerung: 'Kurzschluss und Erdschluss sind verschiedene Fehlerarten.',
    stufe: 1,
  },
  {
    id: 'wf-mess-05',
    thema: 'ka-messen-06',
    bereich: 'kundenauftrag',
    aussage: 'Der Erdungswiderstand darf umso größer sein, je größer der Fehlerstrom ist.',
    wahr: false,
    begruendung:
      'Der zulässige Erdungswiderstand sinkt mit steigendem Fehlerstrom – die Berührungsspannung muss unter dem Grenzwert bleiben.',
    erklaerung: 'Kleiner Fehlerstrom erlaubt einen größeren Erdungswiderstand.',
    stufe: 2,
  },

  // --- Verteilung (ka-verteilung) ------------------------------------------
  {
    id: 'wf-vert-01',
    thema: 'ka-verteilung-05',
    bereich: 'kundenauftrag',
    aussage: 'Ein RCD mit I_Δn = 30 mA ist für den zusätzlichen Personenschutz vorgesehen.',
    wahr: true,
    begruendung:
      'Für den zusätzlichen Schutz bei direktem Berühren fordert DIN VDE 0100-410 einen RCD mit höchstens 30 mA.',
    erklaerung: 'Zusätzlicher Personenschutz: I_Δn ≤ 30 mA.',
    stufe: 1,
    factIds: ['idn-personenschutz'],
  },
  {
    id: 'wf-vert-02',
    thema: 'ka-verteilung-03',
    bereich: 'kundenauftrag',
    aussage:
      'Ein Leitungsschutzschalter mit Kennlinie B löst beim 3- bis 5-fachen Nennstrom innerhalb der Prüfzeit aus.',
    wahr: true,
    begruendung:
      'Kennlinie B ist für Stromkreise mit geringem Einschaltstrom; der magnetische Auslöser liegt beim 3- bis 5-fachen von In.',
    erklaerung: 'Kennlinie B: magnetische Auslösung beim 3- bis 5-fachen In.',
    stufe: 2,
  },
  {
    id: 'wf-vert-03',
    thema: 'ka-verteilung-03',
    bereich: 'kundenauftrag',
    aussage: 'Die Kennlinie C löst empfindlicher aus als die Kennlinie B.',
    wahr: false,
    begruendung:
      'Die Kennlinie C löst beim 5- bis 10-fachen von In aus, die Kennlinie B bereits beim 3- bis 5-fachen – B ist also empfindlicher.',
    erklaerung: 'Kennlinie B ist empfindlicher als C.',
    stufe: 2,
  },
  {
    id: 'wf-vert-04',
    thema: 'ka-verteilung-04',
    bereich: 'kundenauftrag',
    aussage:
      'Die Absicherung eines Stromkreises richtet sich nur nach der Strombelastbarkeit der Leitung, nicht nach dem Verbraucher.',
    wahr: false,
    begruendung:
      'Beides muss zusammenpassen: Die Absicherung schützt die Leitung, muss aber auch den Anlaufstrom des Verbrauchers zulassen.',
    erklaerung: 'Absicherung: Leitungsschutz und Verbraucherverhalten zusammen betrachten.',
    stufe: 2,
  },
  {
    id: 'wf-vert-05',
    thema: 'ka-verteilung-02',
    bereich: 'kundenauftrag',
    aussage: 'Der SLS hat die Aufgabe, den Zählerplatz und die Hauptleitung zu schützen.',
    wahr: true,
    begruendung:
      'Der selektive Leitungsschutzschalter sitzt vor dem Zähler und schützt die Zähleranlage; er ist zudem Hauptschalter.',
    erklaerung: 'SLS: Schutz des Zählerplatzes und Hauptleitung.',
    stufe: 1,
  },
  {
    id: 'wf-vert-06',
    thema: 'ka-verteilung-01',
    bereich: 'kundenauftrag',
    aussage: 'In einem Verteiler darf der PEN-Leiter nach dem Aufteilungspunkt erneut als PEN geführt werden.',
    wahr: false,
    begruendung:
      'Nach dem Aufteilungspunkt in N und PE darf PEN nicht wieder zusammengeführt werden – die Trennung ist endgültig.',
    erklaerung: 'PEN wird einmalig in N und PE aufgeteilt, danach nie wieder vereinigt.',
    stufe: 2,
  },

  // --- Pläne (ka-plaene) ---------------------------------------------------
  {
    id: 'wf-plan-01',
    thema: 'ka-plaene-01',
    bereich: 'kundenauftrag',
    aussage: 'Der Stromlaufplan zeigt den Stromweg in der Funktion, nicht die räumliche Anordnung.',
    wahr: true,
    begruendung:
      'Der Stromlaufplan stellt die Funktion dar; die räumliche Anordnung zeigt der Installations- und Anordnungsplan.',
    erklaerung: 'Stromlaufplan = Funktion, Installationsplan = Anordnung.',
    stufe: 1,
  },
  {
    id: 'wf-plan-02',
    thema: 'ka-plaene-05',
    bereich: 'kundenauftrag',
    aussage: 'Der Installationsplan ist ein maßstäblicher Plan der Leitungsführung und Betriebsmittel.',
    wahr: true,
    begruendung:
      'Der Installationsplan zeigt im Maßstab, wo Leitungen und Betriebsmittel im Gebäude liegen.',
    erklaerung: 'Installationsplan: maßstäbliche Lage von Leitungen und Betriebsmitteln.',
    stufe: 1,
  },
  {
    id: 'wf-plan-03',
    thema: 'ka-plaene-03',
    bereich: 'kundenauftrag',
    aussage: 'Der Übersichtsschaltplan zeigt jede einzelne Ader und Klemme.',
    wahr: false,
    begruendung:
      'Der Übersichtsschaltplan zeigt das Zusammenwirken der Anlagenteile; die einzelne Verdrahtung steht im Verdrahtungsplan.',
    erklaerung: 'Übersichtsschaltplan = Zusammenwirken, nicht Einzelverdrahtung.',
    stufe: 1,
  },

  // --- Verlegung (ka-verlegung) --------------------------------------------
  {
    id: 'wf-verl-01',
    thema: 'ka-verlegung-10',
    bereich: 'kundenauftrag',
    aussage:
      'Leitungen für Informations- und Steuersignale werden getrennt von Leistungsleitungen verlegt.',
    wahr: true,
    begruendung:
      'Die Trennung beugt elektromagnetischen Störungen vor; Kreuzungen erfolgen rechtwinklig.',
    erklaerung: 'EMV: Signal- und Leistungsleitungen trennen.',
    stufe: 2,
  },
  {
    id: 'wf-verl-02',
    thema: 'ka-verlegung-03',
    bereich: 'kundenauftrag',
    aussage: 'Der Biegeradius einer Leitung darf beliebig klein sein, solange sie nicht bricht.',
    wahr: false,
    begruendung:
      'Der Hersteller gibt einen Mindestbiegeradius vor; wird er unterschritten, können Adern und Isolierung beschädigt werden.',
    erklaerung: 'Mindestbiegeradius einhalten.',
    stufe: 1,
  },
  {
    id: 'wf-verl-03',
    thema: 'ka-verlegung-09',
    bereich: 'kundenauftrag',
    aussage: 'Der Schutzleiter wird grün-gelb gekennzeichnet.',
    wahr: true,
    begruendung: 'Der Schutzleiter ist ausschließlich grün-gelb zu kennzeichnen.',
    erklaerung: 'Schutzleiter: grün-gelb.',
    stufe: 1,
  },
  {
    id: 'wf-verl-04',
    thema: 'ka-verlegung-04',
    bereich: 'kundenauftrag',
    aussage:
      'Zum Herstellen eines Leiteranschlusses wird der Leiter zuerst abisoliert, dann in die Klemme geführt und auf festen Sitz geprüft.',
    wahr: true,
    begruendung:
      'Die Reihenfolge Abisolieren, Einführen, Sitzprüfen verhindert Klemmenfehler; die Isolierlänge richtet sich nach der Klemme.',
    erklaerung: 'Abisolieren, Einführen, Sitz prüfen.',
    stufe: 1,
  },

  // --- Inbetriebnahme (ka-inbetriebnahme) ----------------------------------
  {
    id: 'wf-ibn-01',
    thema: 'ka-inbetriebnahme-04',
    bereich: 'kundenauftrag',
    aussage:
      'Bei der Fehlersuche wird zuerst die Messung durchgeführt und danach die Sichtprüfung.',
    wahr: false,
    begruendung:
      'Zuerst wird gesichtet und die Funktion eingegrenzt; die Messung bestätigt danach die vermutete Ursache.',
    erklaerung: 'Fehlersuche: erst sichten und eingrenzen, dann messen.',
    stufe: 2,
  },
  {
    id: 'wf-ibn-02',
    thema: 'ka-inbetriebnahme-07',
    bereich: 'kundenauftrag',
    aussage: 'Bei der Kundeneinweisung wird auf die Gefahren und die Notabschaltung hingewiesen.',
    wahr: true,
    begruendung:
      'Die Übergabe umfasst die Bedienung, die Gefahren und das Verhalten im Notfall – das ist Teil der Abnahme.',
    erklaerung: 'Kundeneinweisung: Bedienung, Gefahren, Notabschaltung.',
    stufe: 1,
  },
  {
    id: 'wf-ibn-03',
    thema: 'ka-inbetriebnahme-05',
    bereich: 'kundenauftrag',
    aussage: 'Vor der Inbetriebnahme wird die Schutzmaßnahme geprüft und dokumentiert.',
    wahr: true,
    begruendung:
      'Ohne bestandene Schutzprüfung darf die Anlage nicht in Betrieb gehen; das Ergebnis wird protokolliert.',
    erklaerung: 'Schutzprüfung vor Inbetriebnahme, mit Protokoll.',
    stufe: 1,
  },

  // --- Kundenauftrag (ka-auftraege) ---------------------------------------
  {
    id: 'wf-auft-01',
    thema: 'ka-auftraege-01',
    bereich: 'kundenauftrag',
    aussage: 'Ein Kundenauftrag beginnt mit der Auftragsklärung, nicht mit der Materialbestellung.',
    wahr: true,
    begruendung:
      'Erst werden Bedarf, Umfang und Bedingungen geklärt; Material und Termin folgen daraus.',
    erklaerung: 'Auftragsklärung steht am Anfang.',
    stufe: 1,
  },
  {
    id: 'wf-auft-02',
    thema: 'ka-auftraege-02',
    bereich: 'kundenauftrag',
    aussage: 'Ein Angebot ist rechtlich ein bindender Vertrag.',
    wahr: false,
    begruendung:
      'Das Angebot ist eine Aufforderung zur Abgabe eines Angebots; erst die Auftragsbestätigung oder Annahme bindet.',
    erklaerung: 'Angebot und Vertrag sind zu unterscheiden.',
    stufe: 2,
  },

  // --- Systementwurf -------------------------------------------------------
  {
    id: 'wf-sys-01',
    thema: 'sys-analyse-01',
    bereich: 'systementwurf',
    aussage: 'Vor dem Entwurf wird die Ausgangslage der Anlage aufgenommen.',
    wahr: true,
    begruendung:
      'Ohne Bestandsaufnahme fehlen die Randbedingungen; der Entwurf wäre eine Vermutung.',
    erklaerung: 'Bestandsaufnahme vor dem Entwurf.',
    stufe: 1,
  },
  {
    id: 'wf-sys-02',
    thema: 'sys-varianten-02',
    bereich: 'systementwurf',
    aussage:
      'Bei der Wirtschaftlichkeitsbetrachtung werden Investition und Betriebskosten über die Nutzungsdauer verglichen.',
    wahr: true,
    begruendung:
      'Eine Variante ist erst dann günstiger, wenn sie über die Nutzungsdauer betrachtet weniger kostet – nicht nur in der Anschaffung.',
    erklaerung: 'Wirtschaftlichkeit über die Nutzungsdauer betrachten.',
    stufe: 2,
  },
  {
    id: 'wf-sys-03',
    thema: 'sys-spezifikation-03',
    bereich: 'systementwurf',
    aussage: 'Der Leiterquerschnitt wird nur nach der Strombelastbarkeit gewählt.',
    wahr: false,
    begruendung:
      'Neben der Strombelastbarkeit sind Spannungsfall, Verlegeart, Häufung und die Abschaltbedingung zu berücksichtigen.',
    erklaerung: 'Querschnitt: Strombelastbarkeit und Spannungsfall und Verlegeart.',
    stufe: 2,
  },
  {
    id: 'wf-sys-04',
    thema: 'sys-schutz-01',
    bereich: 'systementwurf',
    aussage: 'Basisschutz und Fehlerschutz sind zwei getrennte Schutzmaßnahmen.',
    wahr: true,
    begruendung:
      'Der Basisschutz wirkt gegen direktes Berühren, der Fehlerschutz bei indirektem Berühren – sie ergänzen sich.',
    erklaerung: 'Basisschutz und Fehlerschutz sind getrennte Maßnahmen.',
    stufe: 2,
  },
  {
    id: 'wf-sys-05',
    thema: 'sys-schutz-04',
    bereich: 'systementwurf',
    aussage: 'Die Schutzart IPX4 bedeutet Schutz gegen Strahlwasser.',
    wahr: true,
    begruendung:
      'Die zweite Kennziffer 4 steht für Schutz gegen Spritzwasser aus allen Richtungen.',
    erklaerung: 'IPX4: Spritzwasserschutz.',
    stufe: 1,
  },
  {
    id: 'wf-sys-06',
    thema: 'sys-nachhaltigkeit-01',
    bereich: 'systementwurf',
    aussage: 'Rationelle Energieverwendung bedeutet, den Energiebedarf zu senken und Verluste zu vermeiden.',
    wahr: true,
    begruendung:
      'Rationelle Energieverwendung setzt beim Bedarf und bei den Verlusten an, nicht nur bei der Erzeugung.',
    erklaerung: 'Rationelle Energieverwendung: Bedarf senken, Verluste vermeiden.',
    stufe: 1,
  },
  {
    id: 'wf-sys-07',
    thema: 'sys-wirtschaft-01',
    bereich: 'systementwurf',
    aussage: 'Zur Kalkulation gehören Materialkosten, Arbeitszeit und Gemeinkostenzuschlag.',
    wahr: true,
    begruendung:
      'Die Angebotskalkulation setzt sich aus Material, Lohn und Zuschlägen zusammen; der Zuschlag deckt die Gemeinkosten.',
    erklaerung: 'Kalkulation: Material + Lohn + Zuschläge.',
    stufe: 2,
  },

  // --- Funktionsanalyse ----------------------------------------------------
  {
    id: 'wf-fsa-01',
    thema: 'fsa-dokumentation-01',
    bereich: 'funktionsanalyse',
    aussage: 'Zur Auswertung einer Anlage wird zuerst der Stromlaufplan herangezogen.',
    wahr: true,
    begruendung:
      'Der Stromlaufplan erklärt die Funktion; Datenblätter und Klemmenpläne ergänzen das Detail.',
    erklaerung: 'Auswertung beginnt mit dem Stromlaufplan.',
    stufe: 1,
  },
  {
    id: 'wf-fsa-02',
    thema: 'fsa-fehlersuche-02',
    bereich: 'funktionsanalyse',
    aussage: 'Ein Fehler wird durch systematisches Eingrenzen gefunden, nicht durch Probieren.',
    wahr: true,
    begruendung:
      'Die Fehlersuche halbiert den Suchraum schrittweise; Probieren ersetzt keine Diagnose.',
    erklaerung: 'Fehlersuche: systematisch eingrenzen.',
    stufe: 1,
  },
  {
    id: 'wf-fsa-03',
    thema: 'fsa-fehlersuche-05',
    bereich: 'funktionsanalyse',
    aussage: 'Bei der Signalverfolgung wird das Signal vom Sensor zum Aktor verfolgt.',
    wahr: true,
    begruendung:
      'Die Signalverfolgung geht vom Geber über die Verarbeitung bis zum Stellglied und grenzt so die Störstelle ein.',
    erklaerung: 'Signalverfolgung: Geber → Verarbeitung → Stellglied.',
    stufe: 2,
  },
  {
    id: 'wf-fsa-04',
    thema: 'fsa-schutzbewertung-02',
    bereich: 'funktionsanalyse',
    aussage: 'Die Abschaltbedingung ist erfüllt, wenn der Fehlerstrom groß genug ist und der Schleifenwiderstand klein genug.',
    wahr: true,
    begruendung:
      'Nur wenn I_a rechtzeitig erreicht wird, schaltet die Schutzeinrichtung innerhalb der geforderten Zeit ab.',
    erklaerung: 'Abschaltbedingung: Fehlerstrom und Schleifenwiderstand müssen passen.',
    stufe: 2,
  },
  {
    id: 'wf-fsa-05',
    thema: 'fsa-verfahren-06',
    bereich: 'funktionsanalyse',
    aussage: 'Ein Messergebnis ist ohne Angabe der Messunsicherheit vollständig.',
    wahr: false,
    begruendung:
      'Erst mit der Messunsicherheit lässt sich beurteilen, ob ein Grenzwert sicher eingehalten ist.',
    erklaerung: 'Messunsicherheit gehört zum Messergebnis.',
    stufe: 2,
  },
  {
    id: 'wf-fsa-06',
    thema: 'fsa-programme-01',
    bereich: 'funktionsanalyse',
    aussage: 'Vor dem Ändern eines Programms wird dessen Struktur analysiert.',
    wahr: true,
    begruendung:
      'Ohne Kenntnis der Struktur führt jede Änderung zu unvorhersehbaren Nebenwirkungen.',
    erklaerung: 'Programm erst analysieren, dann ändern.',
    stufe: 2,
  },

  // --- Gebäudetechnik ------------------------------------------------------
  {
    id: 'wf-geb-01',
    thema: 'ka-gebaeudetechnik-04',
    bereich: 'kundenauftrag',
    aussage: 'Die Leerlaufspannung eines PV-Strangs ist bei Kälte höher als bei Wärme.',
    wahr: true,
    begruendung:
      'Die Spannung eines Solarmoduls steigt mit sinkender Temperatur – bei der Auslegung wird die Kälte berücksichtigt.',
    erklaerung: 'PV: Leerlaufspannung steigt bei Kälte.',
    stufe: 2,
  },
  {
    id: 'wf-geb-02',
    thema: 'ka-gebaeudetechnik-05',
    bereich: 'kundenauftrag',
    aussage: 'Eine PV-Anlage muss vor der Inbetriebnahme beim Netzbetreiber angemeldet werden.',
    wahr: true,
    begruendung:
      'Netzbetreiber und Marktstammdatenregister verlangen die Anmeldung vor dem Betrieb.',
    erklaerung: 'PV-Anlage anmelden vor Inbetriebnahme.',
    stufe: 1,
  },
  {
    id: 'wf-geb-03',
    thema: 'ka-gebaeudetechnik-03',
    bereich: 'kundenauftrag',
    aussage: 'Die Jahresarbeitszahl einer Wärmepumpe ist immer größer als ihre Leistungszahl.',
    wahr: false,
    begruendung:
      'Die JAZ liegt wegen der Betriebsbedingungen im Jahresmittel unter der COP des Prüfpunkts.',
    erklaerung: 'JAZ liegt typischerweise unter der COP.',
    stufe: 2,
  },
  {
    id: 'wf-geb-04',
    thema: 'ka-gebaeudetechnik-09',
    bereich: 'kundenauftrag',
    aussage: 'Ein Lastmanagement verhindert das gleichzeitige Laden mehrerer Wallboxen mit voller Leistung.',
    wahr: true,
    begruendung:
      'Das Lastmanagement verteilt die verfügbare Leistung und verhindert die Überlastung des Hausanschlusses.',
    erklaerung: 'Lastmanagement: Leistung verteilen statt überlasten.',
    stufe: 2,
  },
  {
    id: 'wf-geb-05',
    thema: 'ka-gebaeudetechnik-11',
    bereich: 'kundenauftrag',
    aussage: 'Sicherheitsbeleuchtung muss auch bei Ausfall des allgemeinen Netzes für eine bestimmte Zeit wirksam bleiben.',
    wahr: true,
    begruendung:
      'Sie dient dem sicheren Verlassen der Rettungswege und ist für eine Mindestdauer auszulegen.',
    erklaerung: 'Sicherheitsbeleuchtung: Rettungswege, Mindestdauer.',
    stufe: 1,
  },
  {
    id: 'wf-geb-06',
    thema: 'ka-gebaeudetechnik-06',
    bereich: 'kundenauftrag',
    aussage: 'Ein Überspannungsschutz wird nur bei Freileitungen benötigt.',
    wahr: false,
    begruendung:
      'Auch bei Erdkabeln können Überspannungen eindringen; der Schutz richtet sich nach dem Schutzkonzept, nicht nur nach der Zuleitung.',
    erklaerung: 'Überspannungsschutz nach Schutzkonzept, nicht nur bei Freileitung.',
    stufe: 2,
  },

  // --- Gebäudesystemtechnik ------------------------------------------------
  {
    id: 'wf-gst-01',
    thema: 'ka-gebaaeudesystemtechnik-01',
    bereich: 'kundenauftrag',
    aussage: 'In einer KNX-Linie darf die Anzahl der Teilnehmer nicht begrenzt sein.',
    wahr: false,
    begruendung:
      'Eine Linie ist in der Teilnehmerzahl und in der Leitungslänge begrenzt; diese Grenzen sichern den Busbetrieb.',
    erklaerung: 'KNX: Teilnehmer- und Längengrenzen einhalten.',
    stufe: 2,
  },
  {
    id: 'wf-gst-02',
    thema: 'ka-gebaaeudesystemtechnik-02',
    bereich: 'kundenauftrag',
    aussage: 'Ein Aktor setzt ein Bussignal in eine Schalthandlung um.',
    wahr: true,
    begruendung: 'Der Aktor empfängt das Signal und schaltet das Betriebsmittel; der Sensor erfasst die Größe.',
    erklaerung: 'Aktor: Signal → Schalthandlung.',
    stufe: 1,
  },
  {
    id: 'wf-gst-03',
    thema: 'ka-gebaaeudesystemtechnik-03',
    bereich: 'kundenauftrag',
    aussage: 'Ein Präsenzmelder erfasst Bewegung, während ein Bewegungsmelder auch ruhende Personen erfasst.',
    wahr: false,
    begruendung:
      'Es ist umgekehrt: Der Präsenzmelder erfasst auch kleinste Bewegungen ruhender Personen, der Bewegungsmelder nur deutliche Bewegungen.',
    erklaerung: 'Präsenzmelder ist empfindlicher als Bewegungsmelder.',
    stufe: 2,
  },
  {
    id: 'wf-gst-04',
    thema: 'ka-gebaaeudesystemtechnik-08',
    bereich: 'kundenauftrag',
    aussage: 'Ein Fernzugriff auf die Gebäudetechnik wird durch starke Passwörter und aktuelle Firmware abgesichert.',
    wahr: true,
    begruendung:
      'Fernzugänge sind Einfallstore; Absicherung erfolgt über Authentifizierung, Updates und getrennte Netze.',
    erklaerung: 'Fernzugriff absichern: Authentifizierung, Updates, Trennung.',
    stufe: 2,
  },
  {
    id: 'wf-gst-05',
    thema: 'ka-gebaaeudesystemtechnik-07',
    bereich: 'kundenauftrag',
    aussage: 'Bildaufzeichnungen in öffentlich zugänglichen Bereichen sind ohne weiteres zulässig.',
    wahr: false,
    begruendung:
      'Videoüberwachung ist nur bei berechtigtem Interesse und unter Beachtung der Datenschutzvorgaben zulässig; öffentliche Bereiche sind besonders streng.',
    erklaerung: 'Videoüberwachung: berechtigtes Interesse und Datenschutz.',
    stufe: 2,
  },

  // --- Antenne -------------------------------------------------------------
  {
    id: 'wf-ant-01',
    thema: 'ka-antenne-01',
    bereich: 'kundenauftrag',
    aussage: 'Eine Antennenanlage wird mit dem Potentialausgleich verbunden.',
    wahr: true,
    begruendung:
      'Der Antennenmast und die Schirmungen werden in den Potentialausgleich einbezogen.',
    erklaerung: 'Antennenanlage: Potentialausgleich.',
    stufe: 1,
  },
  {
    id: 'wf-ant-02',
    thema: 'ka-antenne-03',
    bereich: 'kundenauftrag',
    aussage: 'Koaxkabel dürfen mit demselben Biegeradius wie Installationsleitungen verlegt werden.',
    wahr: false,
    begruendung:
      'Koaxkabel haben einen größeren Mindestbiegeradius; zu enges Biegen verändert den Wellenwiderstand.',
    erklaerung: 'Koax: größerer Biegeradius einhalten.',
    stufe: 2,
  },

  // --- Teil 1 / Grundlagen -------------------------------------------------
  {
    id: 'wf-t1-01',
    thema: 't1-anlagen-01',
    bereich: 'teil1',
    aussage: 'Das Ohmsche Gesetz lautet U = R · I.',
    wahr: true,
    begruendung: 'Spannung ist das Produkt aus Widerstand und Strom.',
    erklaerung: 'U = R · I.',
    stufe: 1,
  },
  {
    id: 'wf-t1-02',
    thema: 't1-anlagen-03',
    bereich: 'teil1',
    aussage: 'In einem symmetrischen Drehstromnetz ist die Außenleiterspannung √3-mal die Strangspannung.',
    wahr: true,
    begruendung: 'Zwischen Außenleitern liegt das √3-fache der Spannung gegen den Neutralleiter.',
    erklaerung: 'Drehstrom: U_LL = √3 · U_Strang.',
    stufe: 2,
  },
  {
    id: 'wf-t1-03',
    thema: 't1-anlagen-04',
    bereich: 'teil1',
    aussage: 'Ein Leistungsfaktor von 1 bedeutet, dass keine Blindleistung übertragen wird.',
    wahr: true,
    begruendung: 'Bei cos φ = 1 ist die Scheinleistung gleich der Wirkleistung; Blindleistung tritt nicht auf.',
    erklaerung: 'cos φ = 1: keine Blindleistung.',
    stufe: 2,
  },
  {
    id: 'wf-t1-04',
    thema: 't1-anlagen-07',
    bereich: 'teil1',
    aussage: 'Drehstrommotoren erzeugen ohne Gegenmaßnahme Störungen, die in das Netz zurückwirken.',
    wahr: true,
    begruendung:
      'Frequenzumrichter und Motoren sind Störquellen; EMV-Filter und geschirmte Leitungen begrenzen die Störungen.',
    erklaerung: 'EMV: Störquellen begrenzen.',
    stufe: 2,
  },

  // --- WiSo ----------------------------------------------------------------
  {
    id: 'wf-wiso-01',
    thema: 'wiso-recht-01',
    bereich: 'wiso',
    aussage: 'Jugendliche dürfen höchstens acht Stunden täglich und 40 Stunden wöchentlich beschäftigt werden.',
    wahr: true,
    begruendung:
      'Das Jugendarbeitsschutzgesetz begrenzt die Arbeitszeit auf acht Stunden täglich und 40 Stunden wöchentlich.',
    erklaerung: 'JArbSchG: 8 Stunden täglich, 40 Stunden wöchentlich.',
    stufe: 1,
  },
  {
    id: 'wf-wiso-02',
    thema: 'wiso-recht-01',
    bereich: 'wiso',
    aussage: 'Nach sechs Stunden Arbeit ist eine Ruhepause von mindestens 60 Minuten vorgeschrieben.',
    wahr: false,
    begruendung:
      'Nach mehr als sechs bis neun Stunden sind 30 Minuten Pause vorgeschrieben, erst bei mehr als neun Stunden 45 Minuten.',
    erklaerung: 'Pausenregelung: 30 Minuten nach sechs bis neun Stunden.',
    stufe: 2,
  },
  {
    id: 'wf-wiso-03',
    thema: 'wiso-beruf-01',
    bereich: 'wiso',
    aussage: 'Die Probezeit im Ausbildungsverhältnis beträgt mindestens einen und höchstens vier Monate.',
    wahr: true,
    begruendung:
      'Das Berufsbildungsgesetz schreibt für die Probezeit einen bis vier Monate vor.',
    erklaerung: 'Probezeit: 1 bis 4 Monate.',
    stufe: 1,
  },
  {
    id: 'wf-wiso-04',
    thema: 'wiso-betrieb-04',
    bereich: 'wiso',
    aussage: 'Der Betriebsrat hat bei personellen Einzelmaßnahmen ein Mitbestimmungsrecht.',
    wahr: true,
    begruendung:
      'Das Betriebsverfassungsgesetz räumt dem Betriebsrat bei Einstellung, Versetzung und Kündigung Beteiligungsrechte ein.',
    erklaerung: 'Betriebsrat: Beteiligung bei personellen Maßnahmen.',
    stufe: 2,
  },
  {
    id: 'wf-wiso-05',
    thema: 'wiso-finanzen-03',
    bereich: 'wiso',
    aussage: 'Die Umsatzsteuer ist für ein Unternehmen ein durchlaufender Posten.',
    wahr: true,
    begruendung:
      'Das Unternehmen zieht die Umsatzsteuer vom Kunden ein und führt sie an das Finanzamt ab; belastet wird der Endverbraucher.',
    erklaerung: 'Umsatzsteuer ist durchlaufend.',
    stufe: 2,
  },
  {
    id: 'wf-wiso-06',
    thema: 'wiso-finanzen-04',
    bereich: 'wiso',
    aussage: 'Die gesetzliche Unfallversicherung wird allein von den Beschäftigten getragen.',
    wahr: false,
    begruendung:
      'Die Beiträge zur gesetzlichen Unfallversicherung trägt allein der Arbeitgeber.',
    erklaerung: 'Unfallversicherung: Beitrag allein vom Arbeitgeber.',
    stufe: 2,
  },
  {
    id: 'wf-wiso-07',
    thema: 'wiso-umwelt-02',
    bereich: 'wiso',
    aussage: 'Elektroaltgeräte dürfen nicht über den Restmüll entsorgt werden.',
    wahr: true,
    begruendung:
      'Elektro- und Elektronikaltgeräte sind getrennt zu sammeln und fachgerecht zu entsorgen.',
    erklaerung: 'Elektroaltgeräte getrennt sammeln.',
    stufe: 1,
  },
  {
    id: 'wf-wiso-08',
    thema: 'wiso-digital-02',
    bereich: 'wiso',
    aussage: 'Ein Passwort sollte aus Namen und Geburtsdatum bestehen, damit man es sich merken kann.',
    wahr: false,
    begruendung:
      'Solche Angaben sind leicht zu erraten. Sicher sind lange Passphrasen oder Passwortmanager mit Mehrfaktor-Anmeldung.',
    erklaerung: 'Sichere Passwörter: lang, einzigartig, Mehrfaktor.',
    stufe: 1,
  },
  {
    id: 'wf-wiso-09',
    thema: 'wiso-beruf-02',
    bereich: 'wiso',
    aussage: 'Am Ende der Ausbildung erhält die Auszubildende ein Zeugnis über die erworbenen Fertigkeiten.',
    wahr: true,
    begruendung:
      'Der Ausbildende stellt bei Beendigung ein Zeugnis aus, das Art, Dauer und erworbene Fertigkeiten nennt.',
    erklaerung: 'Ausbildungszeugnis bei Beendigung.',
    stufe: 1,
  },
  {
    id: 'wf-wiso-10',
    thema: 'wiso-betrieb-03',
    bereich: 'wiso',
    aussage: 'Ein Tarifvertrag gilt unmittelbar für alle Beschäftigten, auch ohne Gewerkschaftsmitgliedschaft.',
    wahr: false,
    begruendung:
      'Der Tarifvertrag gilt für die Mitglieder der Tarifparteien; die allgemeinverbindliche Erklärung ist der Sonderfall.',
    erklaerung: 'Tarifvertrag: Bindung über Mitgliedschaft.',
    stufe: 3,
  },
  // --- Planung, Dokumentation, Schnittstellen, Varianten ----------------
  {
    id: 'wf-plan2-01',
    thema: 'ka-planung-01',
    bereich: 'kundenauftrag',
    aussage: 'Eine Teilaufgabe wird erst festgelegt, nachdem der Arbeitsablauf im Detail geplant ist.',
    wahr: false,
    begruendung:
      'Erst wird der Auftrag in Teilaufgaben zerlegt, dann deren Ablauf geplant. Umgekehrt fehlte die Bezugsgröße.',
    erklaerung: 'Planung: erst Teilaufgaben, dann Ablauf.',
    stufe: 1,
  },
  {
    id: 'wf-plan2-02',
    thema: 'ka-planung-04',
    bereich: 'kundenauftrag',
    aussage: 'Der Materialbedarf wird aus den Planungsunterlagen und dem Aufmaß ermittelt.',
    wahr: true,
    begruendung:
      'Ohne Aufmaß und Plan lässt sich kein belastbarer Bedarf bestimmen; Zuschläge für Verschnitt kommen hinzu.',
    erklaerung: 'Materialbedarf aus Aufmaß und Plan.',
    stufe: 1,
  },
  {
    id: 'wf-plan2-03',
    thema: 'ka-planung-07',
    bereich: 'kundenauftrag',
    aussage: 'Eine Terminabweichung wird erst bei der Abnahme mitgeteilt.',
    wahr: false,
    begruendung:
      'Abweichungen werden unverzüglich gemeldet, damit der Termin noch korrigiert werden kann.',
    erklaerung: 'Abweichung sofort melden.',
    stufe: 2,
  },
  {
    id: 'wf-dok2-01',
    thema: 'ka-dokumentation-01',
    bereich: 'kundenauftrag',
    aussage: 'Der Arbeitsbericht hält Tätigkeiten, Zeiten und verwendetes Material fest.',
    wahr: true,
    begruendung: 'Der Bericht belegt die erbrachte Leistung und dient der Nachkalkulation.',
    erklaerung: 'Arbeitsbericht: Tätigkeit, Zeit, Material.',
    stufe: 1,
  },
  {
    id: 'wf-dok2-02',
    thema: 'ka-dokumentation-03',
    bereich: 'kundenauftrag',
    aussage: 'Eine Normstelle wird im Bericht mit Ausgabe und Fundstelle zitiert.',
    wahr: true,
    begruendung:
      'Ohne Ausgabestand ist eine Normstelle nicht nachprüfbar; sie ändert sich mit jeder Ausgabe.',
    erklaerung: 'Normzitat mit Ausgabe und Fundstelle.',
    stufe: 2,
  },
  {
    id: 'wf-dok2-03',
    thema: 'ka-dokumentation-05',
    bereich: 'kundenauftrag',
    aussage: 'Prüfprotokolle müssen so archiviert werden, dass sie später nachweisbar sind.',
    wahr: true,
    begruendung:
      'Prüfprotokolle sind Nachweise gegenüber Kunde und Aufsicht; sie müssen auffindbar und unverändert bleiben.',
    erklaerung: 'Protokolle nachweisbar archivieren.',
    stufe: 1,
  },
  {
    id: 'wf-dok2-04',
    thema: 'sys-dokumentation-01',
    bereich: 'systementwurf',
    aussage: 'Zur Entwurfsdokumentation gehören Berechnungen, Pläne und die Begründung der Variantenwahl.',
    wahr: true,
    begruendung:
      'Der Entwurf ist nur nachvollziehbar, wenn Auswahl und Berechnung dokumentiert sind.',
    erklaerung: 'Entwurfsdokumentation: Berechnung, Plan, Begründung.',
    stufe: 2,
  },
  {
    id: 'wf-dok2-05',
    thema: 'sys-dokumentation-03',
    bereich: 'systementwurf',
    aussage: 'Bei der Übergabe werden Anlagendokumentation und Prüfprotokoll übergeben.',
    wahr: true,
    begruendung:
      'Der Betreiber braucht Unterlagen und Nachweise, um die Anlage sicher zu betreiben.',
    erklaerung: 'Übergabe: Dokumentation und Prüfprotokoll.',
    stufe: 1,
  },
  {
    id: 'wf-schn2-01',
    thema: 'fsa-schnittstellen-01',
    bereich: 'funktionsanalyse',
    aussage: 'Ein analoges Signal ist stufenlos, ein digitales kennt nur zwei Zustände.',
    wahr: true,
    begruendung: 'Analogsignale tragen einen Wertebereich, Digitalsignale die Zustände 0 und 1.',
    erklaerung: 'Analog stufenlos, digital zweiwertig.',
    stufe: 1,
  },
  {
    id: 'wf-schn2-02',
    thema: 'fsa-schnittstellen-03',
    bereich: 'funktionsanalyse',
    aussage: 'Bei der Anbindung an ein übergeordnetes System müssen die Datenpunkte abgeglichen werden.',
    wahr: true,
    begruendung:
      'Nur wenn Adressen, Datentypen und Skalierung beider Seiten übereinstimmen, kommen Werte richtig an.',
    erklaerung: 'Schnittstelle: Datenpunkte abgleichen.',
    stufe: 2,
  },
  {
    id: 'wf-schn2-03',
    thema: 'fsa-schnittstellen-05',
    bereich: 'funktionsanalyse',
    aussage: 'Die Wartungsschnittstelle ist im Normalbetrieb offen zugänglich.',
    wahr: false,
    begruendung:
      'Wartungsschnittstellen werden im Normalbetrieb gesperrt oder abgeschaltet, um unbefugten Zugriff zu verhindern.',
    erklaerung: 'Wartungsschnittstelle im Betrieb sperren.',
    stufe: 2,
  },
  {
    id: 'wf-vari2-01',
    thema: 'sys-varianten-01',
    bereich: 'systementwurf',
    aussage: 'Beim Variantenvergleich werden technische, wirtschaftliche und ökologische Kriterien getrennt bewertet und dann abgewogen.',
    wahr: true,
    begruendung:
      'Eine Vermischung der Kriterien macht den Vergleich beliebig; die Gewichtung erfolgt am Ende.',
    erklaerung: 'Variantenvergleich: Kriterien getrennt, dann gewichten.',
    stufe: 2,
  },
  {
    id: 'wf-vari2-02',
    thema: 'sys-varianten-06',
    bereich: 'systementwurf',
    aussage: 'Die gewählte Variante wird mit den Anforderungen des Kunden begründet, nicht mit dem Preis allein.',
    wahr: true,
    begruendung:
      'Die Begründung muss den Nutzen für den Kunden zeigen; der Preis ist nur ein Kriterium.',
    erklaerung: 'Variantenwahl an den Anforderungen begründen.',
    stufe: 2,
  },
  {
    id: 'wf-spez2-01',
    thema: 'sys-spezifikation-02',
    bereich: 'systementwurf',
    aussage: 'Betriebsmittel werden nach ihren Kennwerten und dem Einsatzort ausgewählt.',
    wahr: true,
    begruendung: 'Nennspannung, Nennstrom und Schutzart müssen zur Anlage und zum Umfeld passen.',
    erklaerung: 'Betriebsmittel: Kennwerte und Einsatzort.',
    stufe: 1,
  },
  {
    id: 'wf-spez2-02',
    thema: 'sys-spezifikation-06',
    bereich: 'systementwurf',
    aussage: 'Herstellerangaben dürfen ungeprüft in die eigene Spezifikation übernommen werden.',
    wahr: false,
    begruendung:
      'Herstellerangaben gelten für definierte Bedingungen; ob sie für die eigene Anlage zutreffen, ist zu prüfen.',
    erklaerung: 'Herstellerangaben auf Übertragbarkeit prüfen.',
    stufe: 2,
  },
  {
    id: 'wf-nach2-01',
    thema: 'sys-nachhaltigkeit-03',
    bereich: 'systementwurf',
    aussage: 'Bei der Komponentenwahl werden auch Lebensdauer, Reparierbarkeit und Rücknahme berücksichtigt.',
    wahr: true,
    begruendung: 'Nachhaltigkeit zeigt sich über den Lebenszyklus, nicht nur im Betrieb.',
    erklaerung: 'Nachhaltige Komponentenwahl über den Lebenszyklus.',
    stufe: 2,
  },
  {
    id: 'wf-nach2-02',
    thema: 'sys-nachhaltigkeit-05',
    bereich: 'systementwurf',
    aussage: 'Informationssicherheit betrifft nur die Büro-IT, nicht die Gebäudetechnik.',
    wahr: false,
    begruendung:
      'Auch die Gebäudeautomation ist ein IT-System; Fernzugänge und Netzwerkkomponenten sind angreifbar.',
    erklaerung: 'Informationssicherheit umfasst die Gebäudetechnik.',
    stufe: 2,
  },
  {
    id: 'wf-wirt2-01',
    thema: 'sys-wirtschaft-02',
    bereich: 'systementwurf',
    aussage: 'Zu den Kosten der erbrachten Leistung gehören Material, Lohn und Gemeinkostenanteil.',
    wahr: true,
    begruendung: 'Die Selbstkosten setzen sich aus Einzel- und Gemeinkosten zusammen.',
    erklaerung: 'Kosten: Material, Lohn, Gemeinkosten.',
    stufe: 2,
  },
  {
    id: 'wf-wirt2-02',
    thema: 'sys-wirtschaft-04',
    bereich: 'systementwurf',
    aussage: 'Qualitätssicherung wird erst am Ende der Montage durchgeführt.',
    wahr: false,
    begruendung:
      'Qualitätssicherung begleitet jeden Abschnitt; am Ende sind Mängel nur noch teuer zu beheben.',
    erklaerung: 'Qualitätssicherung begleitend, nicht am Ende.',
    stufe: 2,
  },
  {
    id: 'wf-umw2-01',
    thema: 'wiso-umwelt-04',
    bereich: 'wiso',
    aussage: 'Der ökologische Fußabdruck eines Betriebs hängt auch vom Energieverbrauch und der Mobilität ab.',
    wahr: true,
    begruendung:
      'Energie, Material und Mobilität sind die wesentlichen Größen der betrieblichen Umweltbilanz.',
    erklaerung: 'Umweltbilanz: Energie, Material, Mobilität.',
    stufe: 2,
  },
  {
    id: 'wf-dig2-01',
    thema: 'wiso-digital-01',
    bereich: 'wiso',
    aussage: 'Daten sind in der digitalisierten Arbeitswelt ein Wirtschaftsgut.',
    wahr: true,
    begruendung: 'Daten haben Wert und unterliegen Schutz- und Nutzungsregeln.',
    erklaerung: 'Daten als Wirtschaftsgut.',
    stufe: 1,
  },
  {
    id: 'wf-dig2-02',
    thema: 'wiso-digital-04',
    bereich: 'wiso',
    aussage: 'Bei der Arbeit im Homeoffice gelten dieselben Datenschutzregeln wie im Betrieb.',
    wahr: true,
    begruendung:
      'Der Arbeitsort ändert nichts an den Pflichten aus Datenschutz und Vertraulichkeit.',
    erklaerung: 'Datenschutz gilt unabhängig vom Arbeitsort.',
    stufe: 1,
  },
  {
    id: 'wf-fsa2-01',
    thema: 'fsa-verfahren-04',
    bereich: 'funktionsanalyse',
    aussage: 'Die Messeinrichtung wird vor der Messung auf ihre Funktion geprüft.',
    wahr: true,
    begruendung:
      'Ein ungeprüftes Messgerät kann ein falsches Ergebnis liefern und die Diagnose in die Irre führen.',
    erklaerung: 'Messgerät vor der Messung prüfen.',
    stufe: 1,
  },
  {
    id: 'wf-fsa2-02',
    thema: 'fsa-programme-04',
    bereich: 'funktionsanalyse',
    aussage: 'Ein geändertes Programm wird mit einer definierten Prüfliste getestet.',
    wahr: true,
    begruendung:
      'Nur ein wiederholbarer Test zeigt, dass die Änderung wirkt und nichts anderes beschädigt hat.',
    erklaerung: 'Programmänderung mit Prüfliste testen.',
    stufe: 2,
  },
  {
    id: 'wf-fsa2-03',
    thema: 'fsa-dokumentation-04',
    bereich: 'funktionsanalyse',
    aussage: 'Die Betriebsanleitung nennt auch Wartungsintervalle und zulässige Betriebsgrenzen.',
    wahr: true,
    begruendung:
      'Beides gehört zur bestimmungsgemäßen Nutzung und ist für die Instandhaltung maßgeblich.',
    erklaerung: 'Betriebsanleitung: Wartung und Betriebsgrenzen.',
    stufe: 1,
  },
];

// ===========================================================================
// Zuordnung
// ===========================================================================

export const ZUORD_FRAGEN: ZuordFrage[] = [
  {
    id: 'zu-vert-01',
    thema: 'ka-verteilung-03',
    bereich: 'kundenauftrag',
    frage: 'Ordnen Sie jeder Kennlinie ihren typischen Einsatz zu.',
    paare: [
      ['Kennlinie B', 'Stromkreise mit geringem Einschaltstrom, z. B. Beleuchtung'],
      ['Kennlinie C', 'Stromkreise mit höherem Einschaltstrom, z. B. Motoren'],
      ['Kennlinie D', 'Stromkreise mit sehr hohem Einschaltstrom, z. B. Transformatoren'],
    ],
    begruendung:
      'Die Kennlinie beschreibt den Bereich der magnetischen Auslösung: B 3–5 · In, C 5–10 · In, D 10–20 · In.',
    erklaerung: 'Kennlinie nach Einschaltstrom des Verbrauchers wählen.',
    stufe: 2,
  },
  {
    id: 'zu-mess-01',
    thema: 'ka-messen-01',
    bereich: 'kundenauftrag',
    frage: 'Ordnen Sie jeder Messaufgabe das passende Messgerät zu.',
    paare: [
      ['Spannungsfreiheit feststellen', 'Zweipoliger Spannungsprüfer'],
      ['Isolationswiderstand messen', 'Isolationsmessgerät'],
      ['Schleifenwiderstand messen', 'Schleifenimpedanz-Messgerät'],
      ['Durchgang prüfen', 'Durchgangsprüfer'],
    ],
    begruendung:
      'Jede Messaufgabe verlangt ein Gerät mit der passenden Prüfspannung bzw. dem passenden Prüfstrom.',
    erklaerung: 'Messgerät richtet sich nach der Messaufgabe.',
    stufe: 2,
  },
  {
    id: 'zu-pruef-01',
    thema: 'ka-pruefung-01',
    bereich: 'kundenauftrag',
    frage: 'Ordnen Sie den drei Schritten der Erstprüfung ihre Tätigkeit zu.',
    paare: [
      ['Besichtigen', 'Sichtprüfung auf Mängel und Vollständigkeit'],
      ['Erproben', 'Funktionsprüfung der Betriebsmittel'],
      ['Messen', 'Prüfung von Schutzleiter, Isolation und Schleife'],
    ],
    begruendung:
      'DIN VDE 0100-600 gliedert die Erstprüfung in Besichtigen, Erproben und Messen.',
    erklaerung: 'Erstprüfung: Besichtigen, Erproben, Messen.',
    stufe: 1,
  },
  {
    id: 'zu-schutz-01',
    thema: 'sys-schutz-04',
    bereich: 'systementwurf',
    frage: 'Ordnen Sie jeder Schutzart ihren Schutzumfang zu.',
    paare: [
      ['IP20', 'Schutz gegen feste Fremdkörper ab 12,5 mm'],
      ['IP44', 'Schutz gegen Spritzwasser'],
      ['IP54', 'Schutz gegen Staub und Spritzwasser'],
      ['IP65', 'Schutz gegen Staub und Strahlwasser'],
    ],
    begruendung:
      'Die erste Kennziffer beschreibt den Fremdkörper- und Berührungsschutz, die zweite den Wasserschutz.',
    erklaerung: 'IP-Schutzart: erste Ziffer Festkörper, zweite Ziffer Wasser.',
    stufe: 2,
  },
  {
    id: 'zu-schutz-02',
    thema: 'fsa-schutzbewertung-01',
    bereich: 'funktionsanalyse',
    frage: 'Ordnen Sie jeder Schutzmaßnahme ihre Wirkung zu.',
    paare: [
      ['Basisschutz', 'Schutz gegen direktes Berühren aktiver Teile'],
      ['Fehlerschutz', 'Schutz bei indirektem Berühren über den Schutzleiter'],
      ['Zusätzlicher Schutz', 'RCD ≤ 30 mA als Ergänzung'],
      ['Isolationsüberwachung', 'Abschaltung bei Isolationsfehler im IT-Netz'],
    ],
    begruendung:
      'Die Maßnahmen greifen auf unterschiedlichen Ebenen und ergänzen sich.',
    erklaerung: 'Schutzmaßnahmen nach Wirkebene unterscheiden.',
    stufe: 2,
  },
  {
    id: 'zu-geb-01',
    thema: 'ka-gebaeudetechnik-06',
    bereich: 'kundenauftrag',
    frage: 'Ordnen Sie jedem Überspannungsschutz-Typ seinen Einbauort zu.',
    paare: [
      ['Typ 1', 'Hauptverteilung bei Freileitungseinspeisung'],
      ['Typ 2', 'Unterverteilung im Gebäude'],
      ['Typ 3', 'Endstromkreis am Gerät'],
    ],
    begruendung:
      'Das Schutzkonzept ist gestuft: Grobschutz, Mittelschutz, Feinschutz.',
    erklaerung: 'Überspannungsschutz gestuft: Typ 1, 2, 3.',
    stufe: 3,
  },
  {
    id: 'zu-gst-01',
    thema: 'ka-gebaaeudesystemtechnik-02',
    bereich: 'kundenauftrag',
    frage: 'Ordnen Sie jedem Gerät seine Rolle im Bussystem zu.',
    paare: [
      ['Präsenzmelder', 'Sensor'],
      ['Schaltaktor', 'Aktor'],
      ['Spannungsversorgung', 'Versorgung der Buslinie'],
      ['Linienkoppler', 'Verbindung zweier Linien'],
    ],
    begruendung:
      'Sensor erfasst, Aktor handelt, Versorgung speist, Koppler verbindet.',
    erklaerung: 'Rollen im Bussystem unterscheiden.',
    stufe: 2,
  },
  {
    id: 'zu-verl-01',
    thema: 'ka-verlegung-01',
    bereich: 'kundenauftrag',
    frage: 'Ordnen Sie jedem Leitungsmerkmal seine Bedeutung zu.',
    paare: [
      ['NYM-J', 'Mantelleitung mit Schutzleiter'],
      ['NYY-J', 'Erdkabel mit verstärktem Mantel'],
      ['H05VV-F', 'Flexible Leitung für Handgeräte'],
      ['N2XH', 'Halogenfreie Leitung für Fluchtwege'],
    ],
    begruendung:
      'Die Typenbezeichnung nennt Aufbau, Mantel und Einsatzbereich der Leitung.',
    erklaerung: 'Leitungstypen nach Aufbau und Einsatz.',
    stufe: 3,
  },
  {
    id: 'zu-t1-01',
    thema: 't1-anlagen-04',
    bereich: 'teil1',
    frage: 'Ordnen Sie jeder Leistungsart ihre Formel zu.',
    paare: [
      ['Wirkleistung', 'P = U · I · cos φ'],
      ['Scheinleistung', 'S = U · I'],
      ['Blindleistung', 'Q = U · I · sin φ'],
    ],
    begruendung:
      'Wirk-, Schein- und Blindleistung bilden ein rechtwinkliges Dreieck.',
    erklaerung: 'Leistungsdreieck: P, S, Q.',
    stufe: 3,
  },
  {
    id: 'zu-ibn-01',
    thema: 'ka-inbetriebnahme-04',
    bereich: 'kundenauftrag',
    frage: 'Ordnen Sie jedem Fehlerbild die wahrscheinliche Ursache zu.',
    paare: [
      ['RCD löst sofort aus', 'Isolationsfehler oder falsche Verdrahtung'],
      ['LS löst bei Einschalten aus', 'Kurzschluss im Stromkreis'],
      ['Spannung bricht unter Last ein', 'Zu hoher Leitungswiderstand'],
      ['Motor läuft nicht an', 'Fehlende Phase oder Anlaufstrom zu hoch'],
    ],
    begruendung:
      'Jedes Fehlerbild hat ein enges Feld typischer Ursachen; die Messung bestätigt die vermutete.',
    erklaerung: 'Fehlerbild und Ursache zusammenführen.',
    stufe: 3,
  },
  {
    id: 'zu-plan2-01',
    thema: 'ka-planung-02',
    bereich: 'kundenauftrag',
    frage: 'Ordnen Sie jedem Planungsschritt sein Ergebnis zu.',
    paare: [
      ['Auftrag zerlegen', 'Liste der Teilaufgaben'],
      ['Ablauf planen', 'Reihenfolge und Dauer der Arbeitsschritte'],
      ['Material ermitteln', 'Bestellliste mit Mengen'],
      ['Termin festlegen', 'Meilensteine und Endtermin'],
    ],
    begruendung:
      'Jeder Schritt liefert die Grundlage des nächsten – vom Zerlegen über den Ablauf zur Beschaffung und zum Termin.',
    erklaerung: 'Planung liefert Teilaufgaben, Ablauf, Material und Termin.',
    stufe: 2,
  },
  {
    id: 'zu-dok2-01',
    thema: 'ka-dokumentation-02',
    bereich: 'kundenauftrag',
    frage: 'Ordnen Sie jedem Dokument seinen Zweck zu.',
    paare: [
      ['Stromlaufplan', 'Funktion der Anlage'],
      ['Klemmenliste', 'Zuordnung der Anschlüsse'],
      ['Prüfprotokoll', 'Nachweis der Prüfung'],
      ['Betriebsanleitung', 'Bedienung und Wartung'],
    ],
    begruendung:
      'Jedes Dokument beantwortet eine andere Frage; zusammen bilden sie die Anlagendokumentation.',
    erklaerung: 'Dokumente und ihre Zwecke.',
    stufe: 2,
  },
  {
    id: 'zu-schn2-01',
    thema: 'fsa-schnittstellen-01',
    bereich: 'funktionsanalyse',
    frage: 'Ordnen Sie jedem Signaltyp ein Beispiel zu.',
    paare: [
      ['Analoges Signal', 'Temperatur als 0–10 V'],
      ['Digitales Signal', 'Meldung Pumpe läuft als 1/0'],
      ['Bussignal', 'Raumtemperatur als Telegramm'],
      ['Impulssignal', 'Zählerimpuls des Energiezählers'],
    ],
    begruendung: 'Signaltypen unterscheiden sich in Wertebereich und Übertragungsart.',
    erklaerung: 'Signaltypen mit Beispielen.',
    stufe: 2,
  },
  {
    id: 'zu-nach2-01',
    thema: 'sys-nachhaltigkeit-02',
    bereich: 'systementwurf',
    frage: 'Ordnen Sie jeder Kennzahl ihre Aussage zu.',
    paare: [
      ['Primärenergiefaktor', 'Aufwand der Energiebereitstellung'],
      ['Jahresarbeitszahl', 'Effizienz über das Jahr'],
      ['Leistungszahl', 'Effizienz im Prüfpunkt'],
      ['Endenergiebedarf', 'Verbrauch am Gebäude'],
    ],
    begruendung: 'Die Kennzahlen beziehen sich auf unterschiedliche Grenzen des Systems.',
    erklaerung: 'Energiekennzahlen und ihre Systemgrenze.',
    stufe: 3,
  },
  {
    id: 'zu-umw2-01',
    thema: 'wiso-umwelt-02',
    bereich: 'wiso',
    frage: 'Ordnen Sie jedem Abfall die richtige Entsorgung zu.',
    paare: [
      ['Elektroaltgerät', 'Rücknahme über Sammelstelle'],
      ['Leuchtstofflampe', 'Getrennte Sammlung als Gefahrstoff'],
      ['Kupferkabelrest', 'Verwertung als Metallschrott'],
      ['Verpackungskarton', 'Papiertonne'],
    ],
    begruendung: 'Die Entsorgung richtet sich nach Werkstoff und Gefährdungspotenzial.',
    erklaerung: 'Abfälle nach Stoff und Gefahr trennen.',
    stufe: 2,
  },
  {
    id: 'zu-vari2-01',
    thema: 'sys-varianten-02',
    bereich: 'systementwurf',
    frage: 'Ordnen Sie jedem Bewertungskriterium die passende Größe zu.',
    paare: [
      ['Investition', 'Anschaffungskosten'],
      ['Betriebskosten', 'Energie und Wartung pro Jahr'],
      ['Amortisationszeit', 'Dauer bis zum Kostengleichstand'],
      ['Restwert', 'Wert am Ende der Nutzung'],
    ],
    begruendung:
      'Wirtschaftlichkeit ist das Zusammenspiel von Investition, Betrieb und Nutzungsdauer.',
    erklaerung: 'Wirtschaftliche Bewertungskriterien.',
    stufe: 3,
  },
  {
    id: 'zu-wirt2-01',
    thema: 'sys-wirtschaft-05',
    bereich: 'systementwurf',
    frage: 'Ordnen Sie jedem Soll-Ist-Vergleich seine Abweichung zu.',
    paare: [
      ['Ist-Zeit größer als Soll-Zeit', 'Terminabweichung'],
      ['Ist-Kosten größer als Soll-Kosten', 'Kostenüberschreitung'],
      ['Ist-Qualität unter Soll-Qualität', 'Qualitätsmangel'],
      ['Ist-Menge größer als Soll-Menge', 'Materialmehrverbrauch'],
    ],
    begruendung:
      'Der Vergleich trennt die Abweichungsarten, damit die Gegenmaßnahme passt.',
    erklaerung: 'Soll-Ist-Vergleich: Zeit, Kosten, Qualität, Menge.',
    stufe: 3,
  },
];

// ===========================================================================
// Reihenfolge
// ===========================================================================

export const REIHENFOLGE_FRAGEN: ReihenfolgeFrage[] = [
  {
    id: 're-sich-01',
    thema: 'ka-sicherheit-01',
    bereich: 'kundenauftrag',
    frage: 'Bringen Sie die fünf Sicherheitsregeln in die richtige Reihenfolge.',
    schritte: [
      'Freischalten',
      'Gegen Wiedereinschalten sichern',
      'Spannungsfreiheit feststellen',
      'Erden und Kurzschließen',
      'Benachbarte, unter Spannung stehende Teile abdecken oder abschranken',
    ],
    begruendung:
      'Die Reihenfolge ist zwingend: Jeder Schritt setzt den vorigen voraus.',
    erklaerung: 'Die fünf Sicherheitsregeln in fester Reihenfolge.',
    stufe: 1,
  },
  {
    id: 're-pruef-01',
    thema: 'ka-pruefung-01',
    bereich: 'kundenauftrag',
    frage: 'Bringen Sie die Schritte der Erstprüfung in die richtige Reihenfolge.',
    schritte: [
      'Besichtigen',
      'Erproben',
      'Messen',
      'Prüfprotokoll erstellen',
    ],
    begruendung:
      'Zuerst der sichtbare Zustand, dann die Funktion, dann die Messung – zum Schluss die Dokumentation.',
    erklaerung: 'Erstprüfung: Besichtigen, Erproben, Messen, Dokumentieren.',
    stufe: 1,
  },
  {
    id: 're-mess-01',
    thema: 'ka-pruefung-04',
    bereich: 'kundenauftrag',
    frage: 'Bringen Sie die Messungen der Schutzprüfung in die übliche Reihenfolge.',
    schritte: [
      'Schutzleiterdurchgang prüfen',
      'Isolationswiderstand messen',
      'Schleifenwiderstand messen',
      'Funktion der RCD prüfen',
    ],
    begruendung:
      'Erst die niederohmige Durchgangsmessung, dann die Isolation, dann Schleife und Schutzeinrichtungen.',
    erklaerung: 'Reihenfolge der Schutzprüfungen.',
    stufe: 2,
  },
  {
    id: 're-fehler-01',
    thema: 'fsa-fehlersuche-01',
    bereich: 'funktionsanalyse',
    frage: 'Bringen Sie die Schritte der systematischen Fehlersuche in die richtige Reihenfolge.',
    schritte: [
      'Fehlerbild aufnehmen und beschreiben',
      'Anlagezustand mit der Dokumentation vergleichen',
      'Fehlerbereich eingrenzen',
      'Fehlerursache durch Messung bestätigen',
      'Fehler beheben und Funktion prüfen',
    ],
    begruendung:
      'Die Fehlersuche schreitet vom Symptom über die Eingrenzung zur bestätigten Ursache.',
    erklaerung: 'Fehlersuche: Symptom, Eingrenzung, Bestätigung, Behebung.',
    stufe: 2,
  },
  {
    id: 're-ibn-01',
    thema: 'ka-inbetriebnahme-01',
    bereich: 'kundenauftrag',
    frage: 'Bringen Sie die Inbetriebnahme einer Anlage in die richtige Reihenfolge.',
    schritte: [
      'Sichtprüfung der Anlage',
      'Schutzmaßnahmen prüfen',
      'Betriebswerte einstellen',
      'Funktionskontrolle durchführen',
      'Kunden einweisen und übergeben',
    ],
    begruendung:
      'Erst wenn die Anlage sicher und geprüft ist, wird sie in Betrieb genommen und übergeben.',
    erklaerung: 'Inbetriebnahme: prüfen, einstellen, kontrollieren, übergeben.',
    stufe: 2,
  },
  {
    id: 're-sys-01',
    thema: 'sys-analyse-01',
    bereich: 'systementwurf',
    frage: 'Bringen Sie den Ablauf eines Systementwurfs in die richtige Reihenfolge.',
    schritte: [
      'Ausgangslage und Anforderungen aufnehmen',
      'Lösungsvarianten entwickeln',
      'Varianten bewerten und auswählen',
      'Anlage spezifizieren und Komponenten auswählen',
      'Entwurf dokumentieren und übergeben',
    ],
    begruendung:
      'Vom Verstehen über das Abwägen zur Festlegung und Dokumentation.',
    erklaerung: 'Systementwurf: analysieren, entwerfen, auswählen, dokumentieren.',
    stufe: 2,
  },
  {
    id: 're-verl-01',
    thema: 'ka-verlegung-04',
    bereich: 'kundenauftrag',
    frage: 'Bringen Sie die Arbeitsschritte beim Anschluss einer Ader an eine Klemme in die richtige Reihenfolge.',
    schritte: [
      'Leitung auf Länge zuschneiden',
      'Mantel und Isolierung abisolieren',
      'Aderendhülse aufbringen',
      'Ader in die Klemme einführen',
      'Festen Sitz prüfen',
    ],
    begruendung:
      'Jeder Schritt bereitet den nächsten vor; die Sitzprüfung schließt den Anschluss ab.',
    erklaerung: 'Aderanschluss: zuschneiden, abisolieren, hülsen, einführen, prüfen.',
    stufe: 1,
  },
  {
    id: 're-iso-01',
    thema: 'ka-messen-04',
    bereich: 'kundenauftrag',
    frage: 'Bringen Sie die Isolationsmessung in die richtige Reihenfolge.',
    schritte: [
      'Anlage spannungsfrei schalten und sichern',
      'Verbraucher abklemmen',
      'Messgerät auf die Prüfspannung einstellen',
      'Messung zwischen Außenleiter und Schutzleiter durchführen',
      'Messwert beurteilen und protokollieren',
    ],
    begruendung:
      'Isolationsmessung erfolgt spannungsfrei und ohne angeschlossene Verbraucher.',
    erklaerung: 'Isolationsmessung: freischalten, abklemmen, messen, beurteilen.',
    stufe: 2,
  },
  {
    id: 're-plan2-01',
    thema: 'ka-planung-02',
    bereich: 'kundenauftrag',
    frage: 'Bringen Sie die Auftragsplanung in die richtige Reihenfolge.',
    schritte: [
      'Auftrag in Teilaufgaben zerlegen',
      'Arbeitsablauf und Reihenfolge festlegen',
      'Material- und Werkzeugbedarf ermitteln',
      'Termine planen',
      'Aufwand kalkulieren',
    ],
    begruendung:
      'Erst die Zerlegung, dann Ablauf, Bedarf und Termin – die Kalkulation schließt ab.',
    erklaerung: 'Auftragsplanung: zerlegen, ablaufen, beschaffen, terminieren, kalkulieren.',
    stufe: 2,
  },
  {
    id: 're-dok2-01',
    thema: 'ka-dokumentation-01',
    bereich: 'kundenauftrag',
    frage: 'Bringen Sie das Schreiben eines Arbeitsberichts in die richtige Reihenfolge.',
    schritte: [
      'Tätigkeiten und Zeiten sammeln',
      'Verwendetes Material auflisten',
      'Abweichungen vom Plan festhalten',
      'Bericht verfassen',
      'Bericht prüfen und ablegen',
    ],
    begruendung: 'Der Bericht entsteht aus den Aufzeichnungen; die Prüfung schließt ihn ab.',
    erklaerung: 'Arbeitsbericht: sammeln, auflisten, festhalten, verfassen, prüfen.',
    stufe: 2,
  },
  {
    id: 're-schn2-01',
    thema: 'fsa-schnittstellen-03',
    bereich: 'funktionsanalyse',
    frage: 'Bringen Sie die Anbindung eines Datenpunkts an ein übergeordnetes System in die richtige Reihenfolge.',
    schritte: [
      'Datenpunkt in der Unterstation festlegen',
      'Adresse und Datentyp festlegen',
      'Verbindung zum übergeordneten System aufbauen',
      'Wert auf beiden Seiten vergleichen',
      'Anzeige und Alarmierung prüfen',
    ],
    begruendung: 'Ohne Abgleich von Adresse und Wert bleibt die Anbindung unzuverlässig.',
    erklaerung: 'Schnittstelle: festlegen, adressieren, verbinden, abgleichen, prüfen.',
    stufe: 3,
  },
];

// ===========================================================================
// Lückentext
// ===========================================================================

export const LUECK_FRAGEN: LueckFrage[] = [
  {
    id: 'lu-sich-01',
    thema: 'ka-sicherheit-02',
    bereich: 'kundenauftrag',
    text: 'Die erste Sicherheitsregel lautet ___. Danach wird gegen ___ gesichert.',
    loesungen: [
      { loesung: 'Freischalten', alternativen: ['freischalten'] },
      { loesung: 'Wiedereinschalten' },
    ],
    begruendung: 'Freischalten steht am Anfang; unmittelbar danach folgt das Sichern gegen Wiedereinschalten.',
    erklaerung: 'Sicherheitsregeln: erst Freischalten, dann Sichern.',
    stufe: 1,
  },
  {
    id: 'lu-mess-01',
    thema: 'ka-messen-04',
    bereich: 'kundenauftrag',
    text: 'Der Mindest-Isolationswiderstand einer Anlage bis 500 V beträgt ___ und wird mit einer Prüfspannung von ___ gemessen.',
    loesungen: [
      { loesung: '1 MΩ', alternativen: ['1 MOhm', '1MΩ'] },
      { loesung: '500 V', alternativen: ['500V'] },
    ],
    begruendung: 'DIN VDE 0100-600 nennt 1 MΩ bei 500 V Prüfspannung.',
    erklaerung: 'Isolationsmessung: 1 MΩ bei 500 V DC.',
    stufe: 1,
    factIds: ['riso-grenzwert'],
  },
  {
    id: 'lu-vert-01',
    thema: 'ka-verteilung-05',
    bereich: 'kundenauftrag',
    text: 'Für den zusätzlichen Personenschutz wird ein RCD mit einem Bemessungsfehlerstrom von höchstens ___ eingesetzt.',
    loesungen: [{ loesung: '30 mA', alternativen: ['30mA', '0,03 A'] }],
    begruendung: 'DIN VDE 0100-410 fordert höchstens 30 mA für den zusätzlichen Schutz.',
    erklaerung: 'Zusätzlicher Personenschutz: 30 mA.',
    stufe: 1,
    factIds: ['idn-personenschutz'],
  },
  {
    id: 'lu-t1-01',
    thema: 't1-anlagen-01',
    bereich: 'teil1',
    text: 'Das Ohmsche Gesetz lautet U = ___ · ___.',
    loesungen: [
      { loesung: 'R', alternativen: ['r'] },
      { loesung: 'I', alternativen: ['i'] },
    ],
    begruendung: 'Spannung ist das Produkt aus Widerstand und Strom.',
    erklaerung: 'U = R · I.',
    stufe: 1,
  },
  {
    id: 'lu-t1-02',
    thema: 't1-anlagen-03',
    bereich: 'teil1',
    text: 'In einem symmetrischen Drehstromnetz ist die Außenleiterspannung das ___-fache der Strangspannung.',
    loesungen: [{ loesung: '√3', alternativen: ['Wurzel 3', 'wurzel3', '1,73', '1.73'] }],
    begruendung: 'Zwischen zwei Außenleitern liegt das √3-fache der Strangspannung.',
    erklaerung: 'Drehstrom: U_LL = √3 · U_Strang.',
    stufe: 2,
  },
  {
    id: 'lu-pruef-01',
    thema: 'ka-pruefung-01',
    bereich: 'kundenauftrag',
    text: 'Die Erstprüfung gliedert sich in ___, ___ und ___.',
    loesungen: [
      { loesung: 'Besichtigen', alternativen: ['besichtigen'] },
      { loesung: 'Erproben', alternativen: ['erproben'] },
      { loesung: 'Messen', alternativen: ['messen'] },
    ],
    begruendung: 'DIN VDE 0100-600 nennt genau diese drei Schritte.',
    erklaerung: 'Erstprüfung: Besichtigen, Erproben, Messen.',
    stufe: 1,
  },
  {
    id: 'lu-sys-01',
    thema: 'sys-schutz-01',
    bereich: 'systementwurf',
    text: 'Der Schutz gegen direktes Berühren heißt ___, der Schutz bei indirektem Berühren ___.',
    loesungen: [
      { loesung: 'Basisschutz', alternativen: ['basisschutz'] },
      { loesung: 'Fehlerschutz', alternativen: ['fehlerschutz'] },
    ],
    begruendung: 'DIN VDE 0100-410 unterscheidet Basisschutz und Fehlerschutz.',
    erklaerung: 'Basisschutz gegen direktes, Fehlerschutz bei indirektem Berühren.',
    stufe: 2,
  },
  {
    id: 'lu-geb-01',
    thema: 'ka-gebaeudetechnik-03',
    bereich: 'kundenauftrag',
    text: 'Die Leistungszahl einer Wärmepumpe heißt ___, die Jahresarbeitszahl ___.',
    loesungen: [
      { loesung: 'COP', alternativen: ['cop'] },
      { loesung: 'JAZ', alternativen: ['jaz'] },
    ],
    begruendung: 'COP beschreibt den Prüfpunkt, JAZ das Jahresmittel.',
    erklaerung: 'COP und JAZ sind zu unterscheiden.',
    stufe: 2,
  },
  {
    id: 'lu-gst-01',
    thema: 'ka-gebaaeudesystemtechnik-02',
    bereich: 'kundenauftrag',
    text: 'Ein ___ erfasst eine Größe, ein ___ führt eine Schalthandlung aus.',
    loesungen: [
      { loesung: 'Sensor', alternativen: ['sensor'] },
      { loesung: 'Aktor', alternativen: ['aktor'] },
    ],
    begruendung: 'Der Sensor erfasst, der Aktor handelt.',
    erklaerung: 'Sensor und Aktor im Bussystem.',
    stufe: 1,
  },
  {
    id: 'lu-wiso-01',
    thema: 'wiso-recht-01',
    bereich: 'wiso',
    text: 'Jugendliche dürfen höchstens ___ Stunden täglich und ___ Stunden wöchentlich arbeiten.',
    loesungen: [
      { loesung: '8', alternativen: ['acht'] },
      { loesung: '40', alternativen: ['vierzig'] },
    ],
    begruendung: 'Das Jugendarbeitsschutzgesetz begrenzt auf 8 Stunden täglich und 40 Stunden wöchentlich.',
    erklaerung: 'JArbSchG: 8/40 Stunden.',
    stufe: 1,
  },
  {
    id: 'lu-verl-01',
    thema: 'ka-verlegung-09',
    bereich: 'kundenauftrag',
    text: 'Der Schutzleiter wird ___ gekennzeichnet, der Neutralleiter ___.',
    loesungen: [
      { loesung: 'grün-gelb', alternativen: ['gruen-gelb', 'grüngelb', 'gruengelb'] },
      { loesung: 'blau', alternativen: ['blau'] },
    ],
    begruendung: 'Schutzleiter grün-gelb, Neutralleiter blau.',
    erklaerung: 'Aderkennzeichnung: PE grün-gelb, N blau.',
    stufe: 1,
  },
  {
    id: 'lu-plan2-01',
    thema: 'ka-planung-04',
    bereich: 'kundenauftrag',
    text: 'Der Materialbedarf wird aus dem ___ und den Planungsunterlagen ermittelt; hinzu kommt ein Zuschlag für ___.',
    loesungen: [
      { loesung: 'Aufmaß', alternativen: ['aufmass', 'aufmaß'] },
      { loesung: 'Verschnitt', alternativen: ['verschnitt'] },
    ],
    begruendung: 'Bedarf entsteht aus Aufmaß und Plan; Verschnitt muss mitgerechnet werden.',
    erklaerung: 'Materialbedarf: Aufmaß plus Verschnitt.',
    stufe: 1,
  },
  {
    id: 'lu-dok2-01',
    thema: 'ka-dokumentation-03',
    bereich: 'kundenauftrag',
    text: 'Eine Normstelle wird mit ihrer ___ zitiert, damit sie nachprüfbar bleibt.',
    loesungen: [{ loesung: 'Ausgabe', alternativen: ['ausgabe', 'Ausgabestand', 'ausgabestand'] }],
    begruendung: 'Ohne Ausgabestand ist ein Normzitat nicht eindeutig.',
    erklaerung: 'Normzitat mit Ausgabe.',
    stufe: 2,
  },
  {
    id: 'lu-schn2-01',
    thema: 'fsa-schnittstellen-01',
    bereich: 'funktionsanalyse',
    text: 'Ein ___ Signal ist stufenlos, ein ___ Signal kennt nur zwei Zustände.',
    loesungen: [
      { loesung: 'analoges', alternativen: ['analog'] },
      { loesung: 'digitales', alternativen: ['digital'] },
    ],
    begruendung: 'Analog trägt einen Wertebereich, digital die Zustände 0 und 1.',
    erklaerung: 'Analog und digital unterscheiden.',
    stufe: 1,
  },
  {
    id: 'lu-sys2-01',
    thema: 'sys-varianten-02',
    bereich: 'systementwurf',
    text: 'Bei der Wirtschaftlichkeitsbetrachtung werden Investition und ___ über die ___ verglichen.',
    loesungen: [
      { loesung: 'Betriebskosten', alternativen: ['betriebskosten'] },
      { loesung: 'Nutzungsdauer', alternativen: ['nutzungsdauer'] },
    ],
    begruendung: 'Nur über die Nutzungsdauer zeigt sich, welche Variante günstiger ist.',
    erklaerung: 'Wirtschaftlichkeit über die Nutzungsdauer.',
    stufe: 2,
  },
  {
    id: 'lu-gst2-01',
    thema: 'ka-gebaaeudesystemtechnik-08',
    bereich: 'kundenauftrag',
    text: 'Ein Fernzugriff wird durch starke ___ und aktuelle ___ abgesichert.',
    loesungen: [
      { loesung: 'Passwörter', alternativen: ['passwoerter', 'passwort'] },
      { loesung: 'Firmware', alternativen: ['firmware'] },
    ],
    begruendung: 'Authentifizierung und Updates sind die Mindestabsicherung eines Fernzugangs.',
    erklaerung: 'Fernzugriff: Passwörter und Firmware.',
    stufe: 2,
  },
];
