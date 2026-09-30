import type { TaskProposal } from '../domain/types.ts';
import { VORSCHLAG_SCHEMA } from './schemas.ts';

// In Node (Tests) gibt es kein import.meta.env – dort greift nur der
// Umgebungsvariablen-Weg über Vitest-Setup oder Testeinstellungen.
const BAU_ZEIT_SCHLUESSEL: string =
  typeof import.meta !== 'undefined' && import.meta.env
    ? ((import.meta.env.VITE_GROQ_KEY as string | undefined)?.trim() ?? '')
    : '';

/**
 * KI-Zugang.
 *
 * Ein Weg, kein Umweg: Direkt gegen Groq. Der Schlüssel liegt im Quellcode,
 * weil dieser Trainer ein persönliches Lernwerkzeug ist, kein öffentliches
 * Produkt. Was das bedeutet: Jeder, der den Quelltext liest, könnte das
 * Kontingent dieses Schlüssels mitverbrauchen. Das Risiko ist begrenzt –
 * der Gratis-Tarif kostet nichts, und Fachdaten liegen ohnehin keine im
 * Spiel. Ein entwendeter Schlüssel ist also ärgerlich, aber harmlos; er
 * lässt sich auf console.groq.com jederzeit neu erzeugen.
 *
 * Schlägt der Aufruf fehl, wirft diese Schicht einen `KiNichtErreichbar`.
 * Alles andere in der App funktioniert weiter, weil keine Fachlogik von der
 * KI abhängt.
 */

/** Direkter Endpunkt bei Groq. */
export const DIRECT_GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Der eingebaute Schlüssel.
 *
 * Er kommt beim Bau aus der Umgebungsvariable `VITE_GROQ_KEY` (GitHub-Actions-
 * Secret bzw. `.env.local` für die lokale Entwicklung) und landet so in der
 * fertigen Anwendung. Im Quelltext steht er absichtlich nicht: GitHub
 * verweigert öffentlichen Repositories jeden Push mit Klartext-Schlüsseln,
 * und zu Recht. Drehen oder wechseln heißt: Secret im Repository aktualisieren,
 * nächster Bau übernimmt ihn.
 */
export const EINGEBAUTER_SCHLUESSEL: string = BAU_ZEIT_SCHLUESSEL;

/**
 * Verfügbare Modelle.
 *
 * Qwen steht vorn, und das ist keine Geschmacksfrage: Die GPT-OSS-Modelle
 * sind Denkmodelle, die einen Teil ihres Antwortbudgets für den Denkweg
 * verbrauchen. Beim strengen JSON-Schema dieses Trainers reicht der Rest
 * regelmäßig nicht – Groq antwortet mit „Failed to validate JSON", das
 * Modell liefert also gar nichts. Qwen liefert dasselbe Schema zuverlässig.
 *
 * GPT-OSS bleibt als Ausweich stehen: Der Client fällt bei einem
 * Schema-Fehler selbsttätig auf den einfachen JSON-Modus zurück. Wer den
 * schnelleren Weg will, kann umschalten – und sieht im Selbsttest sofort,
 * ob es trägt.
 */
export const STANDARD_MODELLE: Record<string, string> = {
  'Qwen 3.8 27b (zuverlässig, Standard)': 'qwen/qwen3.8-27b',
  'Groq: GPT-OSS 20b (schnell, Ausweich)': 'openai/gpt-oss-20b',
  'Groq: GPT-OSS 120b (präzise, Ausweich)': 'openai/gpt-oss-120b',
};

export const STANDARD_MODELL: string = 'qwen/qwen3.8-27b';

export interface AiEinstellungen {
  /** Endpunkt. Fester Wert, bleibt aus Kompatibilitätsgründen bestehen. */
  proxyUrl: string;
  /** Schlüssel. Voreingestellt, kann in den Einstellungen ersetzt werden. */
  apiKey?: string;
  modell: string;
  aktiv: boolean;
  /** Zweites Modell prüft jede erzeugte Aufgabe gegen. */
  zweitpruefung: boolean;
  /** Modell für die Zweitprüfung – darf dasselbe sein, ist aber schwächer. */
  zweitModell?: string;
  /**
   * Wie oft nachgefasst wird, wenn Vorschläge durchfallen.
   *
   * 0 oder 1 = ein Anlauf. 2 = ein Nachfassen mit den Ablehnungsgründen.
   * Jeder weitere Anlauf kostet eine Anfrage beim Anbieter.
   */
  nachfassVersuche?: number;
}

