import type { InteraktiveAufgabe, Luecke, Task } from '../domain/types.ts';

/**
 * Bewertung interaktiver Antworten.
 *
 * Jedes Format hat seine eigene Logik – eine Zuordnung lässt sich nicht wie
 * eine Mehrfachauswahl prüfen, und eine Zahleneingabe nicht wie ein
 * Lückentext. Die Regeln stehen deshalb je Format beisammen und liefern
 * immer dasselbe Ergebnis: ob richtig, welcher Anteil stimmte und was gefehlt
 * hat.
 *
 * Teilpunkte sind bewusst vorgesehen: Wer bei einer Zuordnung vier von fünf
 * Paaren richtig hat, hat den Stoff weitgehend verstanden. Das als glatte
 * Null zu werten wäre eine Lüge über den Lernstand.
 */

/** Die Antwort des Lernenden – je nach Format eine andere Gestalt. */
export type Antwort =
  | { art: 'mc'; optionId: string }
  | { art: 'multi'; optionIds: string[] }
  | { art: 'wahr-falsch'; wert: boolean }
  | { art: 'zuordnung'; zuordnung: Record<string, string> }
  | { art: 'reihenfolge'; reihenfolge: number[] }
  | { art: 'zahl'; wert: number }
  | { art: 'luecke'; luecken: string[] };

export interface Urteil {
  /** Vollständig richtig? */
  korrekt: boolean;
  /** Anteil richtig, 0..1 – für die Teilpunkte. */
  anteil: number;
  /** Was gefehlt hat, in Klartext. Leer, wenn alles stimmte. */
  hinweise: string[];
}

function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Prüft eine Zahleneingabe gegen den Sollwert mit relativer Toleranz. */
export function zahlStimmt(eingabe: number, soll: number, toleranz = 0.01): boolean {
  if (!Number.isFinite(eingabe) || !Number.isFinite(soll)) return false;
  if (soll === 0) return Math.abs(eingabe) <= 1e-9;
  return Math.abs(eingabe - soll) / Math.abs(soll) <= toleranz;
}

/**
 * Bewertet eine Antwort gegen eine Aufgabe.
 *
 * Ist die Aufgabe keine interaktive (also Multiple Choice), greift der
 * Vergleich mit `correctOptionId`. So hat der Aufrufer nur einen Weg.
 */
export function bewerte(task: Task, antwort: Antwort): Urteil {
  const iv = task.interaktiv;

  if (antwort.art === 'mc') {
    const korrekt = antwort.optionId === task.correctOptionId;
    return { korrekt, anteil: korrekt ? 1 : 0, hinweise: korrekt ? [] : ['Andere Antwort ist richtig.'] };
  }

  if (!iv || iv.format !== antwort.art) {
    return { korrekt: false, anteil: 0, hinweise: ['Antwort und Aufgabenformat passen nicht zusammen.'] };
  }

  switch (antwort.art) {
    case 'multi':
      return bewerteMulti(iv, antwort.optionIds);
    case 'wahr-falsch':
      return bewerteWahrFalsch(iv, antwort.wert);
    case 'zuordnung':
      return bewerteZuordnung(iv, antwort.zuordnung);
    case 'reihenfolge':
      return bewerteReihenfolge(iv, antwort.reihenfolge);
    case 'zahl':
      return bewerteZahl(iv, antwort.wert);
    case 'luecke':
      return bewerteLuecke(iv, antwort.luecken);
  }
}

function bewerteMulti(iv: InteraktiveAufgabe, gewaehlt: string[]): Urteil {
  const richtig = new Set(iv.richtigIds ?? []);
  const wahl = new Set(gewaehlt);
  const treffer = [...richtig].filter((id) => wahl.has(id)).length;
  const falschGewaehlt = [...wahl].filter((id) => !richtig.has(id));
  const fehlend = [...richtig].filter((id) => !wahl.has(id));
  const anteil = richtig.size === 0 ? 0 : treffer / richtig.size;
  const hinweise: string[] = [];
  if (fehlend.length > 0) hinweise.push(`${fehlend.length} zutreffende Aussage(n) fehlten.`);
  if (falschGewaehlt.length > 0) hinweise.push(`${falschGewaehlt.length} nicht zutreffende(s) angekreuzt.`);
  return { korrekt: fehlend.length === 0 && falschGewaehlt.length === 0, anteil, hinweise };
}

