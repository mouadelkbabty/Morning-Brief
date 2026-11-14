import { aiOutputSchema, aiProviders, generateWithFallback, type AiOutput } from "./ai";
import { earningsLabel, fetchEarnings } from "./calendar";
import { fmtDateLong, fmtPct } from "./format";
import { fetchSnapshots } from "./market";
import { fetchNews } from "./news";
import { parisTime } from "./time";
import {
  DISCLAIMER,
  type AssetSnapshot,
  type Brief,
  type Context,
  type EarningsEvent,
  type FeedsConfig,
  type NewsCandidate,
  type NewsItem,
  type WatchItem,
  type Watchlist,
} from "./types";

const MAX_SUMMARY = 5;
const MAX_NEWS = 5;
const MIN_NEWS = 3;
const MAX_WATCH = 5;

export interface GenerateInput {
  watchlist: Watchlist;
  feeds: FeedsConfig;
  systemPrompt: string;
}

const compact = (a: AssetSnapshot) => ({
  nom: a.name,
  variation_veille_pct: a.changePct,
  variation_5_jours_pct: a.change5dPct,
  ...(a.status === "unavailable" ? { indisponible: true } : {}),
});

/** Données transmises à l'IA : uniquement des faits déjà vérifiés par le code. */
export function buildUserPrompt(
  date: string,
  markets: AssetSnapshot[],
  positions: AssetSnapshot[],
  candidates: NewsCandidate[],
  earnings: EarningsEvent[],
): string {
  return JSON.stringify(
    {
      date,
      jour: fmtDateLong(date),
      marches: markets.map(compact),
      positions: positions.map(compact),
      resultats_du_jour: earnings.map(earningsLabel),
      actualites: candidates.map((c) => ({ id: c.id, source: c.source, rubrique: c.category, titre: c.title, extrait: c.snippet })),
    },
    null,
    1,
  );
}

const toNewsItem = (c: NewsCandidate, summary: string): NewsItem => ({
  summary,
  title: c.title,
  source: c.source,
  url: c.url,
  category: c.category,
  publishedAt: c.publishedAt,
});

/**
 * Contrôle la réponse de l'IA par rapport aux données réelles. Une actualité
 * dont l'identifiant n'existe pas est écartée : la source et le lien viennent
 * toujours du flux, jamais du modèle. Lève une erreur si le résultat est
 * inutilisable, ce qui déclenche la bascule vers le fournisseur suivant.
 */
export function validateAiOutput(raw: unknown, candidates: NewsCandidate[]): AiOutput {
  const parsed = aiOutputSchema.parse(raw);
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const news = parsed.news.filter((n) => byId.has(n.id) && !seen.has(n.id) && seen.add(n.id)).slice(0, MAX_NEWS);
  const expected = Math.min(MIN_NEWS, candidates.length);
  if (news.length < expected) throw new Error(`seulement ${news.length} actualité(s) valide(s) sur ${expected} attendues`);
  return { summary: parsed.summary.slice(0, MAX_SUMMARY), news, watch: parsed.watch.slice(0, MAX_WATCH) };
}

/** Résumé sans IA : les faits bruts, dans l'ordre de la watchlist. */
export function fallbackSummary(markets: AssetSnapshot[], positions: AssetSnapshot[]): string[] {
  const line = (a: AssetSnapshot) =>
    `${a.name} : ${fmtPct(a.changePct)} à la dernière séance` + (a.change5dPct != null ? ` (${fmtPct(a.change5dPct)} sur 5 jours)` : "");
  const lines = markets.filter((a) => a.changePct != null).slice(0, 3).map(line);
  const movers = positions.filter((a) => a.changePct != null).sort((a, b) => Math.abs(b.changePct!) - Math.abs(a.changePct!));
  if (movers[0]) lines.push(`Plus forte variation de vos positions : ${movers[0].name} (${fmtPct(movers[0].changePct)}).`);
  if (!lines.length) lines.push("Les données de marché sont indisponibles ce matin.");
  return lines.slice(0, MAX_SUMMARY);
}

/** Ajoute les résultats du jour que l'IA aurait oubliés (ou tous, sans IA). */
function mergeWatch(fromAi: WatchItem[], earnings: EarningsEvent[]): WatchItem[] {
  const missing = earnings
    .filter((e) => !fromAi.some((w) => w.label.toLowerCase().includes(e.name.toLowerCase())))
    .map((e): WatchItem => ({ label: earningsLabel(e), kind: "earnings" }));
  return [...missing, ...fromAi].slice(0, MAX_WATCH);
}

/**
 * Génère le brief du jour. Ne lève pas d'erreur pour une source en panne :
 * chaque manque est noté dans `meta.degraded` et le brief reste publiable.
 */
export async function generateBrief(ctx: Context, input: GenerateInput): Promise<Brief> {
  const { watchlist, feeds, systemPrompt } = input;
  const date = parisTime(ctx.now).date;
  const degraded: string[] = [];

  const [snapshots, news, earnings] = await Promise.all([
    fetchSnapshots(ctx, [...watchlist.markets, ...watchlist.positions]),
    fetchNews(ctx, feeds),
    fetchEarnings(ctx, watchlist.earnings),
  ]);
  const markets = snapshots.slice(0, watchlist.markets.length);
  const positions = snapshots.slice(watchlist.markets.length);

  for (const a of snapshots) if (a.status === "unavailable") degraded.push(`Cours indisponible : ${a.name}`);
  for (const feed of news.failedFeeds) degraded.push(`Flux d'actualités indisponible : ${feed}`);
  if (!earnings.available) degraded.push("Calendrier des résultats indisponible");

  const providers = aiProviders(ctx.env);
  const ai = providers.length
    ? await generateWithFallback(
        ctx,
        providers,
        systemPrompt,
        buildUserPrompt(date, markets, positions, news.candidates, earnings.events),
        (raw) => validateAiOutput(raw, news.candidates),
      )
    : null;

  let summary: string[];
  let items: NewsItem[];
  let watch: WatchItem[];
  if (ai) {
    const byId = new Map(news.candidates.map((c) => [c.id, c]));
    summary = ai.output.summary;
    items = ai.output.news.map((n) => toNewsItem(byId.get(n.id)!, n.summary));
    watch = mergeWatch(ai.output.watch, earnings.events);
  } else {
    degraded.push(providers.length ? "IA indisponible : résumé automatique" : "Aucune clé IA : résumé automatique");
    summary = fallbackSummary(markets, positions);
    items = news.candidates.slice(0, 4).map((c) => toNewsItem(c, c.title));
    watch = mergeWatch([], earnings.events);
  }

  return {
    version: 1,
    date,
    generatedAt: ctx.now.toISOString(),
    summary,
    markets,
    positions,
    news: items,
    watch,
    disclaimer: DISCLAIMER,
    meta: { ai: ai ? { provider: ai.provider, model: ai.model } : null, degraded },
  };
}
