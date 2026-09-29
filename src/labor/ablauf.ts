/**
 * Ablauf der praktischen Prüfung (Teil 2a, Kundenauftrag).
 *
 * Grundlage: § 11 ElekAusbV sowie die PAL-IHK-Durchführungsregelung. Der
 * Kundenauftrag dauert 16 Stunden, die auf zwei Prüfungstage verteilt werden;
 * das situative Fachgespräch von 20 Minuten findet während der Durchführung
 * statt und zählt zur Prüfungszeit.
 *
 * Diese Zeiten sind Planungsangaben der Prüfungsbehörde, keine erfundenen
 * Werte. Sie sind als eigene Liste geführt, damit sie prüfbar bleiben.
 */

export type PhaseArt = 'aufgabe' | 'gespraech' | 'pruefung' | 'pause';

export interface Phase {
  id: string;
  tag: 1 | 2;
  titel: string;
  art: PhaseArt;
  /** Beginn relativ zum Prüfungsbeginn, in Minuten. */
  vonMin: number;
  bisMin: number;
  /** Was in dieser Phase geprüft wird. */
  inhalt: string;
  /** Worauf besonders zu achten ist. */
  hinweis: string;
  /** Punkte, wenn die Phase vollständig und nachvollziehbar dokumentiert ist. */
  punkte: number;
}

export const PRUEFUNGSTAG_START = '08:00';
export const PAUSE_NACH_MIN = 165;

/** Gesamtdauer des Kundenauftrags in Minuten (§ 11 ElekAusbV). */
export const GESAMTDAUER_MIN = 16 * 60;

/** Dauer des situativen Fachgesprächs in Minuten. */
export const FACHGESPRAECH_MIN = 20;

export const PHASEN: Phase[] = [
  {
    id: 'p1-1',
    tag: 1,
    titel: 'Arbeitsauftrag analysieren',
    art: 'aufgabe',
    vonMin: 0,
    bisMin: 45,
    inhalt:
      'Kundenauftrag lesen, Bestandsaufnahme prüfen, Fragenkatalog sammeln, ' +
      'Nachweise und Anlagendokumentation einsehen.',
    hinweis:
      'Die Prüfer beobachten, wie du den Auftrag verstehst. Notiere Fragen, ' +
      'bevor du mit der Arbeit beginnst – sie werden dir gestellt.',
    punkte: 8,
  },
  {
    id: 'p1-2',
    tag: 1,
    titel: 'Planung und Stromlaufplan',
    art: 'aufgabe',
    vonMin: 45,
    bisMin: 165,
    inhalt:
      'Anlagenspezifikation, Auswahl der Betriebsmittel, Stromlaufplan, ' +
      'Klemmenplan und Apparateskizze erstellen. Rückfragen an die Prüfer.',
    hinweis:
      'Die Planung ist die Grundlage für alles Weitere. Ein Fehler hier ' +
      'zieht sich durch die gesamte Prüfung.',
    punkte: 16,
  },
  {
    id: 'p1-3',
    tag: 1,
    titel: 'Mittagspause',
    art: 'pause',
    vonMin: 165,
    bisMin: 195,
    inhalt: 'Pause wie in der Prüfung. Werkzeug abgeben, Zeichnung sichern.',
    hinweis: 'Nichts liegen lassen – die Unterlage wird nach der Pause weitergebraucht.',
    punkte: 0,
  },
  {
    id: 'p1-4',
    tag: 1,
    titel: 'Errichtung der Anlage, Teil 1',
    art: 'aufgabe',
    vonMin: 195,
    bisMin: 375,
    inhalt:
      'Montage, Leitungsverlegung, Geräteeinbau, Beschriftung. Erste ' +
      'Durchgangs- und Kontrollmessungen.',
    hinweis:
      'Sicherheitsregeln zuerst: spannungsfrei schalten, gegen Wiedereinschalten ' +
      'sichern. Das wird bewertet, auch ohne Fehler.',
    punkte: 16,
  },
  {
    id: 'p1-5',
    tag: 1,
    titel: 'Tagesabschluss 1',
    art: 'pruefung',
    vonMin: 375,
    bisMin: 480,
    inhalt:
      'Anlage in einen definierten, dokumentierten Zustand versetzen, ' +
      'Übergabe an den Prüfer, Tagesprotokoll abschließen.',
    hinweis:
      'Der Zustand muss reproduzierbar sein. Was nicht dokumentiert ist, ' +
      'existiert in der Bewertung nicht.',
    punkte: 8,
  },
  {
    id: 'p2-1',
    tag: 2,
    titel: 'Anlagenteil fertigstellen',
    art: 'aufgabe',
    vonMin: 480,
    bisMin: 630,
    inhalt:
      'Restliche Montage, Anschluss der Verbraucher, Einregulierung, ' +
      'Funktionsprüfung einzelner Betriebsmittel.',
    hinweis: 'Schritt für Schritt prüfen und jeden Schritt protokollieren.',
    punkte: 14,
  },
  {
    id: 'p2-2',
    tag: 2,
    titel: 'Prüfen und Messen',
    art: 'aufgabe',
    vonMin: 630,
    bisMin: 750,
    inhalt:
      'Durchgangsprüfung, Isolationswiderstand, Schleifenwiderstand, ' +
      'Auslösezeit, Funktionsprüfung, Spannungsfall – mit Protokoll.',
    hinweis:
      'Reihenfolge einhalten: erst spannungsfrei messen, dann unter Last. ' +
      'Jedes Messgerät wird im Protokoll mit Prüfdatum und Kalibrierung genannt.',
    punkte: 18,
  },
  {
    id: 'p2-3',
    tag: 2,
    titel: 'Mittagspause',
    art: 'pause',
    vonMin: 750,
    bisMin: 780,
    inhalt: 'Pause wie in der Prüfung.',
    hinweis: 'Gerätezustand dokumentieren, bevor du die Pause verlässt.',
    punkte: 0,
  },
  {
    id: 'p2-4',
    tag: 2,
    titel: 'Fachgespräch: Fachprüfung',
    art: 'gespraech',
    vonMin: 780,
    bisMin: 800,
    inhalt:
      'Situatives Fachgespräch von 20 Minuten: Vertiefung der durchgeführten ' +
      'Arbeiten, Nachfragen zu Normen, Sicherheit und Funktion.',
    hinweis:
      'Die Fragen beziehen sich auf deine eigene Arbeit. Wer seine Anlage ' +
      'kennt, kann sie erklären – und das wird erwartet.',
    punkte: 16,
  },
  {
    id: 'p2-5',
    tag: 2,
    titel: 'Fehlerbeseitigung und Nachweis',
    art: 'aufgabe',
    vonMin: 800,
    bisMin: 960,
    inhalt:
      'Festgestellte Mängel beheben, Funktion nachweisen, Prüfprotokoll ' +
      'vollständig, Anlage betriebsbereit übergeben.',
    hinweis:
      'Der letzte Eindruck zählt: Anlage besenrein, Protokoll unterschrieben, ' +
      'Betriebsstoffe nach Vorschrift behandelt.',
    punkte: 4,
  },
];

