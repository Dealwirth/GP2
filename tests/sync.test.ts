import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fuehreZusammen,
  gleicheAb,
  ladeSyncEinstellungen,
  speichereSyncEinstellungen,
  SYNC_STANDARD,
  type SyncInhalt,
} from '../src/sync/index.ts';
import { storage } from '../src/storage/index.ts';
import { ladeErgebnisse } from '../src/storage/ergebnisse.ts';
import { entschluessle, istHuelle } from '../src/crypto/krypto.ts';

/**
 * Der Abgleich zwischen Geräten.
 *
 * Zwei Dinge müssen stimmen, sonst ist die Funktion gefährlicher als ihr
 * Nutzen: Der zusammengeführte Stand darf keinen Fortschritt verlieren, und
 * unverschlüsselt darf nichts das Gerät verlassen.
 *
 * Der GitHub-Aufruf wird durch einen kleinen Gist-Server im Speicher ersetzt –
 * ein Netzaufruf im Test wäre langsam und unzuverlässig. Alles andere ist echt:
 * die Krypto, das Zusammenführen, die Ablage.
 */

const speicher = new Map<string, string>();
beforeEach(() => {
  speicher.clear();
  (globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (k: string) => speicher.get(k) ?? null,
    setItem: (k: string, v: string) => void speicher.set(k, v),
    removeItem: (k: string) => void speicher.delete(k),
  };
});

function zustand(topicId: string, answered: number, extra: Record<string, unknown> = {}) {
  return {
    topicId,
    state: 'gefestigt' as const,
    correctStreak: 1,
    hitRate: 0.5,
    confidenceRate: 0.5,
    answered,
    lastSeen: null,
    streakStartedAt: null,
    nextDue: null,
    ...extra,
  };
}

describe('Zusammenführen', () => {
  const leer = (): SyncInhalt => ({ zustaende: [], versuche: [], sitzungen: [], ergebnisse: [] });

  it('nimmt je Thema den weiter geübten Stand', () => {
    const lokal: SyncInhalt = { ...leer(), zustaende: [zustand('a', 3), zustand('b', 9)] };
    const fremd: SyncInhalt = { ...leer(), zustaende: [zustand('a', 7), zustand('c', 2)] };
    const zusammen = fuehreZusammen(lokal, fremd);
    const nach = Object.fromEntries(zusammen.zustaende.map((z) => [z.topicId, z.answered]));
    expect(nach).toEqual({ a: 7, b: 9, c: 2 });
  });

  it('behält bei Gleichstand den hiesigen Stand', () => {
    const lokal: SyncInhalt = { ...leer(), zustaende: [zustand('a', 5, { hitRate: 0.9 })] };
    const fremd: SyncInhalt = { ...leer(), zustaende: [zustand('a', 5, { hitRate: 0.1 })] };
    const zusammen = fuehreZusammen(lokal, fremd);
    expect(zusammen.zustaende[0]!.hitRate).toBe(0.9);
  });

  it('vereinigt Versuche und Sitzungen ohne Dubletten', () => {
    const versuch = (attemptId: string) => ({
      attemptId,
      taskId: 't',
      sessionId: null,
      topicIds: [],
      examArea: 'funktionsanalyse' as const,
      correct: true,
      partialCredit: 1,
      timeSpentMs: 1,
      sicherheit: null,
      fehlerklasse: 'keine' as const,
      factVersion: '1',
      ruleVersion: '1',
      engineVersion: '1',
      createdAt: '2026-01-01',
    });
    const lokal: SyncInhalt = { ...leer(), versuche: [versuch('v1'), versuch('v2')] };
    const fremd: SyncInhalt = { ...leer(), versuche: [versuch('v2'), versuch('v3')] };
    const zusammen = fuehreZusammen(lokal, fremd);
    expect(zusammen.versuche.map((v) => v.attemptId).sort()).toEqual(['v1', 'v2', 'v3']);
  });
});

