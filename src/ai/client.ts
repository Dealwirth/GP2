import type { TaskProposal } from '../domain/types.ts';
import { VORSCHLAG_SCHEMA } from './schemas.ts';

/**
 * KI-Zugang.
 *
 * Zwei Wege, in dieser Reihenfolge empfohlen:
 *
 *  1. **Über den eigenen Cloudflare-Worker.** Der Schlüssel liegt beim Worker,
 *     nicht im Browser. Das ist der sichere Weg.
 *  2. **Direkt gegen Groq**, wenn ein Schlüssel im Browser hinterlegt wurde.
 *     Bequem für den Einstieg, aber der Schlüssel liegt dann im Browser –
 *     die Einstellungsseite sagt das ausdrücklich.
 *
 * In beiden Fällen gilt: Schlägt der Aufruf fehl, wirft diese Schicht einen
 * `KiNichtErreichbar`. Alles andere in der App funktioniert weiter, weil keine
 * Fachlogik von der KI abhängt.
 */

/** Direkter Endpunkt bei Groq – nur für Weg 2. */
export const DIRECT_GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const STANDARD_MODELLE: Record<string, string> = {
  Groq: 'openai/gpt-oss-120b',
  'Groq (schnell)': 'qwen/qwen3-32b',
  Cerebras: 'llama-3.3-70b',
  Gemini: 'gemini-2.0-flash',
};

export const STANDARD_MODELL: string = 'openai/gpt-oss-120b';

export interface AiEinstellungen {
  /** URL des eigenen Worker-Proxy. */
  proxyUrl: string;
  /**
   * Schlüssel für den Direktweg.
   *
   * Nur gesetzt, wenn bewusst direkt gegen Groq gegangen wird. Über den Worker
   * bleibt das Feld leer, weil der Worker den Schlüssel hält.
   */
  apiKey?: string;
  modell: string;
  aktiv: boolean;
  /** Zweites Modell prüft jede erzeugte Aufgabe gegen. */
  zweitpruefung: boolean;
  /** Modell für die Zweitprüfung – darf dasselbe sein, ist aber schwächer. */
  zweitModell?: string;
}

export const STANDARD_EINSTELLUNGEN: AiEinstellungen = {
  proxyUrl: 'https://egt-proxy.workers.dev/v1/chat',
  modell: STANDARD_MODELL,
  aktiv: false,
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
    throw new KiNichtErreichbar(
      'KI ist nicht eingerichtet – es fehlen Proxy-Adresse oder Schlüssel.',
    );
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

  const kopf: Record<string, string> = { 'Content-Type': 'application/json' };
  // Direktweg: Der Schlüssel geht mit. Über den Worker bleibt er hier leer.
  if (einstellungen.apiKey) kopf.Authorization = `Bearer ${einstellungen.apiKey}`;

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
      `Zugang abgelehnt (${antwort.status}). Schlüssel oder erlaubte Herkunft prüfen.`,
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
