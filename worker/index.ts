/**
 * Cloudflare Worker – KI-Proxy und Aufbewahrung des Lernstands.
 *
 * Zwei Aufgaben, bewusst in einem Worker, weil das eine Kontingent und eine
 * Adresse genügt:
 *
 *  1. **`POST /v1/chat`** – Durchreichstelle zur KI. Zweck: Der Groq-Schlüssel
 *     darf nicht im Browser liegen. Der Worker ergänzt ihn und gibt nichts
 *     weiter zurück als die Antwort des Modells.
 *
 *  2. **`GET|PUT|DELETE /v1/sync/<kennung>`** – Aufbewahrung des Lernstands.
 *     Der Worker sieht dabei **nur Chiffretext**: Verschlüsselt wird auf dem
 *     Gerät mit einem Passwort, das hierher nie übertragen wird. Es gibt keine
 *     Konten, keine Namen, keine E-Mail-Adressen – nur ein Fach mit einem
 *     zufälligen Namen, dessen Inhalt hier niemand lesen kann. Auch der
 *     Betreiber dieses Workers nicht.
 *
 * Was der Worker weiterhin NICHT tut: Er erzeugt keine Aufgaben, kennt keine
 * Lösungen, führt kein Protokoll über Anfragen und verknüpft nichts mit einer
 * Person. Er ist eine Durchreiche und ein Schließfach.
 *
 * Einrichtung (kostenlos, ohne Kreditkarte):
 *   1. Konto auf dash.cloudflare.com anlegen
 *   2. Workers & Pages → Create → Worker, diesen Code veröffentlichen
 *   3. KV-Namespace anlegen und als `EGT_SYNC` binden (siehe wrangler.toml)
 *   4. Settings → Variables and Secrets → GROQ_API_KEY als Secret setzen
 *   5. ERLAUBTE_HERKUNFT auf die eigene Seitenadresse setzen
 */

export interface Env {
  GROQ_API_KEY: string;
  ERLAUBTE_HERKUNFT?: string;
  /** Fächer für die verschlüsselten Lernstände. Ohne Binding bleibt Sync aus. */
  EGT_SYNC?: KVNamespace;
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELL = 'openai/gpt-oss-120b';

/**
 * Obergrenze für einen Lernstand.
 *
 * Zwei Megabyte sind etwa zehntausend Versuche – mehr als ein Ausbildungsjahr.
 * Die Grenze existiert nicht, um zu sparen, sondern damit ein Fehler im Client
 * nicht unbemerkt ein Vielfaches hochlädt.
 */
const MAX_SYNC_BYTES = 2 * 1024 * 1024;

/** Kennungen sind zufällige Hex-Zeichenketten. Alles andere wird abgewiesen. */
const KENNUNG_MUSTER = /^[a-f0-9]{16,64}$/;

// ---------------------------------------------------------------------------
// Ratenbegrenzung
// ---------------------------------------------------------------------------

/**
 * Einfaches Rate-Limit pro IP (In-Memory, pro Instanz – ausreichend für eine
 * Person). Getrennte Zähler für Chat und Sync: Ein Abgleich ist kein
 * Modellaufruf, und wer viel synchronisiert, soll nicht seine KI-Anfragen
 * verbrauchen.
 */
const fenster = new Map<string, number[]>();

const GRENZEN = {
  chat: { minute: 20, tag: 1000 },
  sync: { minute: 120, tag: 5000 },
} as const;

function erlauben(art: keyof typeof GRENZEN, ip: string): { ok: boolean; grund?: string } {
  const jetzt = Date.now();
  const grenze = GRENZEN[art];
  const schluessel = `${art}:${ip}`;
  const tag = Math.floor(jetzt / 86_400_000);

  const proTag = fenster.get(`${schluessel}:${tag}`) ?? [];
  if (proTag.length >= grenze.tag) return { ok: false, grund: 'Tageslimit erreicht' };

  const frisch = (fenster.get(schluessel) ?? []).filter((t) => jetzt - t < 60_000);
  if (frisch.length >= grenze.minute) {
    return { ok: false, grund: 'Zu viele Anfragen, bitte einen Moment warten' };
  }

  frisch.push(jetzt);
  fenster.set(schluessel, frisch);
  fenster.set(`${schluessel}:${tag}`, [...proTag, jetzt]);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Antworten
// ---------------------------------------------------------------------------

function corsKopf(erlaubt: boolean): Headers {
  return new Headers({
    'Access-Control-Allow-Origin': erlaubt ? '*' : 'null',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, POST, OPTIONS',
    'Cache-Control': 'no-store',
  });
}

function antwort(
  kopf: Headers,
  koerper: string,
  status: number,
  typ = 'text/plain; charset=utf-8',
): Response {
  const k = new Headers(kopf);
  k.set('Content-Type', typ);
  return new Response(koerper, { status, headers: k });
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

function behandleSync(
  index: string,
  method: string,
  request: Request,
  env: Env,
  kopf: Headers,
): Response | Promise<Response> {
  if (!env.EGT_SYNC) {
    return antwort(
      kopf,
      'Die Synchronisation ist in diesem Worker nicht eingerichtet: Der KV-Speicher EGT_SYNC fehlt.',
      501,
    );
  }
  if (!KENNUNG_MUSTER.test(index)) {
    return antwort(kopf, 'Ungültige Kennung', 400);
  }

  const speicher = env.EGT_SYNC;

  if (method === 'GET') {
    return speicher.get(index).then((wert) =>
      wert === null ? antwort(kopf, '', 404) : antwort(kopf, wert, 200, 'application/json'),
    );
  }

  if (method === 'PUT') {
    return request.text().then(async (koerper) => {
      if (koerper.length === 0) return antwort(kopf, 'Leerer Inhalt', 400);
      if (koerper.length > MAX_SYNC_BYTES) {
        return antwort(kopf, 'Lernstand zu groß', 413);
      }
      // Grobprüfung der Form. Der Inhalt bleibt undurchsichtig – mehr zu
      // prüfen wäre unmöglich, ohne den Schlüssel zu haben, und genau das ist
      // die Absicht.
      try {
        JSON.parse(koerper);
      } catch {
        return antwort(kopf, 'Kein gültiges JSON', 400);
      }
      await speicher.put(index, koerper, { expirationTtl: 60 * 60 * 24 * 365 * 5 });
      return antwort(kopf, '{"ok":true}', 200, 'application/json');
    });
  }

  if (method === 'DELETE') {
    return speicher.delete(index).then(() => antwort(kopf, '{"ok":true}', 200, 'application/json'));
  }

  return antwort(kopf, 'Methode nicht erlaubt', 405);
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Erlaubte Herkunft prüfen. Ohne Konfiguration wird nicht blockiert,
    // damit die lokale Entwicklung funktioniert.
    const herkunft = request.headers.get('Origin') ?? '';
    const erlaubteHerkunft = env.ERLAUBTE_HERKUNFT ?? '';
    const herkunftOk =
      erlaubteHerkunft === '' || herkunft === '' || herkunft.endsWith(erlaubteHerkunft);
    const kopf = corsKopf(herkunftOk);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: kopf });
    }
    if (!herkunftOk) {
      return antwort(kopf, 'Herkunft nicht erlaubt', 403);
    }