describe('Einstellungen des Abgleichs', () => {
  it('liefert Vorgaben, wenn nichts gespeichert ist', () => {
    expect(ladeSyncEinstellungen()).toEqual(SYNC_STANDARD);
  });

  it('liest gespeicherte Werte zurück und füllt fehlende auf', () => {
    speichereSyncEinstellungen({ ...SYNC_STANDARD, token: 'ghp_x', gistId: 'abc' });
    const gelesen = ladeSyncEinstellungen();
    expect(gelesen.token).toBe('ghp_x');
    expect(gelesen.gistId).toBe('abc');
    expect(gelesen.letzterAbgleich).toBeNull();
  });
});

/** Ein GitHub-Gist-Server im Speicher – nur die drei benutzten Endpunkte. */
function gistServer(): { fetch: typeof fetch; dateien: Map<string, string> } {
  const dateien = new Map<string, string>();
  let naechste = 0;
  const server = async (eingabe: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(eingabe);
    const methode = init?.method ?? 'GET';
    const antwort = (status: number, koerper: unknown): Response =>
      new Response(JSON.stringify(koerper), { status, headers: { 'Content-Type': 'application/json' } });

    if (url.endsWith('/user')) return antwort(200, { login: 'lernende-person' });

    if (url === 'https://api.github.com/gists' && methode === 'POST') {
      const koerper = JSON.parse(String(init?.body)) as { files: Record<string, { content: string }> };
      const id = `gist-${(naechste += 1)}`;
      dateien.set(id, koerper.files['egt-lernstand.json']!.content);
      return antwort(201, { id });
    }

    const treffer = /\/gists\/(gist-\d+)$/.exec(url);
    if (treffer) {
      const id = treffer[1]!;
      if (methode === 'GET') {
        if (!dateien.has(id)) return antwort(404, { message: 'Not Found' });
        return antwort(200, { files: { 'egt-lernstand.json': { content: dateien.get(id) } } });
      }
      if (methode === 'PATCH') {
        if (!dateien.has(id)) return antwort(404, { message: 'Not Found' });
        const koerper = JSON.parse(String(init?.body)) as { files: Record<string, { content: string }> };
        dateien.set(id, koerper.files['egt-lernstand.json']!.content);
        return antwort(200, { id });
      }
    }
    return antwort(404, { message: 'Not Found' });
  };
  return { fetch: server as unknown as typeof fetch, dateien };
}

describe('Vollständiger Abgleich gegen einen Gist', () => {
  const passwort = 'streng-geheim-1';

  /** Legt den hiesigen Stand fest, ohne eine echte IndexedDB zu brauchen. */
  function setzeLokalenStand(stand: SyncInhalt): void {
    vi.spyOn(storage, 'alleZustaende').mockResolvedValue(stand.zustaende);
    vi.spyOn(storage, 'versuche').mockResolvedValue(stand.versuche);
    vi.spyOn(storage, 'sitzungen').mockResolvedValue(stand.sitzungen);
  }

  beforeEach(() => setzeLokalenStand({ zustaende: [], versuche: [], sitzungen: [], ergebnisse: [] }));
  afterEach(() => vi.restoreAllMocks());

  it('legt beim ersten Mal einen Gist an und schreibt den Stand hinein', async () => {
    const server = gistServer();
    vi.stubGlobal('fetch', server.fetch);

    const ergebnis = await gleicheAb({ ...SYNC_STANDARD, token: 'ghp_x' }, passwort);
    expect(ergebnis.gistId).toMatch(/^gist-/);
    expect(server.dateien.size).toBe(1);

    // Der Inhalt liegt verschlüsselt vor – kein Klartext, aber lesbar.
    const roh = JSON.parse([...server.dateien.values()][0]!) as unknown;
    expect(istHuelle(roh)).toBe(true);
    expect(JSON.stringify(roh)).not.toContain('topicId');
    const klartext = await entschluessle(roh as never, passwort);
    expect(JSON.parse(klartext)).toHaveProperty('zustaende');
    vi.unstubAllGlobals();
  });

  it('führt den Stand des anderen Geräts mit dem hiesigen zusammen', async () => {
    const server = gistServer();
    vi.stubGlobal('fetch', server.fetch);

    // Gerät 1 legt den Gist an – mit einem eigenen, kleineren Stand.
    setzeLokalenStand({ zustaende: [zustand('a', 5)], versuche: [], sitzungen: [], ergebnisse: [] });
    await gleicheAb({ ...SYNC_STANDARD, token: 'ghp_x' }, passwort);
    const gistId = ladeSyncEinstellungen().gistId;
    expect(gistId).not.toBe('');

    // Gerät 2: ein anderer, weiter gediehener Stand für dasselbe Thema.
    const fremd: SyncInhalt = {
      zustaende: [zustand('a', 12)],
      versuche: [],
      sitzungen: [],
      ergebnisse: [],
    };
    const { verschluessle } = await import('../src/crypto/krypto.ts');
    server.dateien.set(gistId, JSON.stringify(await verschluessle(JSON.stringify(fremd), passwort)));

    const ergebnis = await gleicheAb({ ...SYNC_STANDARD, token: 'ghp_x', gistId }, passwort);
    expect(ergebnis.uebernommen).toBe(1);
    expect(ergebnis.stand.zustaende[0]!.answered).toBe(12);
    vi.unstubAllGlobals();
  });

  it('meldet ein falsches Passwort, statt still zu scheitern', async () => {
    const server = gistServer();
    vi.stubGlobal('fetch', server.fetch);
    await gleicheAb({ ...SYNC_STANDARD, token: 'ghp_x' }, passwort);
    const gistId = ladeSyncEinstellungen().gistId;

    await expect(
      gleicheAb({ ...SYNC_STANDARD, token: 'ghp_x', gistId }, 'ein-anderes-passwort'),
    ).rejects.toThrow(/entschlüsseln/i);
    vi.unstubAllGlobals();
  });

  it('verlangt ein ausreichend langes Passwort', async () => {
    vi.stubGlobal('fetch', gistServer().fetch);
    await expect(gleicheAb({ ...SYNC_STANDARD, token: 'ghp_x' }, 'kurz')).rejects.toThrow(
      /mindestens 8 Zeichen/,
    );
    vi.unstubAllGlobals();
  });
});

