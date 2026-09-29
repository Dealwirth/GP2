import { describe, expect, it } from 'vitest';
import {
  leererStand,
  normalisiereStand,
  standKennzahlen,
  vereinigeStand,
  SYNC_FORMAT,
  type SyncStand,
} from '../src/sync/typen.ts';
import { signatur } from '../src/sync/lokal.ts';
import {
  ausVerbindungscode,
  neueKennung,
  pruefeWorkerUrl,
  verbindungscode,
} from '../src/sync/verbindung.ts';
import {
  entschluessle,
  istHuelle,
  verschluessle,
} from '../src/crypto/krypto.ts';
import {
  TERMINE_2027_SOMMER,
  SICHERHEIT_TEXT,
  TRAEGER_TEXT,
  ZUSTAENDIGE_STELLE,
  termineMitVorgaben,
  tageBis,
} from '../src/domain/termine.ts';
import type { Attempt, Session, TopicStateRecord } from '../src/domain/types.ts';
import type { Pruefungsergebnis } from '../src/domain/exam/simulation.ts';

// ---------------------------------------------------------------------------
// Beispieldaten
// ---------------------------------------------------------------------------

function zustand(topicId: string, teil: Partial<TopicStateRecord> = {}): TopicStateRecord {
  return {
    topicId,
    state: 'gesehen',
    correctStreak: 1,
    hitRate: 0.5,
    confidenceRate: 0.5,
    answered: 4,
    lastSeen: '2026-10-01T10:00:00.000Z',
    streakStartedAt: null,
    nextDue: null,
    labSolved: false,
    ...teil,
  };
}

function versuch(attemptId: string, createdAt: string): Attempt {
  return {
    attemptId,
    taskId: 't1',
    sessionId: null,
    topicIds: ['k1'],
    examArea: 'kundenauftrag',
    correct: true,
    partialCredit: 1,
    timeSpentMs: 1000,
    sicherheit: 'sicher',
    fehlerklasse: 'keine',
    factVersion: '1.0',
    ruleVersion: '1.0',
    engineVersion: '1.0',
    createdAt,
  };
}

function sitzung(sessionId: string, startedAt: string, endedAt: string | null): Session {
  return { sessionId, mode: 'normal', budgetSeconds: 300, startedAt, endedAt, taskIds: ['t1'] };
}

function ergebnis(pruefungId: string, beendetAm: string, punkte = 50): Pruefungsergebnis {
  return {
    pruefungId,
    bereich: 'systementwurf',
    richtig: 5,
    gesamt: 10,
    punkte,
    maxPunkte: 100,
    quote: 0.5,
    note: 3,
    dauerSekunden: 600,
    imZeitbudget: true,
    beendetAm,
    schwacheThemenIds: [],
  };
}

function stand(teil: Partial<SyncStand> = {}): SyncStand {
  return { ...leererStand('2026-10-01T00:00:00.000Z', 'aaaa'), ...teil };
}

// ---------------------------------------------------------------------------
// Standformat
// ---------------------------------------------------------------------------

describe('Standformat', () => {
  it('liest einen Stand, der von einer älteren Fassung geschrieben wurde', () => {
    // Nur Zustände, kein `standAm`, keine Versuche: So sah eine frühe Fassung
    // aus. Genau dieser Fall darf nicht scheitern – sonst kostet ein Update
    // die Lerndaten.
    const alt = { zustaende: [zustand('k1')] } as unknown;
    const gelesen = normalisiereStand(alt);
    expect(gelesen.formatVersion).toBe(SYNC_FORMAT);
    expect(gelesen.zustaende).toHaveLength(1);
    expect(gelesen.versuche).toEqual([]);
    expect(gelesen.sitzungen).toEqual([]);
    expect(gelesen.ergebnisse).toEqual([]);
    expect(Number.isFinite(new Date(gelesen.standAm).getTime())).toBe(true);
  });

  it('wirft bei Unsinn nicht, sondern liefert einen leeren Stand', () => {
    for (const unsinn of [null, 42, 'text', [], undefined]) {
      const gelesen = normalisiereStand(unsinn);
      expect(gelesen.zustaende).toEqual([]);
      expect(gelesen.versuche).toEqual([]);
    }
  });

  it('behält Datensätze ohne Kennung nicht – sie ließen sich nicht zusammenführen', () => {
    const gelesen = normalisiereStand({
      zustaende: [zustand('k1'), { answered: 3 }],
      versuche: [versuch('a1', '2026-10-01T00:00:00.000Z'), {}],
      sitzungen: [sitzung('s1', '2026-10-01T00:00:00.000Z', null), { mode: 'normal' }],
      ergebnisse: [ergebnis('p1', '2026-10-02T00:00:00.000Z'), { punkte: 5 }],
    });
    expect(gelesen.zustaende.map((z) => z.topicId)).toEqual(['k1']);
    expect(gelesen.versuche.map((v) => v.attemptId)).toEqual(['a1']);
    expect(gelesen.sitzungen.map((s) => s.sessionId)).toEqual(['s1']);
    expect(gelesen.ergebnisse.map((e) => e.pruefungId)).toEqual(['p1']);
  });

  it('verwirft unbekannte Felder, ohne den Rest zu verlieren', () => {
    const gelesen = normalisiereStand({
      zustaende: [zustand('k1', { etwasNeues: true } as never)],
      geheimnis: 'sollte verschwinden',
    });
    expect(Object.keys(gelesen)).not.toContain('geheimnis');
    expect(gelesen.zustaende[0]!.topicId).toBe('k1');
  });
});

