import type { Context } from "./types";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Délai demandé par le serveur avant de réessayer, en ms. */
    public readonly retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Une limite de débit ou une panne passagère : réessayer (ou changer de source) a du sens. */
export function isTransient(error: unknown): boolean {
  if (error instanceof HttpError) return error.status === 429 || error.status === 408 || error.status >= 500;
  // Tout le reste est une erreur réseau, une coupure ou un délai dépassé.
  return true;
}

interface RequestOptions {
  init?: RequestInit;
  timeoutMs?: number;
  /** Nombre de nouvelles tentatives après un échec passager. */
  retries?: number;
}

const MAX_RETRY_WAIT_MS = 20_000;

/** Requête HTTP avec délai maximal et nouvelles tentatives espacées (1 s, 2 s, 4 s…). */
export async function request(ctx: Context, url: string, options: RequestOptions = {}): Promise<Response> {
  const { init, timeoutMs = 12_000, retries = 2 } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await ctx.fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return res;
      const retryAfter = Number(res.headers.get("retry-after"));
      const body = (await res.text().catch(() => "")).slice(0, 200);
      throw new HttpError(
        res.status,
        `HTTP ${res.status} ${body}`.trim(),
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null,
      );
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isTransient(error)) break;
      const wanted = error instanceof HttpError && error.retryAfterMs ? error.retryAfterMs : 1000 * 2 ** attempt;
      await ctx.sleep(Math.min(wanted, MAX_RETRY_WAIT_MS));
    }
  }
  throw lastError;
}

/**
 * Espace les appels à un même fournisseur pour respecter sa limite de débit
 * (ex. 8 requêtes par minute chez Twelve Data).
 */
export function createThrottle(ctx: Context, minIntervalMs: Record<string, number>) {
  const last = new Map<string, number>();
  const queues = new Map<string, Promise<void>>();
  return async function throttle(key: string): Promise<void> {
    const interval = minIntervalMs[key] ?? 0;
    const turn = (queues.get(key) ?? Promise.resolve()).then(async () => {
      const wait = (last.get(key) ?? -Infinity) + interval - Date.now();
      if (wait > 0) await ctx.sleep(wait);
      last.set(key, Date.now());
    });
    queues.set(key, turn);
    return turn;
  };
}

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));
