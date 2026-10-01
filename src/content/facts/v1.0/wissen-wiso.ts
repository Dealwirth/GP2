import type { Fact } from '../../../domain/types.ts';
import { z, t } from './hilfe.ts';

/**
 * Wirtschafts- und Sozialkunde sowie Arbeits- und Betriebsorganisation.
 *
 * Anders als die technischen Bereiche gibt es hier kaum Normzahlen. Was
 * zählt, sind Fristen, Zuständigkeiten und Begriffe aus dem Arbeits-, Sozial-
 * und Umweltrecht sowie der Betriebswirtschaft. Die Zahlen, die es gibt –
 * Arbeitszeit, Urlaub, Kündigungsfristen – sind Grenzwerte und werden als
 * solche abgefragt.
 *
 * Jeder Eintrag nennt das Gesetz. Wo ein Wert nicht am Original geprüft ist,
 * bleibt er `offen` und wird in der App so gekennzeichnet.
 */

export const FAKTEN_WISSEN_WISO: Fact[] = [
  // =========================================================================
  // Ausbildungs- und Arbeitsverhältnis
  // =========================================================================
  t(
    'ausbildungsvertrag-parteien',
    'Wirtschafts- und Sozialkunde',
    'Vertragsparteien des Berufsausbildungsvertrags',
    'elekausbv',
    ['wiso', 'ausbildung', 'vertrag'],
    {
      geprueft: true,
      bemerkung:
        'Den Berufsausbildungsvertrag schließen der Ausbildende und der ' +
        'Auszubildende. Der Ausbildende ist in der Regel der Betrieb. ' +
        'Handwerkskammer und Berufsschule sind nicht Vertragspartei.',
    },
  ),
  t(
    'eintragung-verzeichnis',
    'Wirtschafts- und Sozialkunde',
    'Eintragung des Ausbildungsvertrags in das Verzeichnis',
    'elekausbv',
    ['wiso', 'ausbildung', 'verzeichnis'],
    {
      geprueft: true,
      bemerkung:
        'Der Ausbildende beantragt die Eintragung in das Verzeichnis der ' +
        'Berufsausbildungsverhältnisse bei der zuständigen Stelle – im Handwerk ' +
        'bei der Handwerkskammer. Die Eintragung ist Voraussetzung für die ' +
        'Zulassung zur Prüfung.',
    },
  ),
  z(
    'probezeit-ausbildung',
    'Wirtschafts- und Sozialkunde',
    'Mindestdauer der Probezeit in der Berufsausbildung',
    1,
    'Monat',
    'elekausbv',
    ['wiso', 'ausbildung', 'probezeit'],
    {
      geprueft: true,
      bemerkung:
        'Die Probezeit beträgt mindestens einen Monat und höchstens vier Monate. ' +
        'Sie kann in dieser Zeit nicht verlängert werden. Innerhalb der Probezeit ' +
        'kann das Ausbildungsverhältnis jederzeit ohne Frist gekündigt werden.',
    },
  ),
  z(
    'probezeit-max',
    'Wirtschafts- und Sozialkunde',
    'Höchstdauer der Probezeit in der Berufsausbildung',
    4,
    'Monate',
    'elekausbv',
    ['wiso', 'ausbildung', 'probezeit'],
    {
      geprueft: true,
      bemerkung:
        'Die Probezeit dauert mindestens einen und höchstens vier Monate. ' +
        'Eine Verlängerung ist nur bei Unterbrechung von mehr als einem Drittel ' +
        'zulässig.',
    },
  ),
  t(
    'kuendigung-ausbildung',
    'Wirtschafts- und Sozialkunde',
    'Kündigung des Ausbildungsverhältnisses',
    'elekausbv',
    ['wiso', 'ausbildung', 'kuendigung'],
    {
      geprueft: true,
      bemerkung:
        'Nach der Probezeit kann der Auszubildende mit einer Frist von vier Wochen ' +
        'kündigen, wenn er die Ausbildung aufgibt oder den Beruf wechselt. Der ' +
        'Ausbildende kann nur aus wichtigem Grund ohne Frist kündigen. Schriftform ' +
        'und Angabe des Grundes sind vorgeschrieben.',
    },
  ),
  z(
    'kuendigungsfrist-auszubildender',
    'Wirtschafts- und Sozialkunde',
    'Kündigungsfrist des Auszubildenden nach der Probezeit',
    4,
    'Wochen',
    'elekausbv',
    ['wiso', 'ausbildung', 'kuendigung'],
    {
      geprueft: true,
      bemerkung:
        'Vier Wochen, wenn der Auszubildende die Ausbildung aufgibt oder einen ' +
        'anderen Beruf erlernen will. Die Kündigung muss schriftlich erfolgen und ' +
        'den Grund nennen.',
    },
  ),
  t(
    'jugendarbeitsschutz',
    'Wirtschafts- und Sozialkunde',
    'Anwendungsbereich des Jugendarbeitsschutzgesetzes',
    'jarschg',
    ['wiso', 'jugend', 'arbeitsschutz'],
    {
      geprueft: true,
      bemerkung:
        'Das Gesetz gilt für Beschäftigte unter 18 Jahren. Es begrenzt Arbeitszeit, ' +
        'Ruhepausen und Nachtarbeit und schreibt die ärztliche Erstuntersuchung ' +
        'vor. Für Auszubildende unter 18 Jahren geht es dem Arbeitszeitgesetz vor.',
    },
  ),
  z(
    'jugend-erstuntersuchung',
    'Wirtschafts- und Sozialkunde',
    'Frist der ärztlichen Erstuntersuchung für Jugendliche',
    14,
    'Monate',
    'jarschg',
    ['wiso', 'jugend', 'untersuchung'],
    {
      geprueft: true,
      bemerkung:
        'Die Erstuntersuchung muss mindestens 14 Monate vor Beschäftigungsbeginn ' +
        'vorliegen, die erste Nachuntersuchung nach einem Jahr. Ohne Bescheinigung ' +
        'darf der Jugendliche nicht beschäftigt werden.',
    },
  ),
  z(
    'jugend-nachuntersuchung',
    'Wirtschafts- und Sozialkunde',
    'Frist der Nachuntersuchung für Jugendliche',
    12,
    'Monate',
    'jarschg',
    ['wiso', 'jugend', 'untersuchung'],
    {
      geprueft: true,
      bemerkung:
        'Nach einem Jahr wird die Nachuntersuchung fällig; der Ausbildende muss ' +
        'rechtzeitig auffordern. Vor Vollendung des 18. Lebensjahres ist die ' +
        'Untersuchung nachzuweisen.',
    },
  ),
  z(
    'jugend-arbeitszeit',
    'Wirtschafts- und Sozialkunde',
    'Höchstarbeitszeit Jugendlicher am Tag',
    8,
    'Stunden',
    'jarschg',
    ['wiso', 'jugend', 'arbeitszeit'],
    {
      geprueft: true,
      bemerkung:
        'Acht Stunden täglich und 40 Stunden wöchentlich. Wird an einzelnen Tagen ' +
        'verkürzt gearbeitet, darf die Woche bis auf 8,5 Stunden ausgeglichen ' +
        'werden. Nachtarbeit zwischen 20 und 6 Uhr ist grundsätzlich verboten.',
    },
  ),
  z(
    'jugend-ruhepause-30',
    'Wirtschafts- und Sozialkunde',
    'Ruhepause bei mehr als 4,5 bis 6 Stunden Arbeit (Jugendliche)',
    30,
    'min',
    'jarschg',
    ['wiso', 'jugend', 'pause'],
    {
      geprueft: true,
      bemerkung:
        'Bei mehr als 4,5 bis 6 Stunden Arbeitszeit 30 Minuten, bei mehr als sechs ' +
        'Stunden 60 Minuten. Die Pausen werden nicht auf die Arbeitszeit angerechnet ' +
        'und müssen spätestens eine Stunde nach dem Viertel der Arbeitszeit beginnen.',
    },
  ),
  z(
    'jugend-berufsschule-anrechnung',
    'Wirtschafts- und Sozialkunde',
    'Anrechnung eines Berufsschultags (Jugendliche)',
    8,
    'Stunden',
    'jarschg',
    ['wiso', 'jugend', 'berufsschule'],
    {
      geprueft: true,
      bemerkung:
        'Ein Berufsschultag mit mehr als fünf Unterrichtsstunden wird einmal in der ' +
        'Woche mit acht Stunden angerechnet. Der Ausbildende darf den Jugendlichen ' +
        'an diesem Tag nicht weiter beschäftigen.',
    },
  ),
  t(
    'ausbildungsordnung-inhalt',
    'Wirtschafts- und Sozialkunde',
    'Inhalt der Ausbildungsordnung',
    'elekausbv',
    ['wiso', 'ausbildung', 'ordnung'],
    {
      bemerkung:
        'Die Ausbildungsordnung regelt Bezeichnung des Ausbildungsberufs, ' +
        'Ausbildungsdauer, Ausbildungsberufsbild, Ausbildungsrahmenplan und ' +
        'Prüfungsanforderungen. Sie ist die Grundlage des betrieblichen ' +
        'Ausbildungsplans.',
    },
  ),
  t(
    'pflichten-ausbildender',
    'Wirtschafts- und Sozialkunde',
    'Pflichten des Ausbildenden',
    'elekausbv',
    ['wiso', 'ausbildung', 'pflichten'],
    {
      geprueft: true,
      bemerkung:
        'Ausbilden, Ausbildungsmittel kostenlos bereitstellen, zum Berufsschul- ' +
        'unterricht anhalten und freistellen, Ausbildungsnachweis durchsehen und ' +
        'Vergütung zahlen. Außerdem Fürsorgepflicht und Zeugnis am Ende.',
    },
  ),
  t(
    'pflichten-auszubildender',
    'Wirtschafts- und Sozialkunde',
    'Pflichten des Auszubildenden',
    'elekausbv',
    ['wiso', 'ausbildung', 'pflichten'],
    {
      geprueft: true,
      bemerkung:
        'Lernpflicht, Sorgfaltspflicht, Weisungsgebundenheit, Berufsschulbesuch, ' +
        'Führung des Ausbildungsnachweises, Schweigepflicht und Schadensvermeidung. ' +
        'Der Ausbildungsnachweis ist regelmäßig zu führen.',
    },
  ),
  t(
    'ausbildungsnachweis',
    'Wirtschafts- und Sozialkunde',
    'Ausbildungsnachweis – Form und Zweck',
    'elekausbv',
    ['wiso', 'ausbildung', 'nachweis'],
    {
      bemerkung:
        'Der Ausbildungsnachweis wird schriftlich oder elektronisch geführt, ' +
        'mindestens wöchentlich, und vom Ausbildenden regelmäßig durchgesehen. Er ' +
        'ist Grundlage der Zulassung zur Abschlussprüfung.',
    },
  ),
  t(
    'zeugnis-arten',
    'Wirtschafts- und Sozialkunde',
    'Zeugnis am Ende der Ausbildung',
    'elekausbv',
    ['wiso', 'ausbildung', 'zeugnis'],
    {
      geprueft: true,
      bemerkung:
        'Der Ausbildende stellt bei Beendigung ein Zeugnis aus. Es enthält Art, ' +
        'Dauer und Ziel der Ausbildung sowie die erworbenen Fertigkeiten und ' +
        'Kenntnisse. Auf Verlangen werden Führung, Leistung und besondere ' +
        'fachliche Fähigkeiten aufgenommen.',
    },
  ),

  // =========================================================================
  // Arbeitszeit, Urlaub, Entgelt
  // =========================================================================
  z(
    'arbeitszeit-werktag',
    'Wirtschafts- und Sozialkunde',
    'Höchstarbeitszeit an Werktagen nach Arbeitszeitgesetz',
    8,
    'Stunden',
    'arbzg',
    ['wiso', 'arbeitszeit', 'werktag'],
    {
      geprueft: true,
      bemerkung:
        'Acht Stunden werktäglich, verlängerbar auf zehn Stunden, wenn innerhalb ' +
        'von sechs Monaten der Durchschnitt von acht Stunden eingehalten wird. ' +
        'Die Werktage sind Montag bis Samstag.',
    },
  ),
  z(
    'arbeitszeit-woche',
    'Wirtschafts- und Sozialkunde',
    'Höchstarbeitszeit in der Woche nach Arbeitszeitgesetz',
    48,
    'Stunden',
    'arbzg',
    ['wiso', 'arbeitszeit', 'woche'],
    {
      geprueft: true,
      bemerkung:
        'Sechs Werktage mit je acht Stunden ergeben 48 Stunden. Im Tarifvertrag ' +
        'sind meist 35 bis 40 Stunden vereinbart – das ist günstiger und geht vor.',
    },
  ),
  z(
    'ruhepause-30',
    'Wirtschafts- und Sozialkunde',
    'Ruhepause bei mehr als 6 bis 9 Stunden Arbeitszeit',
    30,
    'min',
    'arbzg',
    ['wiso', 'pause', 'arbeitszeit'],
    {
      geprueft: true,
      bemerkung:
        'Bei mehr als sechs bis neun Stunden 30 Minuten, bei mehr als neun Stunden ' +
        '45 Minuten. Pausen unter 15 Minuten werden nicht angerechnet; spätestens ' +
        'nach sechs Stunden muss eine Pause genommen werden.',
    },
  ),
  z(
    'ruhepause-45',
    'Wirtschafts- und Sozialkunde',
    'Ruhepause bei mehr als 9 Stunden Arbeitszeit',
    45,
    'min',
    'arbzg',
    ['wiso', 'pause', 'arbeitszeit'],
    {
      geprueft: true,
      bemerkung:
        '45 Minuten bei mehr als neun Stunden Arbeitszeit. Die Pausen können ' +
        'aufgeteilt werden, jede Teilpause muss aber mindestens 15 Minuten betragen.',
    },
  ),
  z(
    'ruhezeit-11h',
    'Wirtschafts- und Sozialkunde',
    'Mindestruhezeit zwischen zwei Arbeitstagen',
    11,
    'Stunden',
    'arbzg',
    ['wiso', 'ruhezeit', 'arbeitszeit'],
    {
      geprueft: true,
      bemerkung:
        'Elf Stunden ununterbrochene Ruhezeit nach Beendigung der täglichen ' +
        'Arbeitszeit. Verkürzungen sind nur in bestimmten Branchen mit Ausgleich ' +
        'zulässig.',
    },
  ),
  z(
    'urlaub-mindestanspruch',
    'Wirtschafts- und Sozialkunde',
    'Gesetzlicher Mindesturlaub',
    24,
    'Werktage',
    'arbzg',
    ['wiso', 'urlaub', 'erholung'],
    {
      geprueft: true,
      bemerkung:
        'Vierundzwanzig Werktage nach dem Bundesurlaubsgesetz. Bei einer ' +
        'Fünf-Tage-Woche entspricht das 20 Arbeitstagen. Tarifverträge sehen ' +
        'meist 30 Arbeitstage vor.',
    },
  ),
  t(
    'urlaub-wartezeit',
    'Wirtschafts- und Sozialkunde',
    'Wartezeit für den vollen Urlaubsanspruch',
    'arbzg',
    ['wiso', 'urlaub', 'wartezeit'],
    {
      bemerkung:
        'Der volle Urlaubsanspruch entsteht nach sechs Monaten des Bestehens des ' +
        'Arbeitsverhältnisses. Danach gilt der Urlaub als verdient und muss im ' +
        'laufenden oder im folgenden Kalenderjahr genommen werden.',
    },
  ),
  t(
    'lohn-und-gehalt',
    'Wirtschafts- und Sozialkunde',
    'Unterschied zwischen Lohn und Gehalt',
    'sgb4',
    ['wiso', 'lohn', 'gehalt'],
    {
      bemerkung:
        'Lohn wird für geleistete Arbeitszeit gezahlt, meist stündlich an ' +
        'Arbeiter. Gehalt wird monatlich fest gezahlt, meist an Angestellte. ' +
        'Beide sind Arbeitsentgelt und unterliegen derselben Sozialversicherung.',
    },
  ),
  t(
    'sozialversicherung-zweige',
    'Wirtschafts- und Sozialkunde',
    'Die fünf Zweige der Sozialversicherung',
    'sgb4',
    ['wiso', 'sozialversicherung', 'beitraege'],
    {
      geprueft: true,
      bemerkung:
        'Krankenversicherung, Pflegeversicherung, Rentenversicherung, ' +
        'Arbeitslosenversicherung und Unfallversicherung. Die ersten vier zahlen ' +
        'Arbeitgeber und Arbeitnehmer je zur Hälfte, die Unfallversicherung ' +
        'zahlt allein der Arbeitgeber.',
    },
  ),
  t(
    'beitragsbemessungsgrenze',
    'Wirtschafts- und Sozialkunde',
    'Beitragsbemessungsgrenze',
    'sgb4',
    ['wiso', 'sozialversicherung', 'grenze'],
    {
      bemerkung:
        'Beiträge werden nur bis zur Beitragsbemessungsgrenze erhoben; darüber ' +
        'liegendes Entgelt ist beitragsfrei. Die Grenze wird jährlich angepasst ' +
        'und unterscheidet sich zwischen Kranken- und Rentenversicherung.',
    },
  ),
  t(
    'steuerklassen',
    'Wirtschafts- und Sozialkunde',
    'Lohnsteuerklassen',
    'sgb4',
    ['wiso', 'steuer', 'lohnsteuer'],
    {
      bemerkung:
        'Klasse I ledig, II alleinerziehend, III verheiratet mit höherem Einkommen, ' +
        'IV verheiratet mit ähnlichem Einkommen, V verheiratet mit geringerem ' +
        'Einkommen, VI für Zweitbeschäftigungen. Die Klasse bestimmt die Höhe des ' +
        'Lohnsteuerabzugs.',
    },
  ),
  t(
    'brutto-netto',
    'Wirtschafts- und Sozialkunde',
    'Vom Bruttolohn zum Nettolohn',
    'sgb4',
    ['wiso', 'lohn', 'abzuege'],
    {
      bemerkung:
        'Vom Bruttolohn werden Lohnsteuer, Solidaritätszuschlag, gegebenenfalls ' +
        'Kirchensteuer und die Arbeitnehmeranteile der Sozialversicherung ' +
        'abgezogen. Was bleibt, ist der Nettolohn.',
    },
  ),
  t(
    'vermoegenswirksame-leistungen',
    'Wirtschafts- und Sozialkunde',
    'Vermögenswirksame Leistungen',
    'sgb4',
    ['wiso', 'vermoegensbildung', 'lohn'],
    {
      bemerkung:
        'Der Arbeitgeber zahlt einen Teil des Entgelts in einen Sparvertrag. ' +
        'Tariflich sind 26 bis 40 Euro monatlich üblich. Die Anlageform wählt ' +
        'der Arbeitnehmer.',
    },
  ),

  // =========================================================================
  // Betrieb, Mitbestimmung, Tarif
  // =========================================================================
  t(
    'betriebsrat-mitbestimmung',
    'Wirtschafts- und Sozialkunde',
    'Mitbestimmung des Betriebsrats',
    'betrvg',
    ['wiso', 'betriebsrat', 'mitbestimmung'],
    {
      geprueft: true,
      bemerkung:
        'Der Betriebsrat hat bei personellen, sozialen und wirtschaftlichen ' +
        'Angelegenheiten unterschiedlich starke Rechte: Mitbestimmung, ' +
        'Anhörung, Beratung oder Information. Bei Einstellung, Umgruppierung ' +
        'und Kündigung hat er mitzubestimmen.',
    },
  ),
  t(
    'betriebsrat-groesse',
    'Wirtschafts- und Sozialkunde',
    'Wahl des Betriebsrats',
    'betrvg',
    ['wiso', 'betriebsrat', 'wahl'],
    {
      bemerkung:
        'Ein Betriebsrat wird gewählt, wenn mindestens fünf wahlberechtigte ' +
        'Arbeitnehmer beschäftigt sind, von denen drei wählbar sind. Die Zahl ' +
        'der Betriebsratsmitglieder steigt mit der Beschäftigtenzahl.',
    },
  ),
  t(
    'tarifvertrag-arten',
    'Wirtschafts- und Sozialkunde',
    'Arten des Tarifvertrags',
    'betrvg',
    ['wiso', 'tarif', 'vertrag'],
    {
      bemerkung:
        'Der Rahmentarifvertrag regelt Arbeitsbedingungen wie Arbeitszeit und ' +
        'Urlaub, der Lohntarifvertrag die Entgelte, der Manteltarifvertrag den ' +
        'Rahmen. Tarifverträge werden zwischen Gewerkschaft und Arbeitgeber ' +
        'oder Arbeitgeberverband geschlossen.',
    },
  ),
  t(
    'tarifautonomie',
    'Wirtschafts- und Sozialkunde',
    'Tarifautonomie und Friedenspflicht',
    'betrvg',
    ['wiso', 'tarif', 'arbeitskampf'],
    {
      bemerkung:
        'Tarifvertragsparteien regeln Arbeitsbedingungen ohne staatliche ' +
        'Einmischung. Während der Laufzeit eines Tarifvertrags gilt Friedenspflicht; ' +
        'Arbeitskampf ist erst nach Ablauf und nach dem Scheitern der ' +
        'Verhandlungen zulässig.',
    },
  ),
  t(
    'kuendigung-arten',
    'Wirtschafts- und Sozialkunde',
    'Ordentliche und außerordentliche Kündigung',
    'arbzg',
    ['wiso', 'kuendigung', 'arbeitsvertrag'],
    {
      bemerkung:
        'Die ordentliche Kündigung hält die Frist ein und braucht keinen Grund, ' +
        'die außerordentliche Kündigung wirkt sofort und braucht einen wichtigen ' +
        'Grund. Bei Betrieben mit mehr als zehn Beschäftigten gilt das ' +
        'Kündigungsschutzgesetz.',
    },
  ),
  t(
    'kuendigungsschutz-klage',
    'Wirtschafts- und Sozialkunde',
    'Kündigungsschutzklage – Frist',
    'arbzg',
    ['wiso', 'kuendigung', 'klage'],
    {
      bemerkung:
        'Wer die Unwirksamkeit einer Kündigung geltend machen will, muss innerhalb ' +
        'von drei Wochen nach Zugang beim Arbeitsgericht klagen. Danach gilt die ' +
        'Kündigung als wirksam.',
    },
  ),
  t(
    'betriebsvereinbarung',
    'Wirtschafts- und Sozialkunde',
    'Betriebsvereinbarung',
    'betrvg',
    ['wiso', 'betriebsvereinbarung', 'mitbestimmung'],
    {
      bemerkung:
        'Eine Betriebsvereinbarung wird zwischen Arbeitgeber und Betriebsrat ' +
        'geschlossen und gilt unmittelbar für alle Beschäftigten des Betriebs. ' +
        'Sie darf einen Tarifvertrag nicht unterschreiten.',
    },
  ),
  t(
    'ausbildung-im-handwerk',
    'Wirtschafts- und Sozialkunde',
    'Zuständige Stelle im Handwerk',
    'elekausbv',
    ['wiso', 'handwerk', 'zuständigkeit'],
    {
      geprueft: true,
      bemerkung:
        'Für Handwerksberufe wie den Elektroniker ist die Handwerkskammer die ' +
        'zuständige Stelle – nicht die IHK. Sie führt das Verzeichnis, berät in ' +
        'Ausbildungsfragen und errichtet den Prüfungsausschuss.',
    },
  ),

  // =========================================================================
  // Haftung, Versicherung, Arbeitssicherheit
  // =========================================================================
  t(
    'haftung-arbeitnehmer',
    'Wirtschafts- und Sozialkunde',
    'Haftung des Arbeitnehmers für Schäden',
    'sgb4',
    ['wiso', 'haftung', 'schaden'],
    {
      bemerkung:
        'Bei leichter Fahrlässigkeit haftet der Arbeitnehmer nicht, bei mittlerer ' +
        'quotel der Arbeitgeber anteilig, bei grober Fahrlässigkeit und Vorsatz ' +
        'haftet der Arbeitnehmer. Maßgeblich sind Verschulden und Betriebsrisiko.',
    },
  ),
  t(
    'gesetzliche-unfallversicherung',
    'Wirtschafts- und Sozialkunde',
    'Gesetzliche Unfallversicherung',
    'dguv1',
    ['wiso', 'unfallversicherung', 'berufsgenossenschaft'],
    {
      geprueft: true,
      bemerkung:
        'Träger sind die Berufsgenossenschaften. Beiträge zahlt allein der ' +
        'Arbeitgeber. Versichert sind Arbeitsunfälle und Berufskrankheiten ' +
        'einschließlich des Weges zur Arbeit.',
    },
  ),
  t(
    'berufsgenossenschaft-meldung',
    'Wirtschafts- und Sozialkunde',
    'Meldung eines Arbeitsunfalls',
    'dguv1',
    ['wiso', 'unfall', 'meldung'],
    {
      bemerkung:
        'Ein Unfall mit mehr als drei Tagen Arbeitsunfähigkeit wird der ' +
        'Berufsgenossenschaft gemeldet, ein Unfall in einem fremden Betrieb ' +
        'zusätzlich der Aufsichtsperson. Der Unfall ist im Unfallbuch zu ' +
        'dokumentieren.',
    },
  ),
  z(
    'unfallmeldung-tage',
    'Wirtschafts- und Sozialkunde',
    'Meldegrenze für Arbeitsunfälle',
    3,
    'Tage',
    'dguv1',
    ['wiso', 'unfall', 'meldung'],
    {
      geprueft: true,
      bemerkung:
        'Mehr als drei Tage Arbeitsunfähigkeit lösen die Meldepflicht aus. ' +
        'Ein Unfall mit Todesfolge wird unverzüglich gemeldet.',
    },
  ),
  t(
    'gefaehrdungsbeurteilung',
    'Wirtschafts- und Sozialkunde',
    'Gefährdungsbeurteilung',
    'arbeitsschutzgesetz',
    ['wiso', 'arbeitsschutz', 'beurteilung'],
    {
      geprueft: true,
      bemerkung:
        'Der Arbeitgeber beurteilt die Gefährdungen der Arbeit, leitet Maßnahmen ' +
        'ab, führt sie durch und überprüft sie. Die Beurteilung ist zu ' +
        'dokumentieren und bei Änderungen fortzuschreiben.',
    },
  ),
  t(
    'unterweisung-arbeitsschutz',
    'Wirtschafts- und Sozialkunde',
    'Unterweisung der Beschäftigten',
    'arbeitsschutzgesetz',
    ['wiso', 'unterweisung', 'arbeitsschutz'],
    {
      bemerkung:
        'Vor der ersten Beschäftigung und danach mindestens jährlich wird ' +
        'unterwiesen, bei Jugendlichen halbjährlich. Die Unterweisung erfolgt ' +
        'praxisnah und wird dokumentiert.',
    },
  ),
  t(
    'psa-bereitstellung',
    'Wirtschafts- und Sozialkunde',
    'Persönliche Schutzausrüstung – Kosten',
    'arbeitsschutzgesetz',
    ['wiso', 'psa', 'arbeitsschutz'],
    {
      bemerkung:
        'Der Arbeitgeber stellt die erforderliche persönliche Schutzausrüstung ' +
        'kostenlos bereit und weist in ihre Benutzung ein. Sie darf nicht ' +
        'verändert werden und ist bei Verschleiß zu ersetzen.',
    },
  ),
  t(
    'datenschutz-mitarbeiter',
    'Wirtschafts- und Sozialkunde',
    'Datenschutz im Beschäftigungsverhältnis',
    'bdsg',
    ['wiso', 'datenschutz', 'beschaeftigte'],
    {
      geprueft: true,
      bemerkung:
        'Beschäftigtendaten dürfen nur für Zwecke des Beschäftigungsverhältnisses ' +
        'verarbeitet werden. Videoüberwachung ist nur bei berechtigtem Interesse ' +
        'und mit Kenntnis der Beschäftigten zulässig, heimliche Überwachung nicht.',
    },
  ),

  // =========================================================================
  // Kalkulation und Betriebswirtschaft
  // =========================================================================
  t(
    'angebotskalkulation',
    'Wirtschafts- und Sozialkunde',
    'Aufbau eines Angebotspreises',
    'nav',
    ['wiso', 'kalkulation', 'angebot'],
    {
      bemerkung:
        'Materialkosten plus Fertigungskosten ergeben die Herstellkosten, dazu ' +
        'Verwaltungs- und Vertriebskosten, Wagnis und Gewinn. Hinzu kommt die ' +
        'Umsatzsteuer von 19 %. Die Reihenfolge macht den Preis nachvollziehbar.',
    },
  ),
  z(
    'umsatzsteuer-regelsatz',
    'Wirtschafts- und Sozialkunde',
    'Regelsatz der Umsatzsteuer',
    19,
    '%',
    'nav',
    ['wiso', 'umsatzsteuer', 'kalkulation'],
    {
      geprueft: true,
      bemerkung:
        'Der Regelsatz beträgt 19 %. Für bestimmte Leistungen gilt der ermäßigte ' +
        'Satz von 7 %. Der Vorsteuerabzug setzt eine ordnungsgemäße Rechnung voraus.',
    },
  ),
  t(
    'deckungsbeitrag',
    'Wirtschafts- und Sozialkunde',
    'Deckungsbeitrag und Deckungsbeitragsrechnung',
    'nav',
    ['wiso', 'kalkulation', 'deckungsbeitrag'],
    {
      bemerkung:
        'Der Deckungsbeitrag ist der Verkaufspreis abzüglich der variablen Kosten. ' +
        'Er deckt zuerst die Fixkosten, danach entsteht Gewinn. Ein positiver ' +
        'Deckungsbeitrag trägt also auch dann zur Fixkostendeckung bei, wenn die ' +
        'volle Kostendeckung fehlt.',
    },
  ),
  t(
    'liquiditaet',
    'Wirtschafts- und Sozialkunde',
    'Liquidität und Zahlungsfähigkeit',
    'nav',
    ['wiso', 'liquiditaet', 'finanzierung'],
    {
      bemerkung:
        'Liquidität heißt, fällige Zahlungen termingerecht leisten zu können. ' +
        'Sie ist die Voraussetzung jeder Betriebstätigkeit; fehlende Liquidität ' +
        'führt zur Zahlungsunfähigkeit und damit zur Insolvenz.',
    },
  ),
  t(
    'kosten-arten',
    'Wirtschafts- und Sozialkunde',
    'Einzelkosten und Gemeinkosten',
    'nav',
    ['wiso', 'kosten', 'kalkulation'],
    {
      bemerkung:
        'Einzelkosten lassen sich einer Leistung direkt zurechnen, etwa das ' +
        'verbaute Kabel. Gemeinkosten fallen für den Betrieb insgesamt an und ' +
        'werden über Zuschlagssätze verteilt, etwa Miete und Werkzeugkosten.',
    },
  ),
  t(
    'wirtschaftlichkeit',
    'Wirtschafts- und Sozialkunde',
    'Wirtschaftlichkeit einer Maßnahme',
    'nav',
    ['wiso', 'wirtschaftlichkeit', 'bewertung'],
    {
      bemerkung:
        'Wirtschaftlich ist ein Verhältnis von Ertrag zu Aufwand größer eins. ' +
        'Für Investitionen wird die Amortisationszeit berechnet: Anschaffungskosten ' +
        'geteilt durch jährliche Einsparung.',
    },
  ),
  t(
    'amortisation',
    'Wirtschafts- und Sozialkunde',
    'Amortisationsrechnung',
    'nav',
    ['wiso', 'amortisation', 'investition'],
    {
      bemerkung:
        'Die Amortisationszeit ergibt sich aus den Anschaffungskosten geteilt ' +
        'durch die jährliche Einsparung. Sie sagt, nach wie vielen Jahren die ' +
        'Investition zurückgeflossen ist; kürzere Zeiten sind günstiger.',
    },
  ),
  t(
    'nachhaltigkeit-bewertung',
    'Wirtschafts- und Sozialkunde',
    'Nachhaltigkeit einer Lösung bewerten',
    'gebaeudeenergiegesetz',
    ['wiso', 'nachhaltigkeit', 'umwelt'],
    {
      bemerkung:
        'Bewertet werden Energiebedarf im Betrieb, Lebensdauer, Reparierbarkeit, ' +
        'Recyclingfähigkeit und Herkunft der Materialien. Eine Lösung ist ' +
        'nachhaltig, wenn sie über die gesamte Nutzungsdauer den geringsten ' +
        'Ressourcenverbrauch hat.',
    },
  ),
  t(
    'energiewende-rolle',
    'Wirtschafts- und Sozialkunde',
    'Rolle des Elektrohandwerks in der Energiewende',
    'eeg',
    ['wiso', 'energiewende', 'elektrohandwerk'],
    {
      bemerkung:
        'Das Elektrohandwerk errichtet Photovoltaik, Speicher, Ladeinfrastruktur ' +
        'und Wärmepumpenanschlüsse und berät zur Sektorkopplung. Es entscheidet ' +
        'damit über die Umsetzung der Energiewende im Gebäude.',
    },
  ),
  t(
    'digitale-arbeitsmittel',
    'Wirtschafts- und Sozialkunde',
    'Digitale Arbeitsmittel im Handwerk',
    'bdsg',
    ['wiso', 'digitalisierung', 'werkzeug'],
    {
      bemerkung:
        'Mobile Geräte für Aufmaß, Dokumentation und Zeiterfassung, digitale ' +
        'Schaltplanprogramme und Fernwartung. Sie beschleunigen die Arbeit, ' +
        'verlangen aber Sorgfalt beim Umgang mit personenbezogenen Daten.',
    },
  ),
  t(
    'informationssicherheit-grundregeln',
    'Wirtschafts- und Sozialkunde',
    'Grundregeln der Informationssicherheit',
    'bdsg',
    ['wiso', 'it-sicherheit', 'passwort'],
    {
      bemerkung:
        'Starke, getrennte Passwörter, keine Weitergabe von Zugangsdaten, ' +
        'Verschlüsselung mobiler Datenträger, regelmäßige Sicherung, Vorsicht ' +
        'bei fremden Anhängen und Links. Das schwächste Glied ist der Mensch.',
    },
  ),
];
