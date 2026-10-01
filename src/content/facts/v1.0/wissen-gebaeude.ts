import type { Fact } from '../../../domain/types.ts';
import { z, t } from './hilfe.ts';

/**
 * Gebäudetechnik und Gebäudesystemtechnik.
 *
 * Der Bereich, der in der Prüfung am stärksten gewachsen ist: Photovoltaik,
 * Wärmepumpe, Ladeinfrastruktur, Überspannungsschutz, Sicherheitsbeleuchtung
 * und Gebäudeautomation. Genau hier fehlt vielen Prüflingen die Zahl – die
 * Ausbildung deckt die Grundlagen ab, die Prüfung fragt die Anlage.
 */

export const FAKTEN_WISSEN_GEBAEUDE: Fact[] = [
  // =========================================================================
  // Photovoltaik
  // =========================================================================
  z(
    'pv-leerlaufspannung-temperatur',
    'Photovoltaik',
    'Temperaturkoeffizient der Leerlaufspannung',
    -0.3,
    '%/K',
    'vde0100_712',
    ['photovoltaik', 'temperatur', 'spannung'],
    {
      geprueft: true,
      bemerkung:
        'Die Leerlaufspannung sinkt mit steigender Temperatur um etwa 0,3 % je Kelvin. ' +
        'Bei Kälte steigt sie entsprechend: Für die Auslegung des Wechselrichters ' +
        'ist die Leerlaufspannung bei der tiefsten zu erwartenden Modultemperatur ' +
        'maßgeblich, meist bei −10 °C.',
    },
  ),
  z(
    'pv-strom-temperatur',
    'Photovoltaik',
    'Temperaturkoeffizient des Kurzschlussstroms',
    0.05,
    '%/K',
    'vde0100_712',
    ['photovoltaik', 'temperatur', 'strom'],
    {
      bemerkung:
        'Der Kurzschlussstrom steigt mit der Temperatur leicht an, um rund 0,05 % ' +
        'je Kelvin. Für die Auslegung der Leitungen und der Absicherung ist deshalb ' +
        'der Kurzschlussstrom bei hoher Einstrahlung und Wärme maßgeblich.',
    },
  ),
  z(
    'pv-strangstrom-grenze',
    'Photovoltaik',
    'Zulässiger Strom je Strang bei Parallelschaltung',
    0,
    'A (Gerätewert)',
    'vde0100_712',
    ['photovoltaik', 'strang', 'sicherung'],
    {
      bemerkung:
        'Der zulässige Rückstrom einer Modulreihe steht im Datenblatt des Moduls, ' +
        'üblich sind 15 A bis 20 A. Mehr als zwei parallele Stränge werden deshalb ' +
        'je Strang abgesichert, meist mit gPV-Sicherungen.',
    },
  ),
  z(
    'pv-ueberspannungsschutz',
    'Photovoltaik',
    'Überspannungsschutz an der PV-Anlage – Zuordnung',
    2,
    'Typ',
    'vde0100_534',
    ['photovoltaik', 'ueberspannungsschutz', 'blitzschutz'],
    {
      bemerkung:
        'Typ 2 am Wechselrichter auf der DC-Seite und in der Nähe des Zählerplatzes ' +
        'auf der AC-Seite. Typ 1 nur, wenn ein äußerer Blitzschutz vorhanden ist ' +
        'oder die Leitung vom Dach lang ist.',
    },
  ),
  t(
    'pv-netz-und-anlagenschutz',
    'Photovoltaik',
    'NA-Schutz der Erzeugungsanlage',
    'vde_ar_n4105',
    ['photovoltaik', 'na-schutz', 'netz'],
    {
      geprueft: true,
      bemerkung:
        'Der Netz- und Anlagenschutz überwacht Spannung und Frequenz und trennt die ' +
        'Anlage bei Überschreitung vom Netz. Er schützt das Netz vor Inselbildung ' +
        'und ist für Anlagen nach VDE-AR-N 4105 vorgeschrieben.',
    },
  ),
  z(
    'pv-blindleistung-grenze',
    'Photovoltaik',
    'Blindleistungsbereitstellung von Erzeugungsanlagen',
    0.9,
    'cos φ',
    'vde_ar_n4105',
    ['photovoltaik', 'blindleistung', 'netz'],
    {
      bemerkung:
        'Erzeugungsanlagen müssen im Bereich cos φ von 0,9 untererregt bis 0,9 ' +
        'übererregt Blindleistung bereitstellen können. Der Netzbetreiber gibt ' +
        'die Kennlinie vor.',
    },
  ),
  t(
    'pv-einspeisemanagement',
    'Photovoltaik',
    'Wirkleistungsbegrenzung und Einspeisemanagement',
    'eeg',
    ['photovoltaik', 'einspeisung', 'netz'],
    {
      bemerkung:
        'Der Netzbetreiber kann die Einspeiseleistung ferngesteuert begrenzen. ' +
        'Anlagen müssen dafür eine Steuereinrichtung vorhalten; kleine Anlagen ' +
        'dürfen stattdessen auf einen festen Prozentsatz der Leistung begrenzt werden.',
    },
  ),
  t(
    'pv-zweirichtungszaehler',
    'Photovoltaik',
    'Zählerkonzept bei Einspeisung',
    'nav',
    ['photovoltaik', 'zaehler', 'einspeisung'],
    {
      bemerkung:
        'Bezug und Einspeisung werden getrennt gezählt, entweder mit zwei Zählern ' +
        'oder mit einem Zweirichtungszähler. Der Zählerplatz muss den Anforderungen ' +
        'des Netzbetreibers entsprechen.',
    },
  ),
  t(
    'pv-freischaltung',
    'Photovoltaik',
    'Freischalten einer PV-Anlage',
    'vde0105_100',
    ['photovoltaik', 'sicherheit', 'freischalten'],
    {
      bemerkung:
        'Die DC-Seite lässt sich nicht über einen zentralen Schalter abschalten, ' +
        'solange Licht auf die Module fällt. Vor Arbeiten werden deshalb der ' +
        'DC-Freischalter am Wechselrichter geöffnet, der AC-Schalter getrennt und ' +
        'die DC-Stecker nur mit Werkzeug und Schutzausrüstung gelöst.',
    },
  ),
  z(
    'pv-modulwirkungsgrad',
    'Photovoltaik',
    'Wirkungsgrad marktüblicher PV-Module',
    21,
    '%',
    'din_v_18599',
    ['photovoltaik', 'wirkungsgrad', 'ertrag'],
    {
      bemerkung:
        'Monokristalline Module erreichen 20 % bis 23 %, polykristalline etwas ' +
        'weniger. Der Systemwirkungsgrad der Anlage liegt wegen Wechselrichter, ' +
        'Leitungen und Verschmutzung darunter, typisch bei 80 % bis 85 %.',
    },
  ),

  // =========================================================================
  // Wärmepumpe und Heizung
  // =========================================================================
  z(
    'waermepumpe-jaz-luft',
    'Wärmepumpe',
    'Jahresarbeitszahl einer Luft-Wasser-Wärmepumpe',
    3.5,
    'Faktor',
    'din_v_18599',
    ['waermepumpe', 'jaz', 'energie'],
    {
      geprueft: true,
      bemerkung:
        'Eine Luft-Wasser-Wärmepumpe erreicht im Bestand rund 3 bis 4, im ' +
        'sanierten Gebäude bis 4,5. Erdreich-Wärmepumpen liegen höher, weil die ' +
        'Quellentemperatur im Winter weniger stark sinkt.',
    },
  ),
  z(
    'waermepumpe-jaz-erde',
    'Wärmepumpe',
    'Jahresarbeitszahl einer Erdreich-Wärmepumpe',
    4.5,
    'Faktor',
    'din_v_18599',
    ['waermepumpe', 'jaz', 'energie'],
    {
      bemerkung:
        'Erdreich-Wärmepumpen erreichen 4 bis 5, weil die Erdreichtemperatur ' +
        'ganzjährig nahezu konstant bleibt. Sole-Wasser-Anlagen liegen am höchsten.',
    },
  ),
  t(
    'waermepumpe-jaz-vs-cop',
    'Wärmepumpe',
    'Leistungszahl COP und Jahresarbeitszahl JAZ',
    'din_v_18599',
    ['waermepumpe', 'cop', 'jaz'],
    {
      geprueft: true,
      bemerkung:
        'Der COP gilt für einen einzelnen Betriebspunkt unter Normbedingungen. ' +
        'Die JAZ ist der Mittelwert über das ganze Jahr und damit die ehrliche ' +
        'Kennzahl. Die JAZ ist immer kleiner als der COP.',
    },
  ),
  z(
    'waermepumpe-vorlauftemperatur',
    'Wärmepumpe',
    'Richtwert der Vorlauftemperatur für wirtschaftlichen Betrieb',
    45,
    '°C',
    'din_v_18599',
    ['waermepumpe', 'vorlauf', 'heizung'],
    {
      bemerkung:
        'Je niedriger die Vorlauftemperatur, desto besser die JAZ. Als Richtwert ' +
        'gelten 45 °C oder weniger, erreichbar mit Fußbodenheizung oder großen ' +
        'Heizkörpern. Jedes Kelvin senkt die JAZ um rund 2 %.',
    },
  ),
  t(
    'waermepumpe-heizlast',
    'Wärmepumpe',
    'Heizlast als Grundlage der Dimensionierung',
    'din_en_12831',
    ['waermepumpe', 'heizlast', 'dimensionierung'],
    {
      geprueft: true,
      bemerkung:
        'Die Wärmepumpe wird nach der Heizlast des Gebäudes ausgelegt, nicht nach ' +
        'der Leistung des alten Kessels. Die Heizlast ergibt sich aus ' +
        'Transmissionsverlusten, Lüftungsverlusten und der Norm-Außentemperatur.',
    },
  ),
  t(
    'waermepumpe-anschluss',
    'Wärmepumpe',
    'Elektrischer Anschluss einer Wärmepumpe',
    'vde0100_530',
    ['waermepumpe', 'anschluss', 'absicherung'],
    {
      bemerkung:
        'Wärmepumpen werden als eigener Stromkreis mit eigenem Leitungsschutzschalter ' +
        'geführt, oft mit Drehstrom. Für die Sperrzeit des Energieversorgers wird ' +
        'ein Rundsteuerempfänger oder ein Sperrschütz vorgesehen.',
    },
  ),
  z(
    'waermepumpe-sperrzeit',
    'Wärmepumpe',
    'Übliche Sperrzeit für Wärmepumpenstrom',
    2,
    'Stunden',
    'taevo',
    ['waermepumpe', 'sperrzeit', 'tarif'],
    {
      bemerkung:
        'Der Netzbetreiber darf den Wärmepumpenstrom bis zu zwei Stunden täglich ' +
        'sperren, meist in drei Blöcken. Die Anlage muss diese Zeit thermisch ' +
        'überbrücken, etwa über den Speicher oder die Gebäudemasse.',
    },
  ),

  // =========================================================================
  // Ladeinfrastruktur (Wallbox)
  // =========================================================================
  t(
    'wallbox-pflicht-rcd',
    'Ladeinfrastruktur',
    'Fehlerstromschutz an der Ladeeinrichtung',
    'vde0100_722',
    ['wallbox', 'rcd', 'schutz'],
    {
      geprueft: true,
      bemerkung:
        'Jeder Ladepunkt braucht eine Fehlerstrom-Schutzeinrichtung Typ A und ' +
        'zusätzlich eine Einrichtung zur Gleichfehlererkennung, sofern das Fahrzeug ' +
        'keine eigene besitzt. Viele Wallboxen haben beides eingebaut, dann genügt ' +
        'Typ A im Verteiler.',
    },
  ),
  t(
    'wallbox-ladestrom',
    'Ladeinfrastruktur',
    'Ladeströme und Ladeleistung im Haushalt',
    'vde0100_722',
    ['wallbox', 'ladestrom', 'leistung'],
    {
      bemerkung:
        'Üblich sind 11 kW bei 16 A dreiphasig und 22 kW bei 32 A dreiphasig. ' +
        'An einer Schuko-Steckdose sind es 2,3 kW bei 10 A einphasig – für ' +
        'Dauerladung ungeeignet.',
    },
  ),
  z(
    'wallbox-11kw',
    'Ladeinfrastruktur',
    'Ladeleistung einer Wallbox bei 16 A Drehstrom',
    11000,
    'W',
    'vde0100_722',
    ['wallbox', 'leistung', 'drehstrom'],
    {
      geprueft: true,
      bemerkung:
        'Bei 16 A je Außenleiter und 400 V ergibt sich P = √3 · 400 V · 16 A ' +
        '= rund 11 kW. Diese Leistung ist für Hausanschlüsse üblich und muss ' +
        'beim Netzbetreiber angezeigt werden.',
    },
  ),
  z(
    'wallbox-22kw',
    'Ladeinfrastruktur',
    'Ladeleistung einer Wallbox bei 32 A Drehstrom',
    22000,
    'W',
    'vde0100_722',
    ['wallbox', 'leistung', 'drehstrom'],
    {
      bemerkung:
        'Bei 32 A je Außenleiter ergibt sich P = √3 · 400 V · 32 A = rund 22 kW. ' +
        'Dafür ist die Zustimmung des Netzbetreibers erforderlich, weil die ' +
        'Bezugsleistung des Hausanschlusses dafür meist nicht ausreicht.',
    },
  ),
  t(
    'wallbox-lastmanagement',
    'Ladeinfrastruktur',
    'Lastmanagement für Ladepunkte',
    'vde0100_722',
    ['wallbox', 'lastmanagement', 'anschluss'],
    {
      bemerkung:
        'Mehrere Ladepunkte an einem Hausanschluss werden über ein Lastmanagement ' +
        'gesteuert, das die Summenleistung begrenzt. Ohne Lastmanagement ist je ' +
        'Ladepunkt die volle Leistung vorzuhalten und der Anschluss entsprechend ' +
        'zu verstärken.',
    },
  ),
  t(
    'wallbox-netzbetreiber',
    'Ladeinfrastruktur',
    'Anmeldung einer Ladeeinrichtung beim Netzbetreiber',
    'nav',
    ['wallbox', 'netzbetreiber', 'anmeldung'],
    {
      bemerkung:
        'Ladeeinrichtungen bis 12 kVA sind beim Netzbetreiber anzuzeigen, darüber ' +
        'ist eine Zustimmung erforderlich. Die Meldung erfolgt über das ' +
        'Installationsunternehmen im Zuge der Fertigstellung.',
    },
  ),
  z(
    'wallbox-cosphi',
    'Ladeinfrastruktur',
    'Leistungsfaktor moderner Ladegeräte',
    0.95,
    'cos φ',
    'vde0100_722',
    ['wallbox', 'leistungsfaktor'],
    {
      bemerkung:
        'Moderne Ladegeräte arbeiten mit cos φ nahe 1, meist 0,95 bis 1, weil sie ' +
        'leistungselektronisch mit aktiver Leistungsfaktorkorrektur arbeiten.',
    },
  ),

  // =========================================================================
  // Überspannungsschutz
  // =========================================================================
  t(
    'ueberspannungsschutz-konzept',
    'Überspannungsschutz',
    'Dreistufiges Schutzkonzept (Typ 1, 2, 3)',
    'vde0100_534',
    ['ueberspannungsschutz', 'typ', 'konzept'],
    {
      geprueft: true,
      bemerkung:
        'Typ 1 am Gebäudeeintritt bei vorhandenem äußeren Blitzschutz, ' +
        'Typ 2 am Zählerplatz oder in der Unterverteilung, Typ 3 als Geräteschutz ' +
        'kurz vor dem Verbraucher. Die Typen sind aufeinander abgestimmt, ihre ' +
        'Blitzstoßströme nehmen nach innen ab.',
    },
  ),
  t(
    'ueberspannungsschutz-pflicht',
    'Überspannungsschutz',
    'Wann ist Überspannungsschutz erforderlich?',
    'vde0100_443',
    ['ueberspannungsschutz', 'pflicht'],
    {
      geprueft: true,
      bemerkung:
        'Erforderlich bei Anlagen mit äußerem Blitzschutz, bei Freileitungsanschluss ' +
        'und bei sicherheitsrelevanten Einrichtungen. Bei Gebäuden mit ' +
        'elektronischen Anlagen ist er dringend empfohlen und heute üblicher Standard.',
    },
  ),
  z(
    'blitzstrom-typ1',
    'Überspannungsschutz',
    'Prüfstrom für Überspannungsschutz Typ 1',
    25,
    'kA',
    'vde0100_534',
    ['ueberspannungsschutz', 'blitzstrom'],
    {
      bemerkung:
        'Typ 1 wird mit dem Blitzteilstrom geprüft, üblich sind 25 kA je Pol. ' +
        'Der Wert bezieht sich auf die Wellenform 10/350 µs, die dem ersten ' +
        'Blitzstrom entspricht.',
    },
  ),
  t(
    'ueberspannungsschutz-koordination',
    'Überspannungsschutz',
    'Abstand und Koordination von Ableitern',
    'vde0100_534',
    ['ueberspannungsschutz', 'koordination', 'leitung'],
    {
      bemerkung:
        'Zwischen zwei Ableitern ist ein Mindestabstand der Leitungen einzuhalten, ' +
        'sonst spricht der innere nicht an. Der Hersteller gibt den Wert an; ' +
        'üblich sind 10 m zwischen Typ 1 und Typ 2.',
    },
  ),

  // =========================================================================
  // Sicherheitsbeleuchtung und Notstrom
  // =========================================================================
  z(
    'sicherheitsbeleuchtung-betriebsdauer',
    'Sicherheitsbeleuchtung',
    'Mindestbetriebsdauer der Sicherheitsbeleuchtung',
    60,
    'min',
    'din_en_60204_1',
    ['sicherheitsbeleuchtung', 'notstrom', 'dauer'],
    {
      bemerkung:
        'Für Versammlungsstätten und Verkaufsstätten sind 60 Minuten üblich, für ' +
        'Rettungswege in Sonderbauten teils 30 Minuten. Maßgeblich sind die ' +
        'Vorgaben der Landesbauordnung und der Sonderbauverordnung.',
    },
  ),
  z(
    'sicherheitsbeleuchtung-beleuchtungsstaerke',
    'Sicherheitsbeleuchtung',
    'Mindestbeleuchtungsstärke auf Rettungswegen',
    1,
    'lx',
    'din_en_60204_1',
    ['sicherheitsbeleuchtung', 'beleuchtung', 'rettungsweg'],
    {
      bemerkung:
        'Auf dem Rettungsweg sind mindestens 1 lx erforderlich, an Rettungszeichen ' +
        'und Sicherheitsleitsystemen mehr. Gemessen wird in der Mitte des Rettungswegs ' +
        'auf dem Boden.',
    },
  ),
  t(
    'notstrom-arten',
    'Sicherheitsbeleuchtung',
    'Arten der Ersatzstromversorgung',
    'din_en_60204_1',
    ['notstrom', 'ersatzstrom', 'aggregat'],
    {
      bemerkung:
        'Sicherheitsstromversorgung für Rettungseinrichtungen, Ersatzstromversorgung ' +
        'für den Weiterbetrieb, unterbrechungsfreie Versorgung (USV) für kurze ' +
        'Überbrückungen elektronischer Anlagen. Die Umschaltung kann automatisch ' +
        'oder von Hand erfolgen.',
    },
  ),
  t(
    'notstrom-netzumschaltung',
    'Sicherheitsbeleuchtung',
    'Netzumschaltung – Verriegelung',
    'vde0100_530',
    ['notstrom', 'umschaltung', 'sicherheit'],
    {
      bemerkung:
        'Die Umschaltung zwischen Netz und Ersatzquelle muss so verriegelt sein, ' +
        'dass ein Rückspeisen ins Netz ausgeschlossen ist. Das schützt Personen, ' +
        'die am freigeschalteten Netz arbeiten.',
    },
  ),

  // =========================================================================
  // Gebäudesystemtechnik (KNX)
  // =========================================================================
  t(
    'knx-bus-aufbau',
    'Gebäudesystemtechnik',
    'Aufbau des KNX-Busses',
    'din_en_50090',
    ['knx', 'bus', 'aufbau'],
    {
      geprueft: true,
      bemerkung:
        'KNX ist ein dezentrales Bussystem: Aktoren und Sensoren liegen auf einer ' +
        'Zweidrahtleitung, jeder Teilnehmer hat eine eigene Adresse und kann ' +
        'unabhängig arbeiten. Ein zentraler Rechner ist für den Grundbetrieb nicht ' +
        'erforderlich.',
    },
  ),
  t(
    'knx-topologie',
    'Gebäudesystemtechnik',
    'KNX-Topologie: Linie, Bereich, Bereichskoppler',
    'din_en_50090',
    ['knx', 'topologie', 'linie'],
    {
      bemerkung:
        'Eine Linie fasst bis zu 64 Teilnehmer. Vier Linien bilden über ' +
        'Linienkoppler einen Bereich mit bis zu 256 Teilnehmern. Bereiche werden ' +
        'über Bereichskoppler verbunden. Die Struktur wird durch die Adressierung ' +
        'abgebildet: Bereich.Linie.Teilnehmer.',
    },
  ),
  z(
    'knx-linien-teilnehmer',
    'Gebäudesystemtechnik',
    'Höchstzahl Teilnehmer je KNX-Linie',
    64,
    'Teilnehmer',
    'din_en_50090',
    ['knx', 'linie', 'teilnehmer'],
    {
      geprueft: true,
      bemerkung:
        'Ohne Linienkoppler höchstens 64 Teilnehmer je Linie. Der Bus braucht eine ' +
        'Spannungsversorgung mit Drossel; die Versorgung mehrerer Linien aus einer ' +
        'Quelle ist über Koppler möglich.',
    },
  ),
  t(
    'knx-geräte-arten',
    'Gebäudesystemtechnik',
    'Sensoren, Aktoren und Koppler im Bussystem',
    'din_en_50090',
    ['knx', 'sensor', 'aktor'],
    {
      bemerkung:
        'Sensoren erfassen und senden, Aktoren empfangen und schalten. Koppler ' +
        'verbinden Linien oder Bereiche. Ein Teilnehmer ist über seine ' +
        'physikalische Adresse eindeutig identifizierbar.',
    },
  ),
  t(
    'knx-inbetriebnahme',
    'Gebäudesystemtechnik',
    'Inbetriebnahme einer KNX-Anlage',
    'din_en_50090',
    ['knx', 'inbetriebnahme', 'programmierung'],
    {
      bemerkung:
        'Die Anlage wird über die Engineering-Software projektiert, die Teilnehmer ' +
        'erhalten ihre Adressen und werden über die Programmiertaste in den ' +
        'Programmiermodus versetzt. Ohne Projektdatei ist eine spätere Änderung ' +
        'nur mit Mühe möglich, deshalb ist sie dem Betreiber zu übergeben.',
    },
  ),
  t(
    'gebaeudeautomation-schnittstellen',
    'Gebäudesystemtechnik',
    'Schnittstellen zu übergeordneten Systemen',
    'din_en_50090',
    ['gebaeudeautomation', 'schnittstelle', 'glt'],
    {
      bemerkung:
        'Für die Anbindung an die Gebäudeleittechnik gibt es Gateways auf ' +
        'BACnet, Modbus, M-Bus oder IP. Das Gateway übersetzt zwischen den ' +
        'Datenpunkten; die Feldbusebene bleibt davon unberührt.',
    },
  ),
  t(
    'datenschutz-gebaeudetechnik',
    'Gebäudesystemtechnik',
    'Datenschutz bei Präsenz- und Kamerasystemen',
    'bdsg',
    ['datenschutz', 'praesenzmelder', 'kamera'],
    {
      bemerkung:
        'Präsenzmelder erfassen Anwesenheit, nicht Personen; Kameras erfassen ' +
        'personenbezogene Daten und brauchen eine Rechtsgrundlage, eine ' +
        'Kennzeichnung und eine Löschfrist. In Wohnräumen und Umkleiden sind ' +
        'Kameras unzulässig.',
    },
  ),
  t(
    'fernzugriff-absichern',
    'Gebäudesystemtechnik',
    'Fernzugriff auf die Gebäudetechnik absichern',
    'bdsg',
    ['fernzugriff', 'it-sicherheit', 'datenschutz'],
    {
      bemerkung:
        'Kein direkter Port auf das Gerät, sondern ein VPN oder ein ' +
        'herstellerneutraler Dienst. Standardpasswörter werden geändert, ' +
        'Fernwartungszugänge nur zeitweise geöffnet und protokolliert.',
    },
  ),

  // =========================================================================
  // Beleuchtung
  // =========================================================================
  z(
    'beleuchtungsstaerke-arbeitsplatz',
    'Beleuchtung',
    'Mindestbeleuchtungsstärke am Arbeitsplatz (Werkstatt)',
    300,
    'lx',
    'din_v_18599',
    ['beleuchtung', 'arbeitsplatz', 'lux'],
    {
      bemerkung:
        'Für grobe Arbeiten 200 lx, für normale Werkstattarbeiten 300 lx, ' +
        'für feine Arbeiten 500 lx und mehr. Maßgeblich ist die ' +
        'Arbeitsstättenverordnung mit ihren Arbeitsstättenregeln.',
    },
  ),
  t(
    'lichtstrom-und-beleuchtungsstaerke',
    'Beleuchtung',
    'Lichtstrom, Beleuchtungsstärke und Lichtausbeute',
    'din_v_18599',
    ['beleuchtung', 'lichtstrom', 'lux'],
    {
      bemerkung:
        'Der Lichtstrom wird in Lumen gemessen, die Beleuchtungsstärke in Lux ' +
        '(Lumen je Quadratmeter), die Lichtausbeute in Lumen je Watt. LED ' +
        'erreichen 100 bis 150 lm/W, Glühlampen nur rund 12 lm/W.',
    },
  ),
  z(
    'led-lichtausbeute',
    'Beleuchtung',
    'Lichtausbeute moderner LED-Leuchten',
    120,
    'lm/W',
    'din_v_18599',
    ['beleuchtung', 'led', 'lichtausbeute'],
    {
      bemerkung:
        'LED erreichen 100 bis 150 lm/W, Leuchtstofflampen rund 90 lm/W, ' +
        'Halogenlampen rund 20 lm/W und Glühlampen rund 12 lm/W. Die Lichtausbeute ' +
        'ist der Schlüssel zur Energieeinsparung in der Beleuchtung.',
    },
  ),
  t(
    'schutzart-beleuchtung-feuchtraum',
    'Beleuchtung',
    'Schutzart von Leuchten in Feuchträumen',
    'vde0100_701',
    ['beleuchtung', 'schutzart', 'feuchtraum'],
    {
      bemerkung:
        'Im Badezimmerbereich 1 mindestens IP X4, im Bereich 2 ebenfalls IP X4. ' +
        'In Bereich 0 nur Leuchten für Kleinspannung 12 V AC. Für Außenleuchten ' +
        'gilt mindestens IP 44, besser IP 65.',
    },
  ),
  t(
    'notbeleuchtung-zeichen',
    'Beleuchtung',
    'Rettungszeichen und Sicherheitsleuchten',
    'din_en_60204_1',
    ['beleuchtung', 'rettungszeichen', 'sicherheit'],
    {
      bemerkung:
        'Rettungszeichenleuchten sind grün mit weißem Piktogramm, ' +
        'Sicherheitsleuchten beleuchten den Rettungsweg. Beide müssen auch bei ' +
        'Ausfall der Allgemeinbeleuchtung weiterleuchten und werden dafür ' +
        'regelmäßig geprüft.',
    },
  ),

  // =========================================================================
  // Antennen- und Kommunikationstechnik
  // =========================================================================
  z(
    'antenne-koax-wellenwiderstand',
    'Antennentechnik',
    'Wellenwiderstand eines Koaxialkabels',
    75,
    'Ω',
    'din_en_50090',
    ['antenne', 'koax', 'widerstand'],
    {
      bemerkung:
        'Koaxialkabel für Antennenanlagen haben 75 Ω Wellenwiderstand, ' +
        'Netzwerkkabel 100 Ω und Hochfrequenzmessleitungen 50 Ω. Ein falscher ' +
        'Abschluss führt zu Reflexionen und damit zu Bild- oder Datenfehlern.',
    },
  ),
  t(
    'antenne-pegeldämpfung',
    'Antennentechnik',
    'Pegel und Dämpfung in der Antennenanlage',
    'din_en_50090',
    ['antenne', 'pegel', 'daempfung'],
    {
      bemerkung:
        'Der Pegel wird in dBµV angegeben, Dämpfung und Verstärkung in dB. Am ' +
        'Teilnehmerausgang sollen je nach Norm 47 bis 74 dBµV anliegen. ' +
        'Zu hohe Pegel führen zu Übersteuerung, zu niedrige zu Bildstörungen.',
    },
  ),
  z(
    'antenne-mindestpegel',
    'Antennentechnik',
    'Mindestpegel am Teilnehmeranschluss',
    47,
    'dBµV',
    'din_en_50090',
    ['antenne', 'pegel', 'teilnehmer'],
    {
      bemerkung:
        'Am Teilnehmerausgang sollen mindestens 47 dBµV anliegen, bei digitalem ' +
        'Empfang üblich 50 bis 70 dBµV. Der Wert gilt am Ende der ' +
        'Teilnehmeranschlussleitung.',
    },
  ),
  t(
    'antenne-potentialausgleich',
    'Antennentechnik',
    'Potentialausgleich der Antennenanlage',
    'vde0100_540',
    ['antenne', 'potentialausgleich', 'schutz'],
    {
      bemerkung:
        'Mast, Außenleiter des Koaxialkabels und Schirm werden über einen ' +
        'Potentialausgleichsleiter mit dem Hauptpotentialausgleich verbunden. ' +
        'Ohne diesen Anschluss kann ein Blitzeinschlag in der Nähe über das ' +
        'Kabel in das Gebäude gelangen.',
    },
  ),

  // =========================================================================
  // Energieeffizienz und Nachhaltigkeit
  // =========================================================================
  t(
    'energiebedarf-vs-verbrauch',
    'Energieeffizienz',
    'Energiebedarf und Energieverbrauch unterscheiden',
    'gebaeudeenergiegesetz',
    ['energie', 'bedarf', 'verbrauch'],
    {
      bemerkung:
        'Der Bedarf wird rechnerisch aus dem Gebäude ermittelt, der Verbrauch ' +
        'gemessen. Der Verbrauch hängt vom Nutzerverhalten ab und weicht deshalb ' +
        'vom Bedarf ab. Für den Vergleich von Gebäuden ist der Bedarf die ' +
        'geeignete Größe.',
    },
  ),
  z(
    'primaerenergiefaktor-strom',
    'Energieeffizienz',
    'Primärenergiefaktor für Strom (Bewertung nach GEG)',
    1.8,
    'Faktor',
    'gebaeudeenergiegesetz',
    ['energie', 'primaerenergie', 'geg'],
    {
      bemerkung:
        'Der Primärenergiefaktor für Strom liegt nach GEG-Anlage bei rund 1,8 und ' +
        'sinkt mit dem Anteil erneuerbarer Energien. Für Erdgas liegt er bei etwa 1,1. ' +
        'Strom aus erneuerbaren Quellen wird günstiger bewertet.',
    },
  ),
  t(
    'geg-anforderungen',
    'Energieeffizienz',
    'Anforderungen des Gebäudeenergiegesetzes',
    'gebaeudeenergiegesetz',
    ['energie', 'geg', 'gebaeude'],
    {
      bemerkung:
        'Das GEG verlangt einen niedrigen Jahres-Primärenergiebedarf und einen ' +
        'guten baulichen Wärmeschutz. Wer neu einbaut, muss einen bestimmten Anteil ' +
        'erneuerbarer Energien für die Wärmeversorgung nachweisen.',
    },
  ),
  t(
    'heizungscheck-effizienz',
    'Energieeffizienz',
    'Maßnahmen zur Steigerung der Anlageneffizienz',
    'din_v_18599',
    ['energie', 'effizienz', 'heizung'],
    {
      bemerkung:
        'Hydraulischer Abgleich, Absenkung der Vorlauftemperatur, Pumpentausch auf ' +
        'Hocheffizienz, Dämmung der Rohrleitungen und Regelung nach Bedarf. Der ' +
        'hydraulische Abgleich ist die wirksamste Einzelmaßnahme.',
    },
  ),
  t(
    'energiekennzahl-bewertung',
    'Energieeffizienz',
    'Energiekennzahl und ihre Bewertung',
    'din_v_18599',
    ['energie', 'kennzahl', 'bewertung'],
    {
      bemerkung:
        'Die Energiekennzahl gibt den Verbrauch je Quadratmeter und Jahr an, ' +
        'meist in kWh/(m²·a). Für Wohngebäude gelten unter 50 als sehr gut, ' +
        '50 bis 100 als gut und über 200 als sanierungsbedürftig.',
    },
  ),
  t(
    'abfalltrennung-elektro',
    'Umwelt',
    'Entsorgung elektrischer und elektronischer Geräte',
    'arbeitsschutzgesetz',
    ['umwelt', 'abfall', 'entsorgung'],
    {
      bemerkung:
        'Elektroaltgeräte dürfen nicht in den Restmüll. Sie werden getrennt gesammelt ' +
        'und über Rücknahmestellen oder den Hersteller entsorgt. Leuchtmittel mit ' +
        'Quecksilber sind Sondermüll; Lithiumbatterien werden wegen Brandgefahr ' +
        'separat gesammelt.',
    },
  ),
];
