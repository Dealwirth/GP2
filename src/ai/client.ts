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

export const STANDARD_MODELLE: Record<string, string> = {
  'Groq: GPT-OSS 120b (Standard)': 'openai/gpt-oss-120b',
  'Groq: GPT-OSS 20b (schnell)': 'openai/gpt-oss-20b',
  'Groq: Qwen 3.8 27b (Ausweich)': 'qwen/qwen3.8-27b',
};

export const STANDARD_MODELL: string = 'openai/gpt-oss-120b';

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
}

export const STANDARD_EINSTELLUNGEN: AiEinstellungen = {
  proxyUrl: DIRECT_GROQ_URL,
  apiKey: EINGEBAUTER_SCHLUESSEL,
  modell: STANDARD_MODELL,
  aktiv: true,
  zweitpruefung: true,
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
  // JSON-Modus – das Ergebnis landet dann in derselben Prüfpipeline.
  if (antwort.status === 400 && anfrage.schema) {
    const detail = await antwort.text();
    if (/schema|response_format|json_schema|strict/i.test(detail)) {
      delete body.response_format;
      body.response_format = { type: 'json_object' };
      antwort = await fetch(einstellungen.proxyUrl, {
        method: 'POST',
        headers: kopf,
        body: JSON.stringify(body),
        signal,
      });
    }
  }

  if (antwort.status === 429) {
    // Das Kontingent ist der häufigste Grund, warum es nicht läuft. Die Meldung
    // muss sagen, was zu tun ist – nicht nur, dass etwas nicht geht.
    const rest = antwort.headers.get('retry-after');
    const wartehinweis = rest ? ` In ${rest} Sekunden erneut versuchen.` : '';
    throw new KiNichtErreichbar(
      `Rate-Limit erreicht – das kostenlose Kontingent ist für den Moment aufgebraucht.${wartehinweis}`,
    );
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

  // Das Modell kann ein einzelnes Objekt oder eine Liste liefern.
  const liste = Array.isArray(daten) ? daten : [daten];
  if (liste.length === 0) throw new KiNichtErreichbar('Leere Aufgabenliste.');

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