function bewerteWahrFalsch(iv: InteraktiveAufgabe, wert: boolean): Urteil {
  const korrekt = wert === iv.richtigWahr;
  return { korrekt, anteil: korrekt ? 1 : 0, hinweise: korrekt ? [] : ['Die Aussage ist anders zu bewerten.'] };
}

function bewerteZuordnung(iv: InteraktiveAufgabe, zuordnung: Record<string, string>): Urteil {
  const paare = iv.paare ?? [];
  let treffer = 0;
  const hinweise: string[] = [];
  for (const paar of paare) {
    const gegeben = zuordnung[paar.links];
    if (gegeben !== undefined && normalisiere(gegeben) === normalisiere(paar.rechts)) {
      treffer += 1;
    } else {
      hinweise.push(`„${paar.links}" gehört zu „${paar.rechts}".`);
    }
  }
  const anteil = paare.length === 0 ? 0 : treffer / paare.length;
  return { korrekt: treffer === paare.length, anteil, hinweise };
}

function bewerteReihenfolge(iv: InteraktiveAufgabe, reihenfolge: number[]): Urteil {
  const soll = iv.schritte ?? [];
  let treffer = 0;
  for (let i = 0; i < soll.length; i += 1) {
    if (reihenfolge[i] === i) treffer += 1;
  }
  const anteil = soll.length === 0 ? 0 : treffer / soll.length;
  return {
    korrekt: treffer === soll.length,
    anteil,
    hinweise:
      treffer === soll.length ? [] : ['Die Reihenfolge stimmt noch nicht an jeder Stelle.'],
  };
}

function bewerteZahl(iv: InteraktiveAufgabe, wert: number): Urteil {
  const soll = iv.wert ?? 0;
  const korrekt = zahlStimmt(wert, soll, iv.toleranz ?? 0.01);
  return {
    korrekt,
    anteil: korrekt ? 1 : 0,
    hinweise: korrekt ? [] : [`Erwartet war ${String(soll).replace('.', ',')} ${iv.einheit ?? ''}`.trim() + '.'],
  };
}

/**
 * Prüft eine einzelne Lücke.
 *
 * Dieselbe Regel wie in `bewerteLuecke` – die Oberfläche darf eine Alternative
 * nicht anders beurteilen als die Auswertung, sonst steht „richtig" neben
 * einem roten Feld.
 */
export function lueckeStimmt(loesung: Luecke, eingabe: string): boolean {
  const gegeben = normalisiere(eingabe);
  if (gegeben === '') return false;
  return [loesung.loesung, ...(loesung.alternativen ?? [])].map(normalisiere).includes(gegeben);
}

function bewerteLuecke(iv: InteraktiveAufgabe, luecken: string[]): Urteil {
  const soll = iv.luecken ?? [];
  let treffer = 0;
  const hinweise: string[] = [];
  for (let i = 0; i < soll.length; i += 1) {
    if (lueckeStimmt(soll[i]!, luecken[i] ?? '')) treffer += 1;
    else hinweise.push(`Lücke ${i + 1}: „${soll[i]!.loesung}".`);
  }
  const anteil = soll.length === 0 ? 0 : treffer / soll.length;
  return { korrekt: treffer === soll.length, anteil, hinweise };
}

/**
 * Baut die Antwort aus der Nutzereingabe für die Anzeige im Verlauf.
 *
 * Der Verlauf soll zeigen, was geantwortet wurde – nicht nur, dass es falsch
 * war. Deshalb wird die Antwort hier in lesbaren Text übersetzt.
 */
export function antwortAlsText(task: Task, antwort: Antwort): string {
  const iv = task.interaktiv;
  switch (antwort.art) {
    case 'mc':
      return task.proposal.options?.find((o) => o.id === antwort.optionId)?.text ?? antwort.optionId;
    case 'multi':
      return (
        antwort.optionIds
          .map((id) => task.proposal.options?.find((o) => o.id === id)?.text ?? id)
          .join(' · ') || 'nichts angekreuzt'
      );
    case 'wahr-falsch':
      return antwort.wert ? 'wahr' : 'falsch';
    case 'zuordnung':
      return Object.entries(antwort.zuordnung)
        .map(([l, r]) => `${l} → ${r}`)
        .join(' · ');
    case 'reihenfolge':
      return antwort.reihenfolge.map((i) => iv?.schritte?.[i] ?? i).join(' → ');
    case 'zahl':
      return `${String(antwort.wert).replace('.', ',')} ${iv?.einheit ?? ''}`.trim();
    case 'luecke':
      return antwort.luecken.join(' · ');
  }
}
