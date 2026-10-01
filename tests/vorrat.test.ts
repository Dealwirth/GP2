import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Der Vorrat unter Dauerlast.
 *
 * Dieser Test hält den Fehler fest, der die App über mehrere Sitzungen hinweg
 * leerlaufen ließ: Die Nachfüllung maß den Füllstand an der Ablage statt an
 * den wirklich bereitliegenden Aufgaben. Weil die Ablage ein Ringpuffer ist,
 * zählte sie alte, längst gestellte Aufgaben mit – der Vorrat galt als voll,
 * während „bereit" Zyklus für Zyklus zusammenfiel.
 *
 * Geprüft wird deshalb nicht ein einzelner Aufruf, sondern das Verhalten über
 * viele Zyklen: verbrauchen, nachfüllen, verbrauchen. Der Vorrat muss stabil
 * bleiben und darf denselben Fragetext nicht zweimal stellen.
 */

/** Ein Speicher im Arbeitsspeicher, wie ihn der Browser bereitstellt. */
function speicherAttrappe(): void {
  const daten = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => (daten.has(k) ? daten.get(k)! : null),
    setItem: (k: string, v: string) => void daten.set(k, v),
    removeItem: (k: string) => void daten.delete(k),
    clear: () => daten.clear(),
    key: (i: number) => [...daten.keys()][i] ?? null,
    get length() {
      return daten.size;
    },
  } as Storage;
}


describe('Vorrat unter Dauerlast', () => {
  beforeEach(() => {
    speicherAttrappe();
  });

  it('hält den Füllstand über viele Zyklen stabil', async () => {
    const { fuelleVorratMitSeed, fuelleVorratAuf, holeVorrat, markiereBenutzt, vorratsstand } =
      await import('../src/tasks/vorrat.ts');

    fuelleVorratMitSeed(4);
    expect(holeVorrat().length).toBeGreaterThan(0);

    const staende: number[] = [];
    for (let zyklus = 0; zyklus < 20; zyklus += 1) {
      const da = holeVorrat();
      markiereBenutzt(da.map((t) => t.taskId));
      await fuelleVorratAuf(4);
      staende.push(vorratsstand().bereit);
    }

    // Vor dem Fix fiel diese Zahl über die Zyklen zusammen (39 → … → 4 → 13).
    // Jetzt muss sie sich auf einem Niveau halten – nie leer, nie ausgedünnt.
    const minimum = Math.min(...staende);
    expect(minimum).toBeGreaterThanOrEqual(4);
  });

  it('stellt denselben Fragetext in einer Sitzung nicht zweimal', async () => {
    const { fuelleVorratMitSeed, fuelleVorratAuf, holeVorrat, markiereBenutzt } = await import(
      '../src/tasks/vorrat.ts'
    );

    const gesehen = new Set<string>();
    for (let zyklus = 0; zyklus < 10; zyklus += 1) {
      fuelleVorratMitSeed(4);
      await fuelleVorratAuf(4);
      const da = holeVorrat();
      for (const t of da) {
        expect(gesehen.has(t.proposal.prompt), `doppelt gestellt: ${t.proposal.prompt}`).toBe(
          false,
        );
        gesehen.add(t.proposal.prompt);
      }
      markiereBenutzt(da.map((t) => t.taskId));
    }
    // Nach zehn Zyklen muss eine nennenswerte Menge zusammengekommen sein.
    expect(gesehen.size).toBeGreaterThan(40);
  });
});
