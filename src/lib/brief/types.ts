import { z } from "zod";

export const DISCLAIMER = "Information générale, pas un conseil en investissement.";

// ─── Configuration (config/watchlist.json, config/feeds.json) ────────────────

export const providerIds = ["stooq", "twelvedata", "alphavantage", "finnhub"] as const;
export type ProviderId = (typeof providerIds)[number];

export const sourceSchema = z.object({
  provider: z.enum(providerIds),
  symbol: z.string().min(1),
  /** Code MIC de la place (Twelve Data), ex. XPAR pour Euronext Paris. */
  mic: z.string().optional(),
});
export type Source = z.infer<typeof sourceSchema>;

export const assetConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  symbol: z.string().min(1),
  kind: z.enum(["index", "etf", "stock"]),
  /** "EUR", "USD"… ou "pts" pour un indice. */
  currency: z.string().min(1),
  note: z.string().optional(),
  sources: z.array(sourceSchema).min(1),
});
export type AssetConfig = z.infer<typeof assetConfigSchema>;

export const watchlistSchema = z.object({
  markets: z.array(assetConfigSchema),
  positions: z.array(assetConfigSchema),
  /** Tickers US dont on signale les publications de résultats → nom affiché. */
  earnings: z.record(z.string(), z.string()).default({}),
});
export type Watchlist = z.infer<typeof watchlistSchema>;

export const feedsSchema = z.object({
  maxAgeHours: z.number().positive().default(36),
  feeds: z.array(
    z.object({ name: z.string().min(1), url: z.url(), category: z.string().default("marchés") }),
  ),
});
export type FeedsConfig = z.infer<typeof feedsSchema>;

// ─── Brief ───────────────────────────────────────────────────────────────────

export const assetSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  kind: z.enum(["index", "etf", "stock"]),
  currency: z.string(),
  status: z.enum(["ok", "unavailable"]),
  /** Dernier cours de clôture connu. */
  price: z.number().nullable(),
  /** Variation de la dernière séance, en %. */
  changePct: z.number().nullable(),
  /** Variation sur 5 séances, en %. */
  change5dPct: z.number().nullable(),
  /** Dernières clôtures, de la plus ancienne à la plus récente (sparkline). */
  closes: z.array(z.number()),
  /** Date de la dernière clôture (AAAA-MM-JJ). */
  asOf: z.string().nullable(),
  provider: z.string().nullable(),
  note: z.string().optional(),
});
export type AssetSnapshot = z.infer<typeof assetSnapshotSchema>;

export const newsItemSchema = z.object({
  /** Résumé en une phrase. */
  summary: z.string(),
  /** Titre d'origine de l'article. */
  title: z.string(),
  source: z.string(),
  url: z.string(),
  category: z.string(),
  publishedAt: z.string().nullable(),
});
export type NewsItem = z.infer<typeof newsItemSchema>;

export const watchKinds = ["earnings", "central_bank", "macro", "other"] as const;
export const watchItemSchema = z.object({
  label: z.string(),
  kind: z.enum(watchKinds),
});
export type WatchItem = z.infer<typeof watchItemSchema>;

export const briefSchema = z.object({
  version: z.literal(1),
  /** Jour du brief, heure de Paris (AAAA-MM-JJ). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  generatedAt: z.string(),
  /** Vrai pour le brief d'exemple (chiffres fictifs). */
  sample: z.boolean().optional(),
  summary: z.array(z.string()).max(5),
  markets: z.array(assetSnapshotSchema),
  positions: z.array(assetSnapshotSchema),
  news: z.array(newsItemSchema),
  watch: z.array(watchItemSchema),
  disclaimer: z.string(),
  meta: z.object({
    /** Fournisseur IA qui a rédigé le brief, ou null en mode dégradé. */
    ai: z.object({ provider: z.string(), model: z.string() }).nullable(),
    /** Ce qui a manqué pendant la génération (sources tombées, IA indisponible…). */
    degraded: z.array(z.string()),
  }),
});
export type Brief = z.infer<typeof briefSchema>;

// ─── Données intermédiaires ──────────────────────────────────────────────────

export interface NewsCandidate {
  id: string;
  title: string;
  snippet: string;
  source: string;
  url: string;
  category: string;
  publishedAt: string | null;
}

export interface EarningsEvent {
  symbol: string;
  name: string;
  /** "bmo" = avant l'ouverture US, "amc" = après la clôture US. */
  hour: string | null;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Tout ce dont la génération a besoin du monde extérieur : injectable dans les tests. */
export interface Context {
  fetch: FetchLike;
  env: Record<string, string | undefined>;
  now: Date;
  /** Attente entre deux tentatives ou deux requêtes ; neutralisée dans les tests. */
  sleep: (ms: number) => Promise<void>;
  log: (message: string) => void;
}
