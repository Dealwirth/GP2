import type { Task } from '../domain/types.ts';
import type { Atom } from '../content/curriculum/types.ts';
import { baueTask, parameterHash, type TaskBausatz } from '../validation/pipeline.ts';
import { holeFakt } from '../content/facts/index.ts';

/**
 * Verfahrensfragen für die handlungsorientierten Themen.
 *
 * Warum es diese Sammlung braucht: Die Funktionsanalyse, der Systementwurf und
 * die Dokumentation fragen keine Zahlen ab, sondern das Vorgehen – „Wie gehen
 * Sie vor?", „Was prüfen Sie zuerst?", „Woran erkennen Sie den Fehler?". Aus
 * der Faktenbasis lässt sich das nicht erzeugen: Dort stehen Werte und Regeln,
 * aber kein Arbeitsablauf.
 *
 * Deshalb steht hier eine gepflegte Sammlung. Jede Frage nennt ihr Thema, die
 * richtige Antwort und zwei falsche. Die falschen sind keine beliebigen
 * Sätze: Es sind die typischen Verwechslungen – der zweite Schritt vor dem
 * ersten, die Ursache mit dem Symptom vertauscht, die Messung vor der
 * Besichtigung. Wer sie wählt, macht genau den Fehler, den die Prüfung sucht.
 *
 * Aufbau wie überall: Die Fragen laufen durch dieselbe Validierungspipeline.
 * Sie tragen kein Rechenrezept, ihre Begriffe sind also nicht zahlengebunden –
 * das ist bei einer Verfahrensfrage richtig und wird von der Bindung auch
 * nicht verlangt.
 */

export interface ProzessFrage {
  /** Thema, zu dem die Frage gehört (Atom-Kennung). */
  thema: string;
  frage: string;
  richtig: string;
  falsch: [string, string];
  begruendung: string;
  /** 1 = Grundwissen, 2 = Verständnis, 3 = Transfer. */
  stufe: 1 | 2 | 3;
  /** Fakten, die die Antwort stützen – erscheinen im Prüfbericht. */
  factIds?: string[];
}