    const ip = request.headers.get('CF-Connecting-IP') ?? 'unbekannt';

    // ------------------------------------------------------------------ Sync
    if (url.pathname.startsWith('/v1/sync/')) {
      const index = decodeURIComponent(url.pathname.slice('/v1/sync/'.length));
      const limit = erlauben('sync', ip);
      if (!limit.ok) {
        return antwort(kopf, JSON.stringify({ error: limit.grund }), 429, 'application/json');
      }
      return behandleSync(index, request.method, request, env, kopf);
    }

    // ------------------------------------------------------------------ Chat
    if (url.pathname !== '/v1/chat') {
      return antwort(kopf, 'Nicht gefunden', 404);
    }
    if (request.method !== 'POST') {
      return antwort(kopf, 'Nur POST', 405);
    }
    if (!env.GROQ_API_KEY) {
      return antwort(kopf, 'GROQ_API_KEY ist nicht gesetzt', 500);
    }

    const limit = erlauben('chat', ip);
    if (!limit.ok) {
      return antwort(kopf, JSON.stringify({ error: limit.grund }), 429, 'application/json');
    }

    let nutzlast: unknown;
    try {
      nutzlast = await request.json();
    } catch {
      return antwort(kopf, 'Ungültiges JSON', 400);
    }

    // Nur bestimmte Felder werden durchgereicht.
    const koerper = nutzlast as { messages?: unknown; response_format?: unknown };
    if (!Array.isArray(koerper.messages) || koerper.messages.length === 0) {
      return antwort(kopf, 'messages fehlt', 400);
    }

    const anfrage: Record<string, unknown> = {
      model: koerper.model ?? MODELL,
      messages: koerper.messages,
      temperature: koerper.temperature ?? 0.3,
    };
    if (koerper.response_format) anfrage.response_format = koerper.response_format;

    try {
      const groqAntwort = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(anfrage),
      });

      const text = await groqAntwort.text();
      return antwort(kopf, text, groqAntwort.status, 'application/json');
    } catch (fehler) {
      return antwort(
        kopf,
        JSON.stringify({
          error: 'Upstream nicht erreichbar',
          detail: fehler instanceof Error ? fehler.message : 'unbekannt',
        }),
        502,
        'application/json',
      );
    }
  },
};
