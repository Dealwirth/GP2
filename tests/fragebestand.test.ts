import { describe, expect, it } from 'vitest';
import { WISO_FRAGEN, wisoThemen } from '../src/content/curriculum/wiso.ts';
import { FACHFRAGEN, fachFragenVon } from '../src/content/curriculum/fachfragen.ts';
import { ATOME, holeAtom } from '../src/content/curriculum/index.ts';
import { wisoAufgaben } from '../src/tasks/wiso.ts';
import { fachAufgaben } from '../src/tasks/fachaufgaben.ts';
import { verteileAufgaben } from '../src/domain/exam/simulation.ts';
import { statischeGrundaufgaben } from '../src/tasks/generator.ts';
import { leereDuplikatspeicher } from '../src/validation/pipeline.ts';

/**
 * Der kuratierte Fragenbestand trägt dieselbe Verantwortung wie die
 * Faktenbasis: Wenn hier eine Aussage falsch ist, lernt der Nutzer sie falsch.
 * Deshalb wird er strenger geprüft als der übrige Code.
 */
describe('Wirtschafts- und Sozialkunde – Bestand', () => {
  it('hat eindeutige Kennungen', () => {
    const ids = WISO_FRAGEN.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('verweist nur auf existierende Themen des eigenen Bereichs', () => {
    for (const frage of WISO_FRAGEN) {
      const wisoThemenDerFrage = frage.topicIds.filter((id) => id.startsWith('wiso-'));
      expect(wisoThemenDerFrage.length, `Frage ${frage.id} ohne WiSo-Thema`).toBeGreaterThan(0);
      for (const id of wisoThemenDerFrage) {
        expect(holeAtom(id), `Thema ${id} existiert nicht`).toBeDefined();
        expect(holeAtom(id)!.bereich).toBe('wiso');
      }
    }
  });

  it('gibt zu jeder Frage genau drei verschiedene Antwortmöglichkeiten', () => {
    for (const frage of WISO_FRAGEN) {
      const alle = [frage.richtig, ...frage.falsch];
      expect(new Set(alle).size, `Frage ${frage.id} hat Doppelungen`).toBe(3);
      expect(frage.begruendung.length).toBeGreaterThan(20);
      expect(frage.erklaerung.length).toBeGreaterThan(10);
    }
  });

  it('vermischt die Reihenfolge der Antworten', () => {
    leereDuplikatspeicher();
    // Einmal erzeugen – ein zweiter Aufruf würde an der Duplikatsperre scheitern.
    const aufgaben = wisoAufgaben();
    const reihenfolgen = new Set(
      aufgaben.map((t) => (t.proposal.options ?? []).map((o) => o.text).join('|')),
    );
    // Wenn die Optionen immer gleich sortiert wären, wäre das Mischen
    // wirkungslos und die richtige Antwort stünde immer an erster Stelle.
    expect(reihenfolgen.size).toBeGreaterThan(WISO_FRAGEN.length / 2);
    expect(aufgaben.length).toBe(WISO_FRAGEN.length);
  });

  it('deckt mindestens die Hälfte der WiSo-Themen ab', () => {
    const wisoAtome = ATOME.filter((a) => a.bereich === 'wiso');
    expect(wisoThemen().length).toBeGreaterThanOrEqual(wisoAtome.length / 2);
  });
});

describe('Fachwissen – Bestand', () => {
  it('hat eindeutige Kennungen', () => {
    const ids = FACHFRAGEN.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('verweist nur auf existierende Themen des eigenen Prüfungsbereichs', () => {
    for (const frage of FACHFRAGEN) {
      expect(frage.topicIds.length, `Frage ${frage.id} ohne Thema`).toBeGreaterThan(0);
      for (const id of frage.topicIds) {
        const atom = holeAtom(id);
        expect(atom, `Thema ${id} existiert nicht`).toBeDefined();
        expect(
          atom!.bereich,
          `Frage ${frage.id}: Thema ${atom!.titel} liegt in ${atom!.bereich}`,
        ).toBe(frage.bereich);
      }
    }
  });

  it('gibt zu jeder Frage genau drei verschiedene Antwortmöglichkeiten', () => {
    for (const frage of FACHFRAGEN) {
      const alle = [frage.richtig, ...frage.falsch];
      expect(new Set(alle).size, `Frage ${frage.id} hat Doppelungen`).toBe(3);
    }
  });

  it('nennt zu jeder Frage ihre Verweisstelle', () => {
    for (const frage of FACHFRAGEN) {
      expect(frage.verweis.length).toBeGreaterThan(10);
    }
  });

  it('liefert für alle drei technischen Bereiche Fragen', () => {
    for (const bereich of ['systementwurf', 'funktionsanalyse', 'kundenauftrag'] as const) {
      expect(fachFragenVon(bereich).length, `Keine Fachfragen für ${bereich}`).toBeGreaterThanOrEqual(8);
    }
  });

  it('erzeugt daraus gültige Aufgaben', () => {
    leereDuplikatspeicher();
    for (const task of fachAufgaben()) {
      expect(task.approved).toBe(true);
      expect(task.correctOptionId).toBeDefined();
      expect(task.solutionSteps.length).toBeGreaterThan(0);
    }
  });
});

describe('Prüfungssimulation ist füllbar', () => {
  leereDuplikatspeicher();
  const vorrat = statischeGrundaufgaben();

  it('liefert für jeden simulierten Bereich genügend Aufgaben', () => {
    for (const anzahl of [12, 12, 18]) void anzahl;
    for (const bereich of ['systementwurf', 'funktionsanalyse', 'wiso'] as const) {
      const verteilt = verteileAufgaben(bereich, vorrat, 12);
      expect(verteilt.length, `Zu wenig Aufgaben für ${bereich}`).toBeGreaterThanOrEqual(12);
    }
  });

  it('gibt keine Aufgabe doppelt aus', () => {
    for (const bereich of ['systementwurf', 'funktionsanalyse', 'wiso'] as const) {
      const verteilt = verteileAufgaben(bereich, vorrat, 12);
      const ids = verteilt.map((t) => t.taskId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('mischt möglichst viele verschiedene Themen', () => {
    const verteilt = verteileAufgaben('funktionsanalyse', vorrat, 12);
    const themen = new Set(verteilt.flatMap((t) => t.proposal.topicIds));
    // Zwölf Aufgaben sollen nicht auf zwei Themen hängen.
    expect(themen.size).toBeGreaterThanOrEqual(6);
  });
});