export const PROZESS_FRAGEN: ProzessFrage[] = [
  // =========================================================================
  // Funktionsanalyse – Dokumentation auswerten
  // =========================================================================
  {
    thema: 'fsa-dokumentation-01',
    frage: 'In welcher Reihenfolge werten Sie die Unterlagen einer unbekannten Anlage aus?',
    richtig: 'Erst Stromlaufplan und Übersichtsschaltplan, dann Klemmen- und Anschlussplan, zuletzt Gerätedatenblätter.',
    falsch: [
      'Zuerst die Gerätedatenblätter, dann die Pläne.',
      'Erst die Betriebsanleitung, dann die Messwerte, zuletzt die Pläne.',
    ],
    begruendung:
      'Der Überblick kommt vor dem Detail: Ohne den Schaltungszusammenhang lässt sich ein Datenblatt nicht einordnen.',
    stufe: 2,
  },
  {
    thema: 'fsa-dokumentation-01',
    frage: 'Was zeigt ein Übersichtsschaltplan im Unterschied zum Stromlaufplan?',
    richtig: 'Der Übersichtsschaltplan zeigt das Zusammenwirken der Anlagenteile, der Stromlaufplan den Stromweg im Detail.',
    falsch: [
      'Der Übersichtsschaltplan zeigt die Verdrahtung, der Stromlaufplan die Funktion.',
      'Der Übersichtsschaltplan zeigt die räumliche Anordnung, der Stromlaufplan die Klemmen.',
    ],
    begruendung:
      'Der Übersichtsschaltplan ordnet die Betriebsmittel zueinander, ohne jede Ader zu verfolgen; der Stromlaufplan löst die Funktion auf.',
    stufe: 2,
  },
  {
    thema: 'fsa-dokumentation-02',
    frage: 'Wozu dient die Klemmenliste in der Anlagendokumentation?',
    richtig: 'Sie ordnet jeder Klemme die ankommende und abgehende Ader mit Ziel zu.',
    falsch: [
      'Sie legt die Reihenfolge der Montage fest.',
      'Sie nennt die Schutzart der Betriebsmittel.',
    ],
    begruendung:
      'Die Klemmenliste ist das Bindeglied zwischen Plan und Verdrahtung: An ihr wird geprüft, welche Ader wohin gehört.',
    stufe: 1,
  },
  {
    thema: 'fsa-dokumentation-02',
    frage: 'Ein Plan weicht von der ausgeführten Anlage ab. Wie verhalten Sie sich?',
    richtig: 'Die Abweichung wird aufgenommen und der Plan an die Ausführung angepasst.',
    falsch: [
      'Die Anlage wird an den Plan angepasst, der Plan gilt.',
      'Die Abweichung wird nicht dokumentiert, sie ist ohne Belang.',
    ],
    begruendung:
      'Maßgeblich ist die ausgeführte Anlage. Ein Plan, der nicht stimmt, führt bei der nächsten Prüfung in die Irre.',
    stufe: 3,
  },
  {
    thema: 'fsa-dokumentation-03',
    frage: 'Wie ordnen Sie die Funktion eines unbekannten Betriebsmittels im Schaltplan zu?',
    richtig: 'Über das Betriebsmittelkennzeichen und die zugehörige Erläuterung im Plan.',
    falsch: [
      'Über die Farbe der Ader.',
      'Über die Einbaulage im Schrank.',
    ],
    begruendung:
      'Das Betriebsmittelkennzeichen ist der Schlüssel: Es verbindet Plan, Klemmenliste und Gerät.',
    stufe: 1,
  },
  {
    thema: 'fsa-dokumentation-04',
    frage: 'Welche Angabe der Betriebsanleitung ist für die Inbetriebnahme zuerst maßgeblich?',
    richtig: 'Die Anschluss- und Inbetriebnahmehinweise des Herstellers.',
    falsch: [
      'Die Angaben zur Gewährleistung.',
      'Die Hinweise zur Entsorgung.',
    ],
    begruendung:
      'Der Hersteller gibt Anschluss, Betriebswerte und Reihenfolge vor. Ein Verstoß kostet Gewährleistung und gefährdet die Anlage.',
    stufe: 2,
  },
  {
    thema: 'fsa-dokumentation-05',
    frage: 'Welche vier Angaben stehen im Datenblatt eines Betriebsmittels immer?',
    richtig: 'Bemessungsspannung, Bemessungsstrom, Schutzart und Schutzklasse.',
    falsch: [
      'Gewicht, Farbe, Lieferant und Preis.',
      'Schaltbild, Klemmenliste, Kabeltyp und Länge.',
    ],
    begruendung:
      'Diese vier Kennwerte entscheiden über Einbau, Absicherung und Schutzkonzept. Ohne sie ist das Betriebsmittel nicht verwendbar.',
    stufe: 1,
  },
  {
    thema: 'fsa-dokumentation-06',
    frage: 'Wie entschlüsseln Sie einen Typenschlüssel eines Leitungsschutzschalters?',
    richtig: 'Über die Herstellerangabe im Datenblatt oder Katalog, Feld für Feld.',
    falsch: [
      'Über eine allgemeine Tabelle für alle Hersteller.',
      'Über die Nummer auf dem Gehäuse allein.',
    ],
    begruendung:
      'Typenschlüssel sind herstellerspezifisch aufgebaut. Eine allgemeine Tabelle gibt es nicht; sie wäre auch irreführend.',
    stufe: 2,
  },

  // =========================================================================
  // Funktionsanalyse – Messverfahren
  // =========================================================================
  {
    thema: 'fsa-verfahren-01',
    frage: 'Nach welchem Kriterium wählen Sie das Messverfahren für eine Prüfung?',
    richtig: 'Nach der zu prüfenden Größe, dem geforderten Grenzwert und der Messkategorie.',
    falsch: [
      'Nach dem Preis des Messgeräts.',
      'Nach der Farbe des Anschlusses.',
    ],
    begruendung:
      'Das Verfahren folgt der Aufgabe: Was wird geprüft, welcher Grenzwert gilt, welcher Überspannungskategorie ist der Messpunkt ausgesetzt.',
    stufe: 2,
  },
  {
    thema: 'fsa-verfahren-01',
    frage: 'Warum wird der Isolationswiderstand mit Gleichspannung gemessen?',
    richtig: 'Weil die Messung selbst aussagefähige Werte liefert und kapazitive Ströme nach dem Aufladen entfallen.',
    falsch: [
      'Weil Wechselspannung die Isolierung zerstört.',
      'Weil nur Gleichspannung messbar ist.',
    ],
    begruendung:
      'Die Gleichspannung lädt die Kapazität der Anlage auf; der verbleibende Strom ist der reine Isolationsstrom.',
    stufe: 3,
  },
  {
    thema: 'fsa-verfahren-02',
    frage: 'Welches Messgerät ist für die Schleifenwiderstandsmessung geeignet?',
    richtig: 'Ein Prüfgerät nach DIN VDE 0100-600 mit Messkategorie CAT III und Netzunabhängigkeit.',
    falsch: [
      'Ein Multimeter mit Widerstandsmessbereich.',
      'Ein Zangenamperemeter.',
    ],
    begruendung:
      'Nur ein geprüftes Installationsprüfgerät liefert den Schleifenwiderstand unter Netzbedingungen mit der nötigen Kategorie.',
    stufe: 2,
  },
  {
    thema: 'fsa-verfahren-02',
    frage: 'Wozu dient die Messkategorie CAT III am Messgerät?',
    richtig: 'Sie beschreibt die Überspannungsfestigkeit für Messungen an festen Installationen und in der Verteilung.',
    falsch: [
      'Sie beschreibt die Messgenauigkeit.',
      'Sie beschreibt den Messbereich in Ampere.',
    ],
    begruendung:
      'Die Kategorie sagt, welchen transienten Überspannungen das Gerät am Messpunkt standhält – nicht, was es anzeigt.',
    stufe: 2,
  },
  {
    thema: 'fsa-verfahren-03',
    frage: 'Wann ist eine Isolationsüberwachung sinnvoll?',
    richtig: 'Bei IT-Systemen und Anlagen, die im Betrieb nicht freigeschaltet werden können.',
    falsch: [
      'Bei jeder Steckdosenleitung.',
      'Nur bei Photovoltaikanlagen.',
    ],
    begruendung:
      'Die Isolationsüberwachung meldet den ersten Fehler im IT-Netz, bevor der zweite zur Abschaltung führt. Sie ersetzt die Abschaltung, nicht die Prüfung.',
    stufe: 3,
  },
  {
    thema: 'fsa-verfahren-04',
    frage: 'In welcher Reihenfolge bauen Sie eine Messung auf?',
    richtig: 'Messpunkt wählen, Gerät prüfen, Anlage freischalten, messen, Gerät nachprüfen.',
    falsch: [
      'Anlage freischalten, messen, Messpunkt suchen.',
      'Messen, dann den Messpunkt festlegen.',
    ],
    begruendung:
      'Der Messpunkt steht vor der Freischaltung fest; das Prüfmittel wird vor und nach dem Einsatz auf Funktion geprüft.',
    stufe: 2,
  },
  {
    thema: 'fsa-verfahren-05',
    frage: 'Ein Messwert schwankt stark. Was tun Sie?',
    richtig: 'Ursache klären, Messung wiederholen und den stabilen Wert dokumentieren.',
    falsch: [
      'Den Mittelwert schätzen und notieren.',
      'Den niedrigsten Wert notieren, der ist sicher.',
    ],
    begruendung:
      'Schwankt der Wert, liegt entweder ein loser Kontakt, eine Störung oder ein falscher Messpunkt vor. Das ist selbst ein Befund.',
    stufe: 3,
  },
  {
    thema: 'fsa-verfahren-06',
    frage: 'Was sagt die Messunsicherheit aus?',
    richtig: 'Sie beschreibt, wie weit der angezeigte Wert vom wahren Wert höchstens abweichen kann.',
    falsch: [
      'Sie beschreibt den Fehler der Anlage.',
      'Sie beschreibt die Auflösung des Displays.',
    ],
    begruendung:
      'Die Messunsicherheit ist eine Eigenschaft der Messung. Sie ist umso wichtiger, je näher der Messwert am Grenzwert liegt.',
    stufe: 2,
  },
  {
    thema: 'fsa-verfahren-06',
    frage: 'Ein Messwert liegt knapp unter dem Grenzwert. Wie beurteilen Sie ihn?',
    richtig: 'Unter Berücksichtigung der Messunsicherheit; liegt der Grenzwert im Toleranzband, gilt der Wert als nicht gesichert.',
    falsch: [
      'Als bestanden, weil der Wert unter dem Grenzwert liegt.',
      'Als durchgefallen, weil Messwerte immer abweichen.',
    ],
    begruendung:
      'Ein Wert, der nur innerhalb der Messunsicherheit unter dem Grenzwert liegt, ist nicht sicher eingehalten.',
    stufe: 3,
  },

  // =========================================================================
  // Funktionsanalyse – Fehlersuche
  // =========================================================================
  {
    thema: 'fsa-fehlersuche-01',
    frage: 'Wie beschreiben Sie ein Fehlerbild sinnvoll?',
    richtig: 'Beobachtung, Bedingung und Wirkung – etwa „Der Motor läuft nicht an, sobald die Sicherung fällt".',
    falsch: [
      'Nur mit dem Bauteil, das man tauschen will.',
      'Mit der vermuteten Ursache.',
    ],
    begruendung:
      'Das Fehlerbild ist die beobachtbare Abweichung. Die Ursache steht am Ende der Suche, nicht am Anfang.',
    stufe: 2,
  },
  {
    thema: 'fsa-fehlersuche-01',
    frage: 'Warum ist „Der Widerstand ist kaputt" kein brauchbares Fehlerbild?',
    richtig: 'Es nennt eine Ursache, die erst noch nachgewiesen werden muss.',
    falsch: [
      'Es ist zu kurz.',
      'Es nennt kein Bauteil.',
    ],
    begruendung:
      'Wer die Ursache vorwegnimmt, sucht nicht mehr – er bestätigt nur noch seine Annahme und übersieht den echten Fehler.',
    stufe: 2,
  },
  {
    thema: 'fsa-fehlersuche-02',
    frage: 'Welches Vorgehen grenzt einen Fehler am schnellsten ein?',
    richtig: 'Den Fehlerbereich halbieren und die Hälfte ohne Fehler ausschließen.',
    falsch: [
      'Bauteile der Reihe nach tauschen.',
      'Alle Messpunkte gleichzeitig prüfen.',
    ],
    begruendung:
      'Die Halbierung halbiert den Suchraum mit jedem Schritt. Bauteiletausch auf Verdacht verlängert die Suche und verdeckt den Fehler.',
    stufe: 3,
  },
  {
    thema: 'fsa-fehlersuche-02',
    frage: 'Der Leitungsschutzschalter fällt sofort beim Einschalten. Was schließen Sie?',
    richtig: 'Auf einen Kurzschluss oder einen Isolationsfehler, denn nur die magnetische Auslösung wirkt so schnell.',
    falsch: [
      'Auf eine Überlast, weil der Strom zu hoch ist.',
      'Auf einen Fehler im Zähler.',
    ],
    begruendung:
      'Sofortiges Auslösen ist magnetisch und zeigt einen Kurzschluss. Eine Überlast löst thermisch und damit verzögert aus.',
    stufe: 3,
  },
  {
    thema: 'fsa-fehlersuche-02',
    frage: 'Der Leitungsschutzschalter fällt nach einigen Minuten. Was ist wahrscheinlich?',
    richtig: 'Eine thermische Überlast durch zu hohen Dauerstrom oder eine gelockerte Klemmstelle.',
    falsch: [
      'Ein Kurzschluss.',
      'Ein Fehler in der Steuerung.',
    ],
    begruendung:
      'Verzögertes Auslösen ist thermisch. Häufigste Ursache im Bestand ist eine warme Klemmstelle, nicht die Leitung selbst.',
    stufe: 3,
  },
  {
    thema: 'fsa-fehlersuche-03',
    frage: 'Ein Fehlerstromschutzschalter löst ohne erkennbaren Grund aus. Welche Ursache prüfen Sie zuerst?',
    richtig: 'Den Summenableitstrom aller angeschlossenen Geräte und den Zustand der Isolierung.',
    falsch: [
      'Die Kennlinie des Leitungsschutzschalters.',
      'Die Frequenz des Netzes.',
    ],
    begruendung:
      'Mehrere Geräte mit je einem kleinen Ableitstrom können in Summe den Auslösewert erreichen. Danach wird die Isolierung geprüft.',
    stufe: 3,
  },
  {
    thema: 'fsa-fehlersuche-03',
    frage: 'Eine Sicherung fällt, obwohl die Anlage keinen Fehler zeigt. Woran kann es liegen?',
    richtig: 'An einem Einschaltstromstoß, etwa beim Anlauf eines Motors oder eines Trafos.',
    falsch: [
      'An einem zu großen Querschnitt.',
      'An einer zu niedrigen Netzspannung.',
    ],
    begruendung:
      'Der Einschaltstrom kann ein Vielfaches des Nennstroms betragen. Die richtige Antwort ist eine träge Kennlinie, nicht ein größerer Querschnitt.',
    stufe: 3,
  },
  {
    thema: 'fsa-fehlersuche-04',
    frage: 'Wann gilt ein Fehler als beseitigt?',
    richtig: 'Wenn die Ursache behoben und die Funktion unter Betriebsbedingungen nachgewiesen ist.',
    falsch: [
      'Wenn die Sicherung wieder hält.',
      'Wenn das Bauteil getauscht ist.',
    ],
    begruendung:
      'Ein gehaltenes Schutzorgan beweist nur, dass es gerade hält. Erst der Funktionsnachweis unter Last schließt die Reparatur ab.',
    stufe: 3,
  },
  {
    thema: 'fsa-fehlersuche-05',
    frage: 'Wie verfolgen Sie ein Signal durch eine Steuerung?',
    richtig: 'Vom Speisepunkt in Fließrichtung des Signals bis zum ersten Punkt ohne Signal.',
    falsch: [
      'Vom Verbraucher rückwärts bis zum Speisepunkt.',
      'An allen Punkten gleichzeitig.',
    ],
    begruendung:
      'Die Verfolgung in Fließrichtung zeigt, an welcher Stelle das Signal verloren geht. Der erste Punkt ohne Signal liegt hinter der Unterbrechung.',
    stufe: 2,
  },
  {
    thema: 'fsa-fehlersuche-06',
    frage: 'Welche drei Zustände müssen Sie an einer Anlage unterscheiden?',
    richtig: 'Spannungsfrei, betriebsbereit und in Betrieb.',
    falsch: [
      'Neu, alt und defekt.',
      'Einphasig, dreiphasig und gleichstrom.',
    ],
    begruendung:
      'Diese Unterscheidung entscheidet über die zulässigen Arbeiten: An einer freigeschalteten Anlage gelten andere Regeln als an einer betriebsbereiten.',
    stufe: 2,
  },
  {
    thema: 'fsa-fehlersuche-07',
    frage: 'Wie prüfen Sie eine Schnittstelle zwischen zwei Anlagenteilen?',
    richtig: 'Auf beiden Seiten des Übergabepunkts messen und die Werte gegenüberstellen.',
    falsch: [
      'Nur auf der Seite, an der der Fehler vermutet wird.',
      'Nur die Leitungsdurchgängigkeit.',
    ],
    begruendung:
      'Nur der Vergleich beider Seiten zeigt, ob das Signal ankommt oder am Übergang verloren geht.',
    stufe: 3,
  },

  // =========================================================================
  // Funktionsanalyse – Programme und Schnittstellen
  // =========================================================================
  {
    thema: 'fsa-programme-01',
    frage: 'Wie analysieren Sie ein unbekanntes Steuerungsprogramm?',
    richtig: 'Von den Ein- und Ausgängen her, dann die Verknüpfungen dazwischen.',
    falsch: [
      'Von der ersten Programmzeile der Reihe nach.',
      'Über die Anzahl der Variablen.',
    ],
    begruendung:
      'Die Ein- und Ausgänge sind bekannt und messbar. Von dort erschließt sich die Verknüpfung, ohne jede Zeile zu lesen.',
    stufe: 3,
  },
  {
    thema: 'fsa-programme-02',
    frage: 'Was beachten Sie, bevor Sie ein laufendes Programm ändern?',
    richtig: 'Sicherung der laufenden Version und Abstimmung mit dem Betreiber.',
    falsch: [
      'Die Änderung sofort aufspielen.',
      'Zuerst die Anlage neu starten.',
    ],
    begruendung:
      'Ohne Sicherung ist der ursprüngliche Zustand verloren. Ohne Abstimmung kann die Anlage für den Betreiber unerwartet ausfallen.',
    stufe: 3,
  },
  {
    thema: 'fsa-programme-03',
    frage: 'Wozu dient die symbolische Adressierung im Steuerungsprogramm?',
    richtig: 'Sie ersetzt die absolute Adresse durch einen sprechenden Namen und macht das Programm lesbar.',
    falsch: [
      'Sie beschleunigt den Programmablauf.',
      'Sie verschlüsselt das Programm.',
    ],
    begruendung:
      'Ein Name wie „Pumpe_Freigabe" ist prüfbar, die Adresse „E2.3" nicht. Die Lesbarkeit ist der Zweck, nicht die Geschwindigkeit.',
    stufe: 2,
  },
  {
    thema: 'fsa-programme-04',
    frage: 'Wie testen Sie eine Programmänderung sicher?',
    richtig: 'Zuerst im Handbetrieb oder mit simulierten Signalen, dann im Automatikbetrieb.',
    falsch: [
      'Sofort im Automatikbetrieb unter voller Last.',
      'Nur im ausgeschalteten Zustand.',
    ],
    begruendung:
      'Der gestufte Test deckt Fehler auf, bevor die Anlage unter Last läuft. So bleibt ein Fehler ohne Schaden.',
    stufe: 3,
  },
  {
    thema: 'fsa-schnittstellen-01',
    frage: 'Wie unterscheiden Sie analoge und digitale Signale?',
    richtig: 'Analoge Signale tragen einen Wertebereich, digitale Signale nur zwei Zustände.',
    falsch: [
      'Analoge Signale sind schneller, digitale langsamer.',
      'Analoge Signale sind Wechselspannung, digitale Gleichspannung.',
    ],
    begruendung:
      'Der Unterschied liegt in der Wertezahl, nicht in der Geschwindigkeit oder der Spannungsart.',
    stufe: 1,
  },
  {
    thema: 'fsa-schnittstellen-01',
    frage: 'Welches Signal ist ein typisches Analogsignal in der Gebäudetechnik?',
    richtig: 'Ein Temperatursignal als 0-bis-10-V- oder 4-bis-20-mA-Signal.',
    falsch: [
      'Ein Tasterkontakt.',
      'Ein Schaltausgang eines Relais.',
    ],
    begruendung:
      'Strom- und Spannungssignale mit Wertebereich sind analog. Taster und Relais kennen nur „ein" und „aus".',
    stufe: 1,
  },
  {
    thema: 'fsa-schnittstellen-01',
    frage: 'Warum wird in der Gebäudetechnik das 4-bis-20-mA-Signal dem 0-bis-10-V-Signal vorgezogen?',
    richtig: 'Weil ein Leitungsbruch als fehlender Strom sofort erkennbar ist.',
    falsch: [
      'Weil es schneller ist.',
      'Weil es keine Abschirmung braucht.',
    ],
    begruendung:
      'Der Mindeststrom von 4 mA macht die Unterbrechung sichtbar. Bei 0 bis 10 V sieht ein Leitungsbruch wie ein Messwert von null aus.',
    stufe: 3,
  },
  {
    thema: 'fsa-schnittstellen-02',
    frage: 'Was ist an einer Busschnittstelle für die Funktion entscheidend?',
    richtig: 'Dass alle Teilnehmer dieselbe Übertragungsgeschwindigkeit und dieselbe Adressierung verwenden.',
    falsch: [
      'Dass alle Teilnehmer dieselbe Bauform haben.',
      'Dass die Leitung möglichst kurz ist.',
    ],
    begruendung:
      'Busse scheitern an unterschiedlichen Parametern, nicht an der Bauform. Adresse und Geschwindigkeit müssen übereinstimmen.',
    stufe: 2,
  },
  {
    thema: 'fsa-schnittstellen-02',
    frage: 'Warum braucht ein Bussystem einen Abschlusswiderstand?',
    richtig: 'Er verhindert Reflexionen am Leitungsende, die die Telegramme zerstören.',
    falsch: [
      'Er begrenzt den Strom auf der Leitung.',
      'Er erhöht die Übertragungsgeschwindigkeit.',
    ],
    begruendung:
      'Ohne Abschluss wird das Signal am offenen Ende reflektiert und überlagert das Nutzsignal.',
    stufe: 3,
  },
  {
    thema: 'fsa-schnittstellen-03',
    frage: 'Wozu dient ein Gateway zur übergeordneten Leittechnik?',
    richtig: 'Es übersetzt die Datenpunkte der Feldebene in das Protokoll der Leittechnik.',
    falsch: [
      'Es verstärkt die Signale auf der Feldbusleitung.',
      'Es ersetzt die Feldbusleitung.',
    ],
    begruendung:
      'Das Gateway ist ein Übersetzer zwischen zwei Welten. Die Feldbusebene bleibt unverändert.',
    stufe: 2,
  },
  {
    thema: 'fsa-schnittstellen-04',
    frage: 'Welche Größen liefert eine Gebäudeleittechnik aus der Heizungsanlage typischerweise?',
    richtig: 'Vor- und Rücklauftemperatur, Betriebszustand der Pumpe und Störmeldungen.',
    falsch: [
      'Den Zählerstand des Stromzählers allein.',
      'Die Farbe der Leitungen.',
    ],
    begruendung:
      'Die Leittechnik verarbeitet Messwerte und Zustände. Daraus entstehen Regelung, Anzeige und Störmeldung.',
    stufe: 1,
  },
  {
    thema: 'fsa-schnittstellen-05',
    frage: 'Wozu dient eine Wartungsschnittstelle an einem Gerät?',
    richtig: 'Zum Auslesen von Diagnosedaten und zum Aufspielen von Updates durch die Fachkraft.',
    falsch: [
      'Zum Anschluss des Endkunden an das Gerät.',
      'Zur Versorgung des Geräts mit Spannung.',
    ],
    begruendung:
      'Die Wartungsschnittstelle ist ein Zugang für die Fachkraft. Sie wird zugriffsgeschützt und nur bei Bedarf geöffnet.',
    stufe: 2,
  },

  // =========================================================================
  // Funktionsanalyse – Schutz bewerten
  // =========================================================================
  {
    thema: 'fsa-schutzbewertung-01',
    frage: 'Wie bewerten Sie eine Schutzmaßnahme an einer bestehenden Anlage?',
    richtig: 'Über den Nachweis, dass Basisschutz und Fehlerschutz wirksam sind und die Abschaltbedingung eingehalten wird.',
    falsch: [
      'Über das Alter der Anlage.',
      'Über das Baujahr des Verteilers.',
    ],
    begruendung:
      'Die Wirksamkeit entscheidet, nicht das Alter. Eine alte, aber nachgewiesene Anlage ist in Ordnung; eine neue ohne Nachweis nicht.',
    stufe: 3,
  },
  {
    thema: 'fsa-schutzbewertung-01',
    frage: 'Was ist der Unterschied zwischen Basisschutz und Fehlerschutz?',
    richtig: 'Der Basisschutz verhindert das Berühren aktiver Teile, der Fehlerschutz sichert bei einem Fehler ab.',
    falsch: [
      'Der Basisschutz gilt für Laien, der Fehlerschutz für Fachkräfte.',
      'Der Basisschutz gilt innen, der Fehlerschutz außen.',
    ],
    begruendung:
      'Die beiden Ebenen greifen nacheinander: erst das Berühren verhindern, dann den Fehler abschalten.',
    stufe: 2,
  },
  {
    thema: 'fsa-schutzbewertung-02',
    frage: 'Wie prüfen Sie die Abschaltbedingung im TN-System?',
    richtig: 'Durch Messung des Schleifenwiderstands und Vergleich mit dem zulässigen Grenzwert.',
    falsch: [
      'Durch Drücken der Prüftaste am Fehlerstromschutzschalter.',
      'Durch Sichtprüfung der Sicherung.',
    ],
    begruendung:
      'Die Abschaltbedingung wird über den Schleifenwiderstand nachgewiesen. Die Prüftaste prüft den RCD, nicht die Schleife.',
    stufe: 3,
  },
  {
    thema: 'fsa-schutzbewertung-02',
    frage: 'Warum genügt im TT-System der Schleifenwiderstand nicht?',
    richtig: 'Weil der Fehlerstrom über die Erde fließt und zu klein wäre; es braucht die Fehlerstrom-Schutzeinrichtung.',
    falsch: [
      'Weil der Schleifenwiderstand dort nicht messbar ist.',
      'Weil im TT-System kein Schutzleiter geführt wird.',
    ],
    begruendung:
      'Im TT-System ist der Erdungswiderstand zu hoch für eine Abschaltung allein über den Überstromschutz. Der RCD übernimmt sie.',
    stufe: 3,
  },
  {
    thema: 'fsa-schutzbewertung-03',
    frage: 'Ein Isolationswiderstand liegt nur knapp über dem Mindestwert. Wie werten Sie das?',
    richtig: 'Als Hinweis auf eine beginnende Schwäche; der Wert wird dokumentiert und die Messung wiederholt.',
    falsch: [
      'Als einwandfrei, der Wert liegt über dem Grenzwert.',
      'Als durchgefallen, der Wert ist zu niedrig.',
    ],
    begruendung:
      'Ein knapper Wert ist kein Freibrief: Feuchtigkeit oder Alterung können ihn weiter senken. Er wird festgehalten und beobachtet.',
    stufe: 3,
  },
  {
    thema: 'fsa-schutzbewertung-04',
    frage: 'Was gehört zwingend in die Dokumentation einer Schutzprüfung?',
    richtig: 'Messwert, Grenzwert, Bewertung, Prüfmittel und Datum.',
    falsch: [
      'Nur das Ergebnis bestanden oder nicht bestanden.',
      'Nur die Unterschrift.',
    ],
    begruendung:
      'Nur aus Messwert, Grenzwert und Prüfmittel lässt sich die Bewertung später nachvollziehen. Ein bloßes „bestanden" ist wertlos.',
    stufe: 2,
  },
  {
    thema: 'fsa-schutzbewertung-04',
    frage: 'Warum wird der Messwert und nicht nur das Ergebnis dokumentiert?',
    richtig: 'Weil die Entwicklung der Werte über die Jahre den Zustand der Anlage zeigt.',
    falsch: [
      'Weil die Norm es ausdrücklich verbietet, nur das Ergebnis zu nennen.',
      'Weil sonst die Rechnung nicht stimmt.',
    ],
    begruendung:
      'Ein sinkender Isolationswiderstand kündigt den Ausfall an, lange bevor der Grenzwert erreicht ist.',
    stufe: 3,
  },

  // =========================================================================
  // Systementwurf – Analyse
  // =========================================================================
  {
    thema: 'sys-analyse-01',
    frage: 'Wie beschreiben Sie die Ausgangslage eines Kundenauftrags?',
    richtig: 'Mit dem Ist-Zustand der Anlage, den Anforderungen des Kunden und den Randbedingungen.',
    falsch: [
      'Mit der Lösung, die Sie vorschlagen.',
      'Mit dem Preis, den Sie nennen.',
    ],
    begruendung:
      'Die Ausgangslage ist die Beschreibung des Problems, nicht der Lösung. Erst danach folgt der Entwurf.',
    stufe: 2,
  },
  {
    thema: 'sys-analyse-01',
    frage: 'Welche Randbedingung ist für die Planung einer Wallbox zuerst zu klären?',
    richtig: 'Die verfügbare Anschlussleistung des Hausanschlusses.',
    falsch: [
      'Die Farbe des Gehäuses.',
      'Die Länge des Ladekabels.',
    ],
    begruendung:
      'Ohne die Anschlussleistung ist keine Dimensionierung möglich. Sie entscheidet, ob ein Lastmanagement nötig wird.',
    stufe: 3,
  },
  {
    thema: 'sys-analyse-02',
    frage: 'Was macht eine Anforderung prüfbar?',
    richtig: 'Sie nennt ein messbares Kriterium, etwa einen Wert mit Einheit und Toleranz.',
    falsch: [
      'Sie ist möglichst allgemein formuliert.',
      'Sie nennt ein Wunschziel ohne Zahl.',
    ],
    begruendung:
      'Nur eine messbare Anforderung lässt sich später abnehmen. „Gute Beleuchtung" ist keine Anforderung, „500 lx" schon.',
    stufe: 2,
  },
  {
    thema: 'sys-analyse-03',
    frage: 'Welche Randbedingung kann eine geplante Leitungslänge begrenzen?',
    richtig: 'Der zulässige Spannungsfall.',
    falsch: [
      'Die Farbe der Leitung.',
      'Die Anzahl der Adern.',
    ],
    begruendung:
      'Mit der Länge steigt der Spannungsfall. Überschreitet er den Grenzwert, muss der Querschnitt wachsen.',
    stufe: 2,
  },
  {
    thema: 'sys-analyse-04',
    frage: 'Wie nehmen Sie den Bestand einer Anlage auf?',
    richtig: 'Durch Sichtprüfung, Fotodokumentation, Messung und Vergleich mit den vorhandenen Unterlagen.',
    falsch: [
      'Durch Schätzung auf Grundlage des Baujahrs.',
      'Allein durch Einsicht in den Stromlaufplan.',
    ],
    begruendung:
      'Der Plan zeigt den Sollzustand, nicht den Istzustand. Erst der Vergleich beider deckt Abweichungen auf.',
    stufe: 2,
  },
  {
    thema: 'sys-analyse-05',
    frage: 'Ein Kunde klagt über flackernde Beleuchtung. Wie grenzen Sie das Problem ein?',
    richtig: 'Prüfen, ob nur ein Stromkreis oder mehrere betroffen sind, und ob es zeitlich gebunden auftritt.',
    falsch: [
      'Sofort alle Leuchtmittel tauschen.',
      'Den Zähler wechseln lassen.',
    ],
    begruendung:
      'Ob ein Stromkreis oder mehrere betroffen sind, entscheidet über die Richtung der Suche. Erst die Eingrenzung, dann der Eingriff.',
    stufe: 3,
  },
  {
    thema: 'sys-analyse-06',
    frage: 'Wozu dient das Zielbild im Systementwurf?',
    richtig: 'Es beschreibt den gewünschten Zustand nach der Umsetzung und dient als Abnahmemaßstab.',
    falsch: [
      'Es beschreibt den Ist-Zustand.',
      'Es ersetzt die Kalkulation.',
    ],
    begruendung:
      'Am Zielbild wird am Ende gemessen, ob die Anlage das Geforderte leistet.',
    stufe: 2,
  },
  {
    thema: 'sys-analyse-07',
    frage: 'Welche Unterlagen ziehen Sie für die Planung einer Bestandsanlage heran?',
    richtig: 'Vorhandene Pläne, Messprotokolle, Datenblätter der Betriebsmittel und die Angaben des Netzbetreibers.',
    falsch: [
      'Nur die Rechnung des Vorbesitzers.',
      'Nur die Angaben des Kunden.',
    ],
    begruendung:
      'Nur das Zusammenspiel dieser Quellen ergibt ein belastbares Bild. Die Kundenangabe allein ist unvollständig.',
    stufe: 2,
  },

  // =========================================================================
  // Systementwurf – Varianten und Wirtschaftlichkeit
  // =========================================================================
  {
    thema: 'sys-varianten-01',
    frage: 'Nach welchen Kriterien vergleichen Sie technische Varianten?',
    richtig: 'Nach Funktion, Aufwand, Betriebskosten, Lebensdauer und Instandhaltung.',
    falsch: [
      'Nur nach dem Anschaffungspreis.',
      'Nur nach der Optik.',
    ],
    begruendung:
      'Der Anschaffungspreis allein führt zur falschen Wahl. Betriebskosten und Lebensdauer entscheiden über die Wirtschaftlichkeit.',
    stufe: 2,
  },
  {
    thema: 'sys-varianten-01',
    frage: 'Zwei Lösungen erfüllen die Anforderung. Welche wählen Sie?',
    richtig: 'Die mit dem besten Verhältnis aus Aufwand und Nutzen über die Nutzungsdauer.',
    falsch: [
      'Immer die preiswertere.',
      'Immer die mit der längeren Gewährleistung.',
    ],
    begruendung:
      'Maßgeblich ist die Wirtschaftlichkeit über die Nutzungsdauer, nicht der Einzelpreis.',
    stufe: 3,
  },
  {
    thema: 'sys-varianten-02',
    frage: 'Wie bewerten Sie zwei Varianten wirtschaftlich?',
    richtig: 'Über die Gesamtkosten aus Anschaffung, Betrieb und Instandhaltung.',
    falsch: [
      'Über den Listenpreis allein.',
      'Über die Anzahl der Bauteile.',
    ],
    begruendung:
      'Die Gesamtkostenbetrachtung ist der einzige Vergleich, der beide Varianten fair stellt.',
    stufe: 2,
  },
  {
    thema: 'sys-varianten-03',
    frage: 'Welche ökologische Größe bewerten Sie beim Variantenvergleich?',
    richtig: 'Den Energiebedarf im Betrieb und die Ressourcen über die Lebensdauer.',
    falsch: [
      'Nur die Farbe der Betriebsmittel.',
      'Nur das Gewicht der Verpackung.',
    ],
    begruendung:
      'Der Betrieb verbraucht über die Jahre mehr Energie als die Herstellung. Deshalb zählt der Betriebsbedarf zuerst.',
    stufe: 2,
  },
  {
    thema: 'sys-varianten-04',
    frage: 'Warum berücksichtigen Sie den Betriebsablauf des Kunden beim Entwurf?',
    richtig: 'Weil die Anlage in den Ablauf passen muss, sonst wird sie umgangen oder falsch genutzt.',
    falsch: [
      'Weil der Betriebsablauf den Preis senkt.',
      'Weil er die Norm ersetzt.',
    ],
    begruendung:
      'Eine technisch richtige Anlage, die den Ablauf stört, wird abgeschaltet oder umgangen – und ist damit unwirksam.',
    stufe: 3,
  },
  {
    thema: 'sys-varianten-05',
    frage: 'Welches Regelwerk ist bei einer PV-Anlage auf einem Wohngebäude zuerst zu beachten?',
    richtig: 'Die Anschlussbedingungen des Netzbetreibers und die VDE-AR-N 4105.',
    falsch: [
      'Nur die VDE 0100-410.',
      'Nur das Gebäudeenergiegesetz.',
    ],
    begruendung:
      'Der Anschluss an das Netz richtet sich nach den technischen Anschlussbedingungen; die VDE-AR-N 4105 regelt den Parallelbetrieb.',
    stufe: 2,
  },
  {
    thema: 'sys-varianten-06',
    frage: 'Wie begründen Sie einem Kunden die gewählte Variante?',
    richtig: 'Mit dem Vergleich zu den anderen Varianten, den Kosten und dem Nutzen über die Nutzungsdauer.',
    falsch: [
      'Mit der Aussage, dass es die beste ist.',
      'Mit dem Verweis auf den Preis allein.',
    ],
    begruendung:
      'Eine Begründung braucht den Vergleich. Ohne ihn bleibt sie eine Behauptung.',
    stufe: 2,
  },
  {
    thema: 'sys-varianten-07',
    frage: 'Wann weicht eine Lösung von der Norm ab?',
    richtig: 'Nur wenn der Schutzzweck auf andere Weise gleichwertig erfüllt wird und die Abweichung dokumentiert ist.',
    falsch: [
      'Wenn sie preiswerter ist.',
      'Wenn der Kunde es wünscht.',
    ],
    begruendung:
      'Die Norm beschreibt das Schutzziel, nicht den einzigen Weg. Abweichungen sind möglich, solange das Ziel nachweislich erreicht wird.',
    stufe: 3,
  },

  // =========================================================================
  // Systementwurf – Spezifikation und Dokumentation
  // =========================================================================
  {
    thema: 'sys-spezifikation-01',
    frage: 'Was steht in einer Spezifikation?',
    richtig: 'Die Anforderungen mit messbaren Werten, die die Anlage erfüllen muss.',
    falsch: [
      'Die Beschreibung der Lösung.',
      'Der Angebotspreis.',
    ],
    begruendung:
      'Die Spezifikation beschreibt das Was, nicht das Wie. Die Lösung folgt daraus.',
    stufe: 2,
  },
  {
    thema: 'sys-spezifikation-02',
    frage: 'Nach welchen Kriterien wählen Sie ein Betriebsmittel aus?',
    richtig: 'Nach Nennwerten, Schutzart, Umgebungsbedingungen und Herstellerfreigabe für den Einsatzort.',
    falsch: [
      'Nach der Farbe und dem Preis.',
      'Nach der Größe des Gehäuses.',
    ],
    begruendung:
      'Die Kennwerte entscheiden über die Eignung. Ein Betriebsmittel außerhalb seiner Kennwerte ist ein Sicherheitsrisiko.',
    stufe: 2,
  },
  {
    thema: 'sys-spezifikation-04',
    frage: 'Welche Schutzmaßnahme gehört in einen feuchten Raum?',
    richtig: 'Zusätzlicher Schutz durch Fehlerstrom-Schutzeinrichtung mit 30 mA und passende Schutzart.',
    falsch: [
      'Allein die Auswahl eines größeren Querschnitts.',
      'Allein die Verwendung eines Metallgehäuses.',
    ],
    begruendung:
      'In Räumen mit erhöhter Gefährdung greifen zwei Maßnahmen zusammen: der RCD und die Schutzart.',
    stufe: 3,
  },
  {
    thema: 'sys-spezifikation-05',
    frage: 'Nach welchen Kriterien wählen Sie die Software für die Gebäudeautomation?',
    richtig: 'Nach Funktionsumfang, offenen Schnittstellen, Herstellerunabhängigkeit und Schulungsbedarf.',
    falsch: [
      'Nach der Farbe der Oberfläche.',
      'Allein nach dem Preis der Lizenz.',
    ],
    begruendung:
      'Offene Schnittstellen und Herstellerunabhängigkeit entscheiden über die Lebensdauer der Lösung.',
    stufe: 2,
  },
  {
    thema: 'sys-spezifikation-06',
    frage: 'Welche Angabe entnehmen Sie den Herstellerunterlagen für die Leitungsdimensionierung?',
    richtig: 'Den Bemessungsstrom des Betriebsmittels und die zulässigen Anschlussquerschnitte.',
    falsch: [
      'Die Farbe des Gehäuses.',
      'Das Lieferdatum.',
    ],
    begruendung:
      'Der Bemessungsstrom ist die Grundlage der Dimensionierung, die Anschlussquerschnitte begrenzen die Auswahl.',
    stufe: 1,
  },
  {
    thema: 'sys-spezifikation-07',
    frage: 'Wann passen Sie die Schaltungsunterlagen an?',
    richtig: 'Nach jeder Änderung an der Anlage, damit Plan und Ausführung übereinstimmen.',
    falsch: [
      'Nur bei der jährlichen Prüfung.',
      'Nur auf ausdrücklichen Wunsch des Kunden.',
    ],
    begruendung:
      'Ein veralteter Plan ist eine Gefahrenquelle für den nächsten, der an der Anlage arbeitet.',
    stufe: 2,
  },
  {
    thema: 'sys-dokumentation-01',
    frage: 'Was gehört in die Entwurfsdokumentation?',
    richtig: 'Anforderungen, Variantenvergleich, gewählte Lösung, Berechnungen und Pläne.',
    falsch: [
      'Nur die Pläne.',
      'Nur der Angebotspreis.',
    ],
    begruendung:
      'Die Dokumentation muss den Entwurf nachvollziehbar machen – auch die verworfenen Varianten und ihre Gründe.',
    stufe: 2,
  },
  {
    thema: 'sys-dokumentation-02',
    frage: 'Wozu dient eine Datenbank in der technischen Dokumentation?',
    richtig: 'Zur Verwaltung wiederkehrender Angaben wie Betriebsmittel, Klemmen und Kabel.',
    falsch: [
      'Zur Speicherung von Bildern allein.',
      'Zur Berechnung der Kosten.',
    ],
    begruendung:
      'Aus der Datenbank entstehen Klemmenlisten, Stücklisten und Berichte – jeweils konsistent aus einer Quelle.',
    stufe: 2,
  },
  {
    thema: 'sys-dokumentation-03',
    frage: 'Was gehört zu einer vollständigen Anlagenübergabe?',
    richtig: 'Pläne, Messprotokolle, Betriebsanleitungen, Einweisung des Betreibers und Übergabeprotokoll.',
    falsch: [
      'Nur der Schlüssel zum Schaltschrank.',
      'Nur die Rechnung.',
    ],
    begruendung:
      'Erst mit Unterlagen und Einweisung kann der Betreiber die Anlage sicher betreiben und prüfen lassen.',
    stufe: 2,
  },
];

