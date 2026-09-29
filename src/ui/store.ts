import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Attempt, ExamArea, Session, TopicStateRecord } from '../domain/types.ts';
import { storage } from '../storage/index.ts';
import { baueDigest, coachNotiz, ueberwacheLernen, type Digest, type Insight } from '../memory/index.ts';
import { berechnePrognose, type Pruefungsergebnis, type Prognose } from '../domain/exam/simulation.ts';
import { holeEinstellungen, speichereEinstellungen, type Einstellungen } from './einstellungen.ts';
import { holeAtom } from '../content/curriculum/index.ts';
import {
  ladeErgebnisse,
  loescheErgebnisse,
  speichereErgebnisse,
} from '../storage/ergebnisse.ts';

export { ladeErgebnisse, speichereErgebnisse, loescheErgebnisse };

export interface Store {
  geladen: boolean;
  zustaende: Map<string, TopicStateRecord>;
  versuche: Attempt[];
  sitzungen: Session[];
  digest: Digest;
  insights: Insight[];
  notizen: string[];
  prognose: Prognose;
  ergebnisse: Pruefungsergebnis[];
  einstellungen: Einstellungen;
  aktualisieren: () => Promise<void>;
  einstellungSetzen: (patch: Partial<Einstellungen>) => Promise<void>;
  ergebnisHinzufuegen: (ergebnis: Pruefungsergebnis) => Promise<void>;
  korrekturHinzufuegen: (insight: Insight) => void;
  zuruecksetzen: () => Promise<void>;
}

/**
 * Ein zentraler Zustand für die Oberfläche.
 *
 * Bewusst kein globales Framework: der Lerncode bleibt reines TypeScript und
 * ist ohne React testbar. Die Oberfläche liest den Speicher und hält eine
 * Kopie im Arbeitsspeicher.
 */
export function useStore(): Store {
  const [geladen, setGeladen] = useState(false);
  const [zustaendeListe, setZustaendeListe] = useState<TopicStateRecord[]>([]);
  const [versuche, setVersuche] = useState<Attempt[]>([]);
  const [sitzungen, setSitzungen] = useState<Session[]>([]);
  const [ergebnisse, setErgebnisse] = useState<Pruefungsergebnis[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [einstellungen, setEinstellungen] = useState<Einstellungen>(holeEinstellungen);

  const aktualisieren = useCallback(async () => {
    const [z, v, s, e] = await Promise.all([
      storage.alleZustaende(),
      storage.versuche(),
      storage.sitzungen(),
      ladeErgebnisse(),
    ]);

    // Aufräumen: Datensätze zu Themen, die es im Lernpfad nicht (mehr) gibt,
    // stammen aus einer älteren Fassung. Sie würden in keiner Kennzahl
    // auftauchen, aber Speicher belegen und Verwirrung stiften.
    const gueltig = z.filter((eintrag) => holeAtom(eintrag.topicId));
    if (gueltig.length !== z.length) {
      for (const verwaister of z) {
        if (!holeAtom(verwaister.topicId)) await storage.loescheZustand(verwaister.topicId);
      }
    }

    const karte = new Map(gueltig.map((eintrag) => [eintrag.topicId, eintrag]));
    setZustaendeListe(gueltig);
    setVersuche(v);
    setSitzungen(s);
    setErgebnisse(e);
    setInsights(ueberwacheLernen(karte, baueDigest(karte), e));
    setGeladen(true);
  }, []);

  useEffect(() => {
    void aktualisieren();
  }, [aktualisieren]);

  const einstellungSetzen = useCallback(async (patch: Partial<Einstellungen>) => {
    const neu = { ...holeEinstellungen(), ...patch };
    speichereEinstellungen(neu);
    setEinstellungen(neu);
  }, []);

  const ergebnisHinzufuegen = useCallback(async (ergebnis: Pruefungsergebnis) => {
    const neu = [...(await ladeErgebnisse()), ergebnis];
    await speichereErgebnisse(neu);
    setErgebnisse(neu);
  }, []);

  const korrekturHinzufuegen = useCallback((insight: Insight) => {
    setInsights((alt) => [insight, ...alt.filter((i) => i.typ !== insight.typ || i.topicId !== insight.topicId)]);
  }, []);

  const zuruecksetzen = useCallback(async () => {
    await storage.loescheAlles();
    await loescheErgebnisse();
    await aktualisieren();
  }, [aktualisieren]);

  const zustaende = useMemo(() => new Map(zustaendeListe.map((z) => [z.topicId, z])), [zustaendeListe]);
  const digest = useMemo(() => baueDigest(zustaende), [zustaende]);
  const notizen = useMemo(() => coachNotiz(insights), [insights]);
  const prognose = useMemo(() => berechnePrognose(zustaende, ergebnisse), [zustaende, ergebnisse]);

  return {
    geladen,
    zustaende,
    versuche,
    sitzungen,
    digest,
    insights,
    notizen,
    prognose,
    ergebnisse,
    einstellungen,
    aktualisieren,
    einstellungSetzen,
    ergebnisHinzufuegen,
    korrekturHinzufuegen,
    zuruecksetzen,
  };
}

export type { ExamArea };
