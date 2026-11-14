import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { briefSchema, feedsSchema, watchlistSchema, type Brief, type FeedsConfig, type Watchlist } from "./types";

// Les briefs sont de simples fichiers JSON versionnés dans le dépôt :
// data/briefs/AAAA-MM-JJ.json. Le workflow les commite, et ce commit
// redéploie la web app, qui les lit au moment du build.
const root = () => process.cwd();
const briefsDir = () => path.join(root(), "data", "briefs");
const briefPath = (date: string) => path.join(briefsDir(), `${date}.json`);

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));

export const loadWatchlist = (): Watchlist => watchlistSchema.parse(readJson(path.join(root(), "config", "watchlist.json")));
export const loadFeeds = (): FeedsConfig => feedsSchema.parse(readJson(path.join(root(), "config", "feeds.json")));
export const loadPrompt = (name: string): string => readFileSync(path.join(root(), "prompts", name), "utf8");

/** Dates des briefs enregistrés, de la plus récente à la plus ancienne. */
export function listBriefDates(): string[] {
  if (!existsSync(briefsDir())) return [];
  return readdirSync(briefsDir())
    .map((file) => file.match(/^(\d{4}-\d{2}-\d{2})\.json$/)?.[1])
    .filter((date): date is string => Boolean(date))
    .sort()
    .reverse();
}

export const briefExists = (date: string) => existsSync(briefPath(date));

export function readBrief(date: string): Brief | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !briefExists(date)) return null;
  return briefSchema.parse(readJson(briefPath(date)));
}

export function readLatestBrief(): Brief | null {
  const [latest] = listBriefDates();
  return latest ? readBrief(latest) : null;
}

/** Brief d'exemple (chiffres fictifs), affiché tant qu'aucun vrai brief n'existe. */
export const readSampleBrief = (): Brief => briefSchema.parse(readJson(path.join(root(), "data", "sample", "brief.json")));

export function writeBrief(brief: Brief): string {
  mkdirSync(briefsDir(), { recursive: true });
  const file = briefPath(brief.date);
  writeFileSync(file, `${JSON.stringify(briefSchema.parse(brief), null, 2)}\n`);
  return file;
}