// ---------------------------------------------------------------------------
// Erzeugung
// ---------------------------------------------------------------------------

/** Die Verfahrensfragen eines Themas. */
export function prozessFragenFuerAtom(atom: Atom): ProzessFrage[] {
  return PROZESS_FRAGEN.filter((f) => f.thema === atom.id);
}

/**
 * Baut die Verfahrensaufgaben eines Themas.
 *
 * Gleiche Form wie bei den Wissensaufgaben: Die richtige Antwort steht nicht
 * immer vorn, sie wird aus dem Fragetext abgeleitet. Dadurch sieht dieselbe
 * Frage bei jedem Aufruf gleich aus.
 */
export function prozessAufgabenFuerAtom(atom: Atom): Task[] {
  const aufgaben: Task[] = [];
  for (const f of prozessFragenFuerAtom(atom)) {
    const versatz = [...f.frage].reduce((s, c) => s + c.charCodeAt(0), 0) % 3;
    const kennungen = ['a', 'b', 'c'];
    const falschIds = kennungen.filter((_, i) => i !== versatz);
    const korrekt = kennungen[versatz]!;
    const optionen = kennungen.map((id) => {
      if (id === korrekt) return { id, text: f.richtig };
      return { id, text: f.falsch[falschIds.indexOf(id)]! };
    });

    const rationale: Record<string, string> = { [korrekt]: f.begruendung };
    for (const id of falschIds) {
      rationale[id] = 'Dieser Weg stellt den Zusammenhang falsch dar oder greift zu kurz.';
    }

    const factRefs = (f.factIds ?? [])
      .filter((id) => holeFakt(id))
      .map((id) => ({ factId: id }));

    const bausatz: TaskBausatz = {
      proposal: {
        proposalId: `prozess_${atom.id}_${parameterHash([f.frage, f.richtig])}`,
        format: 'mc',
        stufe: f.stufe,
        estimatedSeconds: f.stufe === 1 ? 30 : 50,
        examArea: atom.bereich,
        topicIds: [atom.id],
        prompt: f.frage,
        options: optionen,
        factRefs,
        learningGoal: `${atom.titel} – Vorgehen und Begründung sicher anwenden.`,
        hint: 'Die falschen Wege sind typische Verwechslungen der Reihenfolge oder der Ursache.',
        origin: 'statisch',
      },
      paramsHash: parameterHash(['prozess', atom.id, f.frage, f.richtig]),
      correctOptionId: korrekt,
      optionRationale: rationale,
      solutionSteps: [
        { label: 'Gesucht ist', result: f.frage },
        { label: 'Zutreffend ist', result: f.richtig, factId: factRefs[0]?.factId },
        { label: 'Begründung', result: f.begruendung },
      ],
      explanation: f.begruendung,
      validierungsOptionen: { duplikatPruefen: false },
    };

    try {
      aufgaben.push(baueTask(bausatz));
    } catch {
      // Eine Frage, die die Validierung nicht besteht, entfällt still.
    }
  }
  return aufgaben;
}
