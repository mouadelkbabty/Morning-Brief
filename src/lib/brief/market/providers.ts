import { request } from "../http";
import { shiftDate, parisTime } from "../time";
import type { Context, ProviderId, Source } from "../types";

/** Une clôture quotidienne. */
export interface Close {
  date: string;
  close: number;
}

export class MissingKeyError extends Error {}

type Provider = (ctx: Context, source: Source) => Promise<Close[]>;

function key(ctx: Context, name: string): string {
  const value = ctx.env[name];
  if (!value) throw new MissingKeyError(`${name} non renseignée`);
  return value;
}

/** Trie par date croissante et écarte les lignes inexploitables. */
function clean(rows: Array<{ date: string; close: number }>): Close[] {
  const valid = rows.filter((r) => /^\d{4}-\d{2}-\d{2}/.test(r.date) && Number.isFinite(r.close) && r.close > 0);
  if (!valid.length) throw new Error("aucune clôture exploitable");
  return valid
    .map((r) => ({ date: r.date.slice(0, 10), close: r.close }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Stooq : CSV public, sans clé. Date,Open,High,Low,Close,Volume
const stooq: Provider = async (ctx, source) => {
  const today = parisTime(ctx.now).date;
  const compact = (d: string) => d.replaceAll("-", "");
  const url =
    `https://stooq.com/q/d/l/?s=${encodeURIComponent(source.symbol)}&i=d` +
    `&d1=${compact(shiftDate(today, -30))}&d2=${compact(today)}`;
  const text = await (await request(ctx, url)).text();
  const [header, ...lines] = text.trim().split(/\r?\n/);
  if (!header?.toLowerCase().startsWith("date,")) throw new Error(`réponse inattendue : ${text.slice(0, 60)}`);
  const closeIndex = header.toLowerCase().split(",").indexOf("close");
  return clean(lines.map((line) => line.split(",")).map((c) => ({ date: c[0], close: Number(c[closeIndex]) })));
};

// Twelve Data : 8 requêtes / minute et 800 / jour en offre gratuite.
const twelvedata: Provider = async (ctx, source) => {
  const params = new URLSearchParams({
    symbol: source.symbol,
    interval: "1day",
    outputsize: "10",
    apikey: key(ctx, "TWELVEDATA_API_KEY"),
  });
  if (source.mic) params.set("mic_code", source.mic);
  const data = await (await request(ctx, `https://api.twelvedata.com/time_series?${params}`)).json();
  // Les erreurs (limite atteinte, symbole hors offre) arrivent en HTTP 200.
  if (data.status === "error" || !Array.isArray(data.values)) {
    throw new Error(`Twelve Data : ${data.message ?? "réponse sans valeurs"}`);
  }
  return clean(data.values.map((v: { datetime: string; close: string }) => ({ date: v.datetime, close: Number(v.close) })));
};

// Alpha Vantage : 25 requêtes / jour en offre gratuite.
const alphavantage: Provider = async (ctx, source) => {
  const params = new URLSearchParams({
    function: "TIME_SERIES_DAILY",
    symbol: source.symbol,
    apikey: key(ctx, "ALPHAVANTAGE_API_KEY"),
  });
  const data = await (await request(ctx, `https://www.alphavantage.co/query?${params}`)).json();
  const series = data["Time Series (Daily)"];
  if (!series) throw new Error(`Alpha Vantage : ${data.Note ?? data.Information ?? data["Error Message"] ?? "réponse sans série"}`);
  return clean(
    Object.entries(series as Record<string, Record<string, string>>).map(([date, v]) => ({ date, close: Number(v["4. close"]) })),
  );
};

// Finnhub (offre gratuite) : cours du jour seulement, sans historique. Dernier
// recours pour les actions US : variation de séance, mais pas de tendance 5 jours.
const finnhub: Provider = async (ctx, source) => {
  const params = new URLSearchParams({ symbol: source.symbol, token: key(ctx, "FINNHUB_API_KEY") });
  const q = await (await request(ctx, `https://finnhub.io/api/v1/quote?${params}`)).json();
  if (!q?.c || !q?.pc || !q?.t) throw new Error("Finnhub : cotation vide");
  const date = new Date(q.t * 1000).toISOString().slice(0, 10);
  return clean([
    { date: shiftDate(date, -1), close: Number(q.pc) },
    { date, close: Number(q.c) },
  ]);
};

export const PROVIDERS: Record<ProviderId, Provider> = { stooq, twelvedata, alphavantage, finnhub };

/** Écart minimal entre deux appels à un même fournisseur, en ms. */
export const MIN_INTERVAL_MS: Record<ProviderId, number> = {
  stooq: 400,
  twelvedata: 8_000,
  alphavantage: 1_500,
  finnhub: 1_100,
};