export const STANDARD_EINSTELLUNGEN: AiEinstellungen = {
  proxyUrl: DIRECT_GROQ_URL,
  apiKey: EINGEBAUTER_SCHLUESSEL,
  modell: STANDARD_MODELL,
  aktiv: true,
  zweitpruefung: true,
  nachfassVersuche: 2,
};

export interface ChatAntwort {
  inhalt: string;
  modell: string;
}

export class KiNichtErreichbar extends Error {
  constructor(grund: string) {
    super(`KI nicht erreichbar: ${grund}`);
    this.name = 'KiNichtErreichbar';
  }
}

interface ChatAnfrage {
  system: string;
  nutzer: string;
  schema?: unknown;
  temperatur?: number;
}

/**
 * Ruft das Modell mit Schema-Zwang auf.
 * Der Rückgabetyp ist bewusst generisch gehalten: die konkrete Form wird
 * anschließend in `validation` geprüft, nicht hier.
 */
export async function frage(
  einstellungen: AiEinstellungen,
  anfrage: ChatAnfrage,
  signal?: AbortSignal,
): Promise<string> {
  if (!einstellungen.aktiv) {
    // Bewusst nicht "ausgeschaltet": Meistens ist die KI gar nicht erst
    // eingerichtet. Der Unterschied entscheidet, welchen Schritt man als
    // Nächstes gehen muss – einschalten oder eintragen.
    throw new KiNichtErreichbar('KI ist ausgeschaltet (Einstellungen).');
  }

  const body: Record<string, unknown> = {
    model: einstellungen.modell,
    messages: [
      { role: 'system', content: anfrage.system },
      { role: 'user', content: anfrage.nutzer },
    ],
    temperature: anfrage.temperatur ?? 0.3,
    // Festes Budget für die Antwort. Die GPT-OSS-Modelle sind Denkmodelle:
    // Sie verbrauchen einen Teil des Budgets für ihren Denkweg, bevor die
    // eigentliche JSON-Antwort entsteht. Ohne ausdrückliches Budget greift
    // die Voreinstellung des Anbieters – und die reicht bei einem so
    // ausführlichen Schema nicht: Der Aufruf endet mit „max completion
    // tokens reached", das Modell liefert gar nichts, und die ganze Runde
    // fällt aus. 4096 Token decken Denkweg plus Aufgabentext sicher ab.
    max_completion_tokens: 4096,
  };

  if (anfrage.schema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: 'aufgabe', strict: true, schema: anfrage.schema },
    };
  }

  const schlussel = einstellungen.apiKey?.trim() || EINGEBAUTER_SCHLUESSEL;
  if (!schlussel) {
    throw new KiNichtErreichbar(
      'Kein Groq-Schlüssel hinterlegt. In den Einstellungen einen Schlüssel eintragen (kostenlos auf console.groq.com).',
    );
  }
  const kopf: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${schlussel}`,
  };

  let antwort: Response;
  try {
    antwort = await fetch(einstellungen.proxyUrl, {
      method: 'POST',
      headers: kopf,
      body: JSON.stringify(body),
      signal,
    });
  } catch (fehler) {
    if (fehler instanceof DOMException && fehler.name === 'TimeoutError') {
      throw new KiNichtErreichbar('Zeitüberschreitung – das Modell hat nicht geantwortet.');
    }
    throw new KiNichtErreichbar(
      fehler instanceof Error ? fehler.message : 'Netzwerkfehler',
    );
  }

  // Ausweichmöglichkeit: Manche Modelle des Anbieters akzeptieren den
  // Strict-Schema-Zwang nicht und antworten mit 400. Statt endgültig
  // aufzugeben, wiederholt dieser Aufruf dieselbe Anfrage im einfachen
  // JSON-Modus. Der Anbieter verlangt dabei das Wort "json" in der
  // Nachricht – der Nutzerprompt bekommt es deshalb ausdrücklich ergänzt.
  // Das Ergebnis landet in derselben Prüfpipeline.
  if (antwort.status === 400 && anfrage.schema) {
    const detail = await antwort.text();
    if (/schema|response_format|json_schema|strict|json/i.test(detail)) {
      body.response_format = { type: 'json_object' };
      body.messages = [
        { role: 'system', content: anfrage.system },
        {
          role: 'user',
          content:
            anfrage.nutzer +
            '\n\nAntworte ausschließlich als JSON-Objekt gemäß dieser Felder: ' +
            JSON.stringify(anfrage.schema).slice(0, 4000),
        },
      ];
      antwort = await fetch(einstellungen.proxyUrl, {
        method: 'POST',
        headers: kopf,
        body: JSON.stringify(body),
        signal,
      });
    }
  }

  if (antwort.status === 429) {
    // Das Kontingent ist tokenweise begrenzt und lädt sich in Sekunden wieder
    // auf. Statt sofort aufzugeben, wartet der Client die vom Anbieter
    // genannte Zeit ab und versucht es erneut. Ohne das fällt eine an sich
    // gute Aufgabe nur wegen der Limite durch – und der Vorrat leert sich,
    // obwohl fachlich alles in Ordnung ist.
    for (let versuch = 0; versuch < 3; versuch += 1) {
      const wartesekunden = Number(antwort.headers.get('retry-after') ?? '0');
      const ausText = /try again in ([\d.]+)s/i.exec(await antwort.clone().text());
      const sekunden = wartesekunden || Number(ausText?.[1] ?? 0) || 5;
      // Nach oben begrenzt, damit ein Ausfall die Sitzung nicht minutenlang
      // blockiert. Die Wartezeit wächst mit jedem Versuch leicht an.
      const warte = Math.min(60_000, Math.ceil((sekunden + 1) * 1000 * (versuch + 1)));
      await new Promise((aufloesen) => setTimeout(aufloesen, warte));
      antwort = await fetch(einstellungen.proxyUrl, {
        method: 'POST',
        headers: kopf,
        body: JSON.stringify(body),
        signal,
      });
      if (antwort.status !== 429) break;
    }
    if (antwort.status === 429) {
      throw new KiNichtErreichbar(
        'Rate-Limit erreicht – das kostenlose Kontingent ist für den Moment aufgebraucht. In einer Minute erneut versuchen.',
      );
    }
  }
  if (antwort.status === 401 || antwort.status === 403) {
    throw new KiNichtErreichbar(
      `Zugang abgelehnt (${antwort.status}). Schlüssel prüfen – ggf. auf console.groq.com neu erzeugen.`,
    );
  }
  if (!antwort.ok) {
    const text = await antwort.text();
    throw new KiNichtErreichbar(
      `Anfrage fehlgeschlagen (${antwort.status}): ${text.slice(0, 200)}`,
    );
  }

  const daten = (await antwort.json()) as {
    choices?: { message?: { content?: string } }[];
    model?: string;
  };
  const inhalt = daten.choices?.[0]?.message?.content;
  if (!inhalt) throw new KiNichtErreichbar('Leere Antwort vom Modell.');
  return inhalt;
}

/** Fragt einen Aufgabenvorschlag an und übersetzt ihn in den Domänentyp. */
export async function frageAufgabenVorschlag(
  einstellungen: AiEinstellungen,
  system: string,
  nutzer: string,
  signal?: AbortSignal,
): Promise<TaskProposal[]> {
  const roh = await frage(
    einstellungen,
    { system, nutzer, schema: VORSCHLAG_SCHEMA, temperatur: 0.4 },
    signal,
  );

  let daten: unknown;
  try {
    daten = JSON.parse(roh);
  } catch {
    throw new KiNichtErreichbar('Antwort war kein gültiges JSON.');
  }

  // Drei Formen, die das Modell liefert: das erwartete Objekt mit dem
  // aufgaben-Feld, eine bloße Liste, oder ein einzelnes Aufgabenobjekt.
  // Alle drei werden akzeptiert – geformt wird anschließend sowieso durch
  // die Prüfpipeline, nicht hier.
  const rohListe = Array.isArray(daten)
    ? daten
    : typeof daten === 'object' && daten !== null && 'aufgaben' in daten
      ? (daten as { aufgaben: unknown[] }).aufgaben
      : [daten];
  const liste = rohListe as unknown[];
  if (!Array.isArray(liste) || liste.length === 0) {
    throw new KiNichtErreichbar('Leere Aufgabenliste.');
  }

  return liste.map((eintrag, index) => {
    const o = eintrag as Record<string, unknown>;
    return {
      proposalId: `ki_${Date.now().toString(36)}_${index}`,
      format: o.format as TaskProposal['format'],
      stufe: o.stufe as TaskProposal['stufe'],
      estimatedSeconds: o.stufe === 1 ? 25 : o.stufe === 2 ? 60 : 180,
      examArea: o.examArea as TaskProposal['examArea'],
      topicIds: (o.topicIds as string[]) ?? [],
      prompt: String(o.prompt ?? ''),
      options: (o.options as { id: string; text: string }[]) ?? undefined,
      factRefs: (o.factRefs as { factId: string; value?: number | string }[]) ?? [],
      learningGoal: String(o.learningGoal ?? ''),
      hint: o.hinweis ? String(o.hinweis) : undefined,
      // Das Rezept bleibt erhalten: Ohne es kann die Aufgabe nicht geprüft werden.
      berechnung: o.berechnung,
      origin: 'ki',
    };
  });
}