// ---------------------------------------------------------------------------
// Zusammenführen
// ---------------------------------------------------------------------------

describe('Zusammenführen zweier Stände', () => {
  it('verliert keinen einzigen Versuch – auf keiner Seite', () => {
    const links = stand({ versuche: [versuch('a1', '2026-10-01T00:00:00.000Z')] });
    const rechts = stand({ versuche: [versuch('a2', '2026-10-02T00:00:00.000Z')] });
    const zusammen = vereinigeStand(links, rechts);
    expect(zusammen.versuche.map((v) => v.attemptId)).toEqual(['a1', 'a2']);
  });

  it('sortiert Versuche chronologisch, egal in welcher Reihenfolge sie kommen', () => {
    const links = stand({
      versuche: [versuch('b', '2026-10-05T00:00:00.000Z'), versuch('a', '2026-10-01T00:00:00.000Z')],
    });
    const zusammen = vereinigeStand(links, stand());
    expect(zusammen.versuche.map((v) => v.attemptId)).toEqual(['a', 'b']);
  });

  it('nimmt den Zustand mit mehr Antworten – sonst ginge Fortschritt verloren', () => {
    const links = stand({ zustaende: [zustand('k1', { answered: 12, state: 'gefestigt' })] });
    const rechts = stand({ zustaende: [zustand('k1', { answered: 3, state: 'neu' })] });

    for (const zusammen of [vereinigeStand(links, rechts), vereinigeStand(rechts, links)]) {
      const k1 = zusammen.zustaende.find((z) => z.topicId === 'k1')!;
      expect(k1.answered).toBe(12);
      expect(k1.state).toBe('gefestigt');
    }
  });

  it('behält eine im Labor gelöste Aufgabe, auch wenn der andere Stand weniger weiß', () => {
    const links = stand({ zustaende: [zustand('k1', { answered: 30, labSolved: false })] });
    const rechts = stand({ zustaende: [zustand('k1', { answered: 2, labSolved: true })] });
    expect(vereinigeStand(links, rechts).zustaende[0]!.labSolved).toBe(true);
  });

  it('verschiebt die nächste Wiederholung nach hinten, nicht nach vorn', () => {
    const links = stand({ zustaende: [zustand('k1', { nextDue: '2026-12-01T00:00:00.000Z' })] });
    const rechts = stand({ zustaende: [zustand('k1', { nextDue: '2026-11-01T00:00:00.000Z' })] });
    expect(vereinigeStand(links, rechts).zustaende[0]!.nextDue).toBe('2026-12-01T00:00:00.000Z');
    expect(vereinigeStand(rechts, links).zustaende[0]!.nextDue).toBe('2026-12-01T00:00:00.000Z');
  });

  it('lässt eine beendete Sitzung nicht von einer laufenden überschreiben', () => {
    const links = stand({ sitzungen: [sitzung('s1', '2026-10-01T00:00:00.000Z', null)] });
    const rechts = stand({ sitzungen: [sitzung('s1', '2026-10-01T00:00:00.000Z', '2026-10-01T00:05:00.000Z')] });
    expect(vereinigeStand(links, rechts).sitzungen[0]!.endedAt).toBe('2026-10-01T00:05:00.000Z');
    expect(vereinigeStand(rechts, links).sitzungen[0]!.endedAt).toBe('2026-10-01T00:05:00.000Z');
  });

  it('behält das später beendete Prüfungsergebnis', () => {
    const links = stand({ ergebnisse: [ergebnis('p1', '2026-10-01T00:00:00.000Z', 40)] });
    const rechts = stand({ ergebnisse: [ergebnis('p1', '2026-11-01T00:00:00.000Z', 80)] });
    expect(vereinigeStand(links, rechts).ergebnisse[0]!.punkte).toBe(80);
  });

  it('bringt zwei Geräte auf denselben Stand – beliebig oft angewandt', () => {
    const links = stand({
      zustaende: [zustand('k1', { answered: 9 }), zustand('k2', { answered: 2 })],
      versuche: [versuch('a1', '2026-10-01T00:00:00.000Z')],
    });
    const rechts = stand({
      zustaende: [zustand('k1', { answered: 3 }), zustand('k3', { answered: 7 })],
      versuche: [versuch('a2', '2026-10-02T00:00:00.000Z')],
    });

    const einmal = vereinigeStand(links, rechts);
    // Ein zweiter Lauf mit demselben Ergebnis darf nichts mehr ändern: Sonst
    // würde jeder Abgleich neue Daten erzeugen und ewig hochladen.
    expect(signatur(vereinigeStand(einmal, links))).toBe(signatur(einmal));
    expect(signatur(vereinigeStand(einmal, rechts))).toBe(signatur(einmal));
    expect(einmal.zustaende.map((z) => z.topicId).sort()).toEqual(['k1', 'k2', 'k3']);
  });

  it('behält einen Stand, den nur eine Seite kennt', () => {
    const leer = stand();
    const voll = stand({
      zustaende: [zustand('k1')],
      versuche: [versuch('a1', '2026-10-01T00:00:00.000Z')],
      sitzungen: [sitzung('s1', '2026-10-01T00:00:00.000Z', null)],
      ergebnisse: [ergebnis('p1', '2026-10-01T00:00:00.000Z')],
    });
    expect(vereinigeStand(leer, voll)).toEqual({ ...voll, standAm: voll.standAm });
    expect(vereinigeStand(voll, leer).zustaende).toHaveLength(1);
  });

  it('nimmt den späteren Zeitstempel als Standzeitpunkt', () => {
    const alt = stand({ standAm: '2026-01-01T00:00:00.000Z' });
    const neu = stand({ standAm: '2026-12-31T00:00:00.000Z' });
    expect(vereinigeStand(alt, neu).standAm).toBe('2026-12-31T00:00:00.000Z');
    expect(vereinigeStand(neu, alt).standAm).toBe('2026-12-31T00:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// Signatur
// ---------------------------------------------------------------------------

describe('Signatur', () => {
  it('ist gleich, wenn nur der Zeitstempel des Standes anders ist', () => {
    const a = stand({ standAm: '2026-10-01T00:00:00.000Z', geraet: 'aaaa' });
    const b = stand({ standAm: '2030-01-01T00:00:00.000Z', geraet: 'bbbb' });
    expect(signatur(a)).toBe(signatur(b));
  });

  it('ändert sich, sobald ein Versuch dazukommt', () => {
    const vorher = stand({ versuche: [versuch('a1', '2026-10-01T00:00:00.000Z')] });
    const nachher = stand({
      versuche: [versuch('a1', '2026-10-01T00:00:00.000Z'), versuch('a2', '2026-10-02T00:00:00.000Z')],
    });
    expect(signatur(vorher)).not.toBe(signatur(nachher));
  });

  it('merkt sich auch eine einzelne neue Antwort im selben Thema', () => {
    const vorher = stand({ zustaende: [zustand('k1', { answered: 4 })] });
    const nachher = stand({ zustaende: [zustand('k1', { answered: 5 })] });
    expect(signatur(vorher)).not.toBe(signatur(nachher));
  });

  it('erkennt einen neuen Lernstand ohne Versuche am jüngsten Sichtungsdatum', () => {
    const vorher = stand({ zustaende: [zustand('k1', { lastSeen: '2026-10-01T00:00:00.000Z' })] });
    const nachher = stand({ zustaende: [zustand('k1', { lastSeen: '2026-10-02T00:00:00.000Z' })] });
    expect(signatur(vorher)).not.toBe(signatur(nachher));
  });
});

describe('Kennzahlen', () => {
  it('zählt Themen, Antworten, Sitzungen und Prüfungen', () => {
    const gemessen = standKennzahlen(
      stand({
        zustaende: [zustand('k1', { answered: 3 }), zustand('k2', { answered: 4 })],
        sitzungen: [sitzung('s1', '2026-10-01T00:00:00.000Z', null)],
        ergebnisse: [ergebnis('p1', '2026-10-01T00:00:00.000Z')],
      }),
    );
    expect(gemessen).toEqual({ themen: 2, antworten: 7, sitzungen: 1, pruefungen: 1 });
  });
});

// ---------------------------------------------------------------------------
// Verbindung
// ---------------------------------------------------------------------------

describe('Worker-Adresse', () => {
  it('nimmt eine saubere https-Adresse an und entfernt den Schrägstrich', () => {
    expect(pruefeWorkerUrl('https://egt.example.workers.dev/')).toEqual({
      ok: true,
      url: 'https://egt.example.workers.dev',
    });
  });

  it('lehnt http ab – sonst läge der Lernstand ungesichert auf dem Weg', () => {
    const ergebnis = pruefeWorkerUrl('http://egt.example.workers.dev');
    expect(ergebnis.ok).toBe(false);
  });

  it('erlaubt localhost für die Entwicklung', () => {
    expect(pruefeWorkerUrl('http://localhost:8787')).toEqual({ ok: true, url: 'http://localhost:8787' });
  });

  it('lehnt einen Pfad ab, weil daraus zwei Schrägstriche würden', () => {
    expect(pruefeWorkerUrl('https://beispiel.de/v1/chat').ok).toBe(false);
  });

  it('lehnt leere und unsinnige Eingaben ab', () => {
    expect(pruefeWorkerUrl('').ok).toBe(false);
    expect(pruefeWorkerUrl('keine adresse').ok).toBe(false);
  });
});

describe('Verbindungscode', () => {
  const verbindung = { workerUrl: 'https://egt.example.workers.dev', kennung: 'a'.repeat(32) };

  it('lässt sich hin und zurück übersetzen', () => {
    expect(ausVerbindungscode(verbindungscode(verbindung))).toEqual(verbindung);
  });

  it('enthält das Passwort nicht', () => {
    // Der ganze Sinn der Trennung: Wer den Code abfängt, hat den Ort, aber
    // nicht den Inhalt.
    const code = verbindungscode(verbindung);
    expect(code).not.toContain('geheim');
  });

  it('weist fremde Zeichenketten ab', () => {
    expect(ausVerbindungscode('irgendwas')).toBeNull();
    expect(ausVerbindungscode('EGT1-%%%')).toBeNull();
    expect(ausVerbindungscode('')).toBeNull();
  });

  it('erzeugt Kennungen, die nicht ratbar sind und sich unterscheiden', () => {
    const a = neueKennung();
    const b = neueKennung();
    expect(a).toMatch(/^[a-f0-9]{32}$/);
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// Verschlüsselung
// ---------------------------------------------------------------------------

describe('Verschlüsselung', () => {
  it('verschlüsselt und entschlüsselt wieder', async () => {
    const klartext = JSON.stringify({ zustaende: [{ topicId: 'k1' }] });
    const huelle = await verschluessle(klartext, 'ein langes passwort');
    expect(istHuelle(huelle)).toBe(true);
    expect(huelle.daten).not.toContain('k1');
    expect(await entschluessle(huelle, 'ein langes passwort')).toBe(klartext);
  });

  it('erzeugt bei gleichem Inhalt unterschiedliche Chiffre (Salz und IV sind neu)', async () => {
    const a = await verschluessle('gleich', 'ein langes passwort');
    const b = await verschluessle('gleich', 'ein langes passwort');
    expect(a.daten).not.toBe(b.daten);
    expect(a.salt).not.toBe(b.salt);
  });

  it('verweigert die Entschlüsselung mit falschem Passwort', async () => {
    const huelle = await verschluessle('geheim', 'das richtige passwort');
    await expect(entschluessle(huelle, 'das falsche passwort')).rejects.toThrow();
  });

  it('bemerkt eine Veränderung an den Daten', async () => {
    const huelle = await verschluessle('geheim', 'das richtige passwort');
    const verbogen = { ...huelle, daten: `${huelle.daten.slice(0, -4)}AAAA` };
    await expect(entschluessle(verbogen, 'das richtige passwort')).rejects.toThrow();
  });

  it('erkennt eine Hülle an ihrer Form', () => {
    expect(istHuelle({ salt: 'a', iv: 'b', daten: 'c', pruefsumme: 'd' })).toBe(true);
    expect(istHuelle({ salt: 'a' })).toBe(false);
    expect(istHuelle('EGT1-xxxx')).toBe(false);
    expect(istHuelle(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Prüfungsplan
// ---------------------------------------------------------------------------

describe('Prüfungsplan Schweinfurt', () => {
  it('nennt die Handwerksordnung als Rechtsgrundlage, nicht das BBiG', () => {
    // Elektroniker/-in für Energie- und Gebäudetechnik ist ein Handwerksberuf.
    // Hier stand vorher die IHK – und damit die falsche Stelle.
    expect(ZUSTAENDIGE_STELLE.rechtsgrundlage).toContain('Handwerksordnung');
    expect(ZUSTAENDIGE_STELLE.pruefendeStelle).toContain('Innung');
    expect(ZUSTAENDIGE_STELLE.kammer).toContain('Handwerkskammer für Unterfranken');
    expect(ZUSTAENDIGE_STELLE.bezirk).toContain('Schweinfurt');
  });

  it('kennzeichnet jedes Datum mit Herkunft und Belastbarkeit', () => {
    for (const termin of TERMINE_2027_SOMMER) {
      expect(SICHERHEIT_TEXT[termin.sicherheit]).toBeTruthy();
      expect(TRAEGER_TEXT[termin.traeger]).toBeTruthy();
      expect(termin.quelle.length).toBeGreaterThan(5);
      // Nur amtliche Termine gelten als feststehend. Alles andere ist eine
      // Orientierung oder eine Annahme – das darf nicht verwischen.
      expect(termin.verbindlich).toBe(termin.sicherheit === 'amtlich');
    }
  });

  it('hält die beiden planbaren Termine aus dem veröffentlichten Plan fest', () => {
    const schriftlich = TERMINE_2027_SOMMER.find((t) => t.id === 'schriftlich')!;
    const praktisch = TERMINE_2027_SOMMER.find((t) => t.id === 'praktisch-beginn')!;
    expect(schriftlich.datum).toBe('2027-05-11');
    expect(praktisch.datum).toBe('2027-06-07');
    expect(praktisch.datum > schriftlich.datum).toBe(true);
    // Beide stammen aus dem IHK-Plan und sind für die Handwerksprüfung nur
    // eine Orientierung – genau das muss kenntlich bleiben.
    expect(schriftlich.sicherheit).toBe('orientierung');
    expect(praktisch.sicherheit).toBe('orientierung');
    expect(schriftlich.quelle).toContain('IHK');
  });

  it('macht den eigenen Termin aus dem Einladungsschreiben zum amtlichen', () => {
    const termine = termineMitVorgaben({ schriftlich: '2027-05-18' });
    const schriftlich = termine.find((t) => t.id === 'schriftlich')!;
    expect(schriftlich.datum).toBe('2027-05-18');
    expect(schriftlich.sicherheit).toBe('amtlich');
    expect(schriftlich.verbindlich).toBe(true);
    expect(schriftlich.quelle).toContain('Einladungsschreiben');
    // Der andere Termin bleibt unangetastet.
    expect(termine.find((t) => t.id === 'praktisch-beginn')!.datum).toBe('2027-06-07');
  });

  it('ignoriert unbrauchbare Vorgaben, statt den Plan zu zerstören', () => {
    for (const unsinn of ['', 'morgen', '2027-13-45']) {
      const termine = termineMitVorgaben({ schriftlich: unsinn });
      expect(termine.find((t) => t.id === 'schriftlich')!.datum).toBe('2027-05-11');
    }
  });

  it('lässt die schriftliche Prüfung vor dem 11.05.2027 liegen – 225 Tage ab dem 28.09.2026', () => {
    expect(tageBis('2027-05-11', new Date('2026-09-28T12:00:00'))).toBe(225);
  });
});