describe('Ablage-Anbindung', () => {
  it('übernimmt einen Stand in die lokale Ablage', async () => {
    // Ein Adapter im Speicher, damit der Abgleich gegen die echte Schnittstelle
    // geprüft wird und nicht gegen einen Ersatz mit anderer Form.
    const { uebernehmeStand } = await import('../src/sync/index.ts');
    const zustaende = new Map<string, unknown>();
    const versuche: unknown[] = [];
    const sitzungen: unknown[] = [];
    vi.spyOn(storage, 'alleZustaende').mockResolvedValue([]);
    vi.spyOn(storage, 'versuche').mockResolvedValue([]);
    vi.spyOn(storage, 'sitzungen').mockResolvedValue([]);
    vi.spyOn(storage, 'schreibeZustand').mockImplementation(async (z) => {
      zustaende.set(z.topicId, z);
    });
    vi.spyOn(storage, 'protokolliereVersuch').mockImplementation(async (v) => {
      versuche.push(v);
    });
    vi.spyOn(storage, 'schreibeSitzung').mockImplementation(async (s) => {
      sitzungen.push(s);
    });

    await uebernehmeStand({
      zustaende: [zustand('a', 4), zustand('b', 1)],
      versuche: [],
      sitzungen: [],
      ergebnisse: [],
    });

    expect(zustaende.size).toBe(2);
    expect(versuche).toHaveLength(0);
    expect(sitzungen).toHaveLength(0);
    vi.restoreAllMocks();
  });

  it('legt Prüfungsergebnisse in der dafür vorgesehenen Ablage ab', async () => {
    const { uebernehmeStand } = await import('../src/sync/index.ts');
    vi.spyOn(storage, 'schreibeZustand').mockResolvedValue();
    vi.spyOn(storage, 'protokolliereVersuch').mockResolvedValue();
    vi.spyOn(storage, 'schreibeSitzung').mockResolvedValue();

    await uebernehmeStand({
      zustaende: [],
      versuche: [],
      sitzungen: [],
      ergebnisse: [
        {
          pruefungId: 'p1',
          datum: '2026-01-01',
          gesamt: 80,
          bereiche: [],
        } as never,
      ],
    });

    expect((await ladeErgebnisse()).map((e) => e.pruefungId)).toEqual(['p1']);
    vi.restoreAllMocks();
  });
});
