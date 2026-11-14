import { cacheLife } from "next/cache";
import { listBriefDates, loadWatchlist, readBrief, readSampleBrief } from "@/lib/brief/store";
import type { Brief } from "@/lib/brief/types";

// Les briefs sont des fichiers du dépôt : ils ne changent qu'à chaque
// déploiement (le commit d'un nouveau brief redéploie l'app). On peut donc
// tout mettre en cache sans limite de durée et prérendre les pages.

/** Dernier brief publié, ou le brief d'exemple tant qu'il n'y en a aucun. */
export async function getLatestBrief(): Promise<Brief> {
  "use cache";
  cacheLife("max");
  const [latest] = listBriefDates();
  return (latest && readBrief(latest)) || readSampleBrief();
}

export async function getBrief(date: string): Promise<Brief | null> {
  "use cache";
  cacheLife("max");
  const sample = readSampleBrief();
  return readBrief(date) ?? (listBriefDates().length === 0 && sample.date === date ? sample : null);
}

export interface HistoryEntry {
  date: string;
  headline: string;
  sample: boolean;
  movers: Array<{ name: string; changePct: number | null }>;
}

const toEntry = (brief: Brief): HistoryEntry => ({
  date: brief.date,
  headline: brief.summary[0] ?? "",
  sample: Boolean(brief.sample),
  movers: brief.markets.slice(0, 3).map((a) => ({ name: a.name, changePct: a.changePct })),
});

/** Historique, du plus récent au plus ancien. */
export async function getHistory(): Promise<HistoryEntry[]> {
  "use cache";
  cacheLife("max");
  const briefs = listBriefDates().map(readBrief).filter((b): b is Brief => b !== null);
  return (briefs.length ? briefs : [readSampleBrief()]).map(toEntry);
}

export async function getBriefDates(): Promise<string[]> {
  "use cache";
  cacheLife("max");
  const dates = listBriefDates();
  return dates.length ? dates : [readSampleBrief().date];
}

export async function getWatchlist() {
  "use cache";
  cacheLife("max");
  return loadWatchlist();
}
