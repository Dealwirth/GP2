import type { Attempt, Session, TopicStateRecord } from '../domain/types.ts';

/**
 * Speicher-Adapter.
 *
 * Zwei Implementierungen sind vorgesehen: `indexeddb` (Standard, ohne Server)
 * und `sqlite` (Add-on-Variante). Der gesamte Lerncode kennt nur dieses
 * Interface – deshalb lässt sich der Betrieb wechseln, ohne Fachlogik anzufassen.
 */
export interface StorageAdapter {
  leseZustand(topicId: string): Promise<TopicStateRecord | null>;
  schreibeZustand(record: TopicStateRecord): Promise<void>;
  loescheZustand(topicId: string): Promise<void>;
  alleZustaende(): Promise<TopicStateRecord[]>;
  protokolliereVersuch(versuch: Attempt): Promise<void>;
  versuche(): Promise<Attempt[]>;
  sitzungStarten(sitzung: Session): Promise<void>;
  /** Schreibt eine Sitzung, ohne die laufende Sitzung anzufassen. */
  schreibeSitzung(sitzung: Session): Promise<void>;
  sitzungBeenden(sessionId: string, ende: string): Promise<void>;
  laufendeSitzung(): Promise<Session | null>;
  sitzungen(): Promise<Session[]>;
  alleErgebnisse(): Promise<Record<string, unknown>>;
  loescheAlles(): Promise<void>;
}

const DB_NAME = 'egg-trainer';

/**
 * Schemafassung der Datenbank.
 *
 * **Regel für jede Erhöhung:** Beim Aktualisieren werden ausschließlich
 * FEHLENDE Speicher angelegt. Es wird nie ein Speicher gelöscht und nie einer
 * geleert. Der Lernstand eines Nutzers darf an einer Schemaänderung nicht
 * scheitern – er ist das Einzige in dieser Anwendung, was sich nicht neu
 * erzeugen lässt. Wer Felder umbenennt, liest den alten Wert und schreibt den
 * neuen daneben; wer einen Speicher aufteilt, kopiert um, statt zu leeren.
 *
 * Der Name `egg-trainer` bleibt ebenfalls für immer: Ein umbenannter
 * Speicherort ist für IndexedDB ein anderer, und die alten Daten wären für
 * die Anwendung unauffindbar.
 */
const DB_VERSION = 1;

const SPEICHER = ['topic_state', 'attempts', 'sessions', 'kv'] as const;
type SpeicherName = (typeof SPEICHER)[number];

function oeffneDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const anfrage = indexedDB.open(DB_NAME, DB_VERSION);
    anfrage.onupgradeneeded = () => {
      const db = anfrage.result;
      for (const name of SPEICHER) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      }
    };
    anfrage.onsuccess = () => resolve(anfrage.result);
    anfrage.onerror = () =>
      reject(anfrage.error ?? new Error('Die lokale Datenbank ließ sich nicht öffnen.'));
  });
}

function hole(db: IDBDatabase, name: SpeicherName, key: IDBValidKey): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const anfrage = db.transaction(name, 'readonly').objectStore(name).get(key);
    anfrage.onsuccess = () => resolve(anfrage.result);
    anfrage.onerror = () => reject(anfrage.error);
  });
}

function holeAlle(db: IDBDatabase, name: SpeicherName): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const anfrage = db.transaction(name, 'readonly').objectStore(name).getAll();
    anfrage.onsuccess = () => resolve(anfrage.result as unknown[]);
    anfrage.onerror = () => reject(anfrage.error);
  });
}

function setze(db: IDBDatabase, name: SpeicherName, key: IDBValidKey, wert: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaktion = db.transaction(name, 'readwrite');
    transaktion.objectStore(name).put(wert, key);
    transaktion.oncomplete = () => resolve();
    transaktion.onerror = () => reject(transaktion.error);
  });
}

const LAUFENDE_SITZUNG = 'laufende-sitzung';

export class IndexedDbAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;

  private async db0(): Promise<IDBDatabase> {
    this.db ??= await oeffneDb();
    return this.db;
  }

  async leseZustand(topicId: string): Promise<TopicStateRecord | null> {
    const db = await this.db0();
    return (await hole(db, 'topic_state', topicId)) as TopicStateRecord | null;
  }

  async schreibeZustand(record: TopicStateRecord): Promise<void> {
    const db = await this.db0();
    await setze(db, 'topic_state', record.topicId, record);
  }

  async alleZustaende(): Promise<TopicStateRecord[]> {
    const db = await this.db0();
    return (await holeAlle(db, 'topic_state')) as TopicStateRecord[];
  }

  async loescheZustand(topicId: string): Promise<void> {
    const db = await this.db0();
    await new Promise<void>((resolve, reject) => {
      const transaktion = db.transaction('topic_state', 'readwrite');
      transaktion.objectStore('topic_state').delete(topicId);
      transaktion.oncomplete = () => resolve();
      transaktion.onerror = () => reject(transaktion.error);
    });
  }

  async protokolliereVersuch(versuch: Attempt): Promise<void> {
    const db = await this.db0();
    await setze(db, 'attempts', versuch.attemptId, versuch);
  }

  async versuche(): Promise<Attempt[]> {
    const db = await this.db0();
    return (await holeAlle(db, 'attempts')) as Attempt[];
  }

  async sitzungStarten(sitzung: Session): Promise<void> {
    const db = await this.db0();
    await setze(db, 'sessions', sitzung.sessionId, sitzung);
    await setze(db, 'kv', LAUFENDE_SITZUNG, sitzung);
  }

  /**
   * Schreibt eine Sitzung, ohne den Zeiger auf die laufende zu verändern.
   *
   * Notwendig für die Synchronisation: Ein hereingeholter Stand enthält
   * Sitzungen, aber die Sitzung, die man gerade auf diesem Gerät bearbeitet,
   * ist eine andere. Über `sitzungStarten` würde der Abgleich sie ersetzen –
   * und die laufende Runde wäre weg.
   */
  async schreibeSitzung(sitzung: Session): Promise<void> {
    const db = await this.db0();
    await setze(db, 'sessions', sitzung.sessionId, sitzung);
  }

  async sitzungBeenden(sessionId: string, ende: string): Promise<void> {
    const db = await this.db0();
    const sitzung = (await hole(db, 'sessions', sessionId)) as Session | undefined;
    if (!sitzung) return;
    await setze(db, 'sessions', sessionId, { ...sitzung, endedAt: ende });
    await setze(db, 'kv', LAUFENDE_SITZUNG, null);
  }

  async laufendeSitzung(): Promise<Session | null> {
    const db = await this.db0();
    return ((await hole(db, 'kv', LAUFENDE_SITZUNG)) as Session | null) ?? null;
  }

  async sitzungen(): Promise<Session[]> {
    const db = await this.db0();
    return (await holeAlle(db, 'sessions')) as Session[];
  }

  async alleErgebnisse(): Promise<Record<string, unknown>> {
    return {
      zustaende: await this.alleZustaende(),
      versuche: await this.versuche(),
      sitzungen: await this.sitzungen(),
    };
  }

  async loescheAlles(): Promise<void> {
    const db = await this.db0();
    for (const name of SPEICHER) {
      await new Promise<void>((resolve, reject) => {
        const transaktion = db.transaction(name, 'readwrite');
        transaktion.objectStore(name).clear();
        transaktion.oncomplete = () => resolve();
        transaktion.onerror = () => reject(transaktion.error);
      });
    }
  }
}

export const storage: StorageAdapter = new IndexedDbAdapter();
