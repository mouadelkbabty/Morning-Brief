import { XMLParser } from "fast-xml-parser";
import { errorMessage, request } from "./http";
import { parisTime } from "./time";
import type { Context, FeedsConfig, NewsCandidate } from "./types";

const MAX_PER_FEED = 8;
const MAX_TOTAL = 40;

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });

const asArray = <T,>(value: T | T[] | undefined): T[] => (value == null ? [] : Array.isArray(value) ? value : [value]);

/** Texte d'un nœud XML, qu'il soit une chaîne, un CDATA ou un objet { #text }. */
function text(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "object") return text((node as Record<string, unknown>)["#text"]);
  return String(node);
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function plain(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, name) => ENTITIES[name] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** Lien d'une entrée Atom : <link href="…" rel="alternate"/>, parfois plusieurs. */
function atomLink(link: unknown): string {
  const links = asArray(link) as Array<string | Record<string, string>>;
  const best = links.find((l) => typeof l === "object" && (l["@_rel"] ?? "alternate") === "alternate") ?? links[0];
  return typeof best === "object" ? (best["@_href"] ?? "") : text(best);
}

interface RawItem {
  title: string;
  url: string;
  snippet: string;
  publishedAt: string | null;
}

/** Lit un flux RSS 2.0 ou Atom. */
export function parseFeed(xml: string): RawItem[] {
  const doc = parser.parse(xml);
  const rss = asArray(doc?.rss?.channel?.item ?? doc?.["rdf:RDF"]?.item).map((item) => ({
    title: plain(text(item.title)),
    url: text(item.link).trim(),
    snippet: plain(text(item.description)),
    date: text(item.pubDate ?? item["dc:date"]),
  }));
  const atom = asArray(doc?.feed?.entry).map((entry) => ({
    title: plain(text(entry.title)),
    url: atomLink(entry.link),
    snippet: plain(text(entry.summary ?? entry.content)),
    date: text(entry.updated ?? entry.published),
  }));
  return [...rss, ...atom]
    .filter((item) => item.title && /^https?:\/\//.test(item.url))
    .map(({ date, ...item }) => {
      const time = Date.parse(date);
      return {
        ...item,
        snippet: item.snippet.slice(0, 240),
        publishedAt: Number.isNaN(time) ? null : new Date(time).toISOString(),
      };
    });
}

const normalize = (title: string) => title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export interface NewsResult {
  candidates: NewsCandidate[];
  failedFeeds: string[];
}

/**
 * Rassemble les actualités récentes de tous les flux. Un flux en panne est
 * simplement ignoré (et signalé) : les autres suffisent.
 */
export async function fetchNews(ctx: Context, config: FeedsConfig): Promise<NewsResult> {
  // Le lundi, on remonte jusqu'au vendredi.
  const isMonday = parisTime(ctx.now).weekday === 1;
  const maxAgeMs = (config.maxAgeHours + (isMonday ? 48 : 0)) * 3_600_000;
  const failedFeeds: string[] = [];

  const perFeed = await Promise.all(
    config.feeds.map(async (feed) => {
      try {
        const res = await request(ctx, feed.url, {
          retries: 1,
          timeoutMs: 8_000,
          init: { headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" } },
        });
        return parseFeed(await res.text())
          .filter((item) => !item.publishedAt || ctx.now.getTime() - Date.parse(item.publishedAt) <= maxAgeMs)
          .slice(0, MAX_PER_FEED)
          .map((item) => ({ ...item, source: feed.name, category: feed.category }));
      } catch (error) {
        ctx.log(`⚠ flux ${feed.name} : ${errorMessage(error)}`);
        failedFeeds.push(feed.name);
        return [];
      }
    }),
  );

  const seen = new Set<string>();
  const candidates = perFeed
    .flat()
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .filter((item) => {
      const key = normalize(item.title);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_TOTAL)
    .map((item, index) => ({ id: `n${index + 1}`, ...item }));

  return { candidates, failedFeeds };
}