export const PHASEN_TAG_1 = PHASEN.filter((p) => p.tag === 1);
export const PHASEN_TAG_2 = PHASEN.filter((p) => p.tag === 2);

export const PHASEN_PUNKTE_GESAMT = PHASEN.reduce((s, p) => s + p.punkte, 0);

export interface TagesUebersicht {
  tag: 1 | 2;
  dauerMinuten: number;
  arbeitsMinuten: number;
  pausenMinuten: number;
  punkte: number;
  gesprachsMinuten: number;
}

export function tagesUebersicht(tag: 1 | 2): TagesUebersicht {
  const phasen = PHASEN.filter((p) => p.tag === tag);
  const pausen = phasen.filter((p) => p.art === 'pause');
  return {
    tag,
    dauerMinuten: phasen.reduce((s, p) => s + (p.bisMin - p.vonMin), 0),
    arbeitsMinuten: phasen.filter((p) => p.art !== 'pause').reduce((s, p) => s + (p.bisMin - p.vonMin), 0),
    pausenMinuten: pausen.reduce((s, p) => s + (p.bisMin - p.vonMin), 0),
    punkte: phasen.reduce((s, p) => s + p.punkte, 0),
    gesprachsMinuten: phasen.filter((p) => p.art === 'gespraech').reduce((s, p) => s + (p.bisMin - p.vonMin), 0),
  };
}

/** Formatiert eine Prüfungsminute als Uhrzeit, ausgehend von 08:00. */
export function minuteAlsUhrzeit(minuteRelativ: number): string {
  const start = new Date(`2026-01-01T${PRUEFUNGSTAG_START}:00`);
  start.setMinutes(start.getMinutes() + minuteRelativ);
  return `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
}

/** Die Phase, die zu einem bestimmten Punkt der Prüfungszeit gehört. */
export function phaseZurZeit(minuteRelativ: number): Phase | undefined {
  return PHASEN.find((p) => minuteRelativ >= p.vonMin && minuteRelativ < p.bisMin);
}
