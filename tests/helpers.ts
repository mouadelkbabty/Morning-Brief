import { readFileSync } from "node:fs";
import type { GenerateInput } from "../src/lib/brief/generate";
import { watchlistSchema, type Context } from "../src/lib/brief/types";
import { createFakeFetch, FIXTURE_ENV, FIXTURE_FEEDS, type FakeFetchOptions } from "./fixtures/fake-fetch";

/** Vendredi 13 novembre 2026, 7h50 à Paris (heure d'hiver). */
export const NOW = new Date("2026-11-13T06:50:00Z");

export const INPUT: GenerateInput = {
  watchlist: watchlistSchema.parse(JSON.parse(readFileSync("config/watchlist.json", "utf8"))),
  feeds: FIXTURE_FEEDS,
  systemPrompt: readFileSync("prompts/brief.system.md", "utf8"),
};

export function makeCtx(options: { env?: Record<string, string | undefined>; intercept?: FakeFetchOptions["intercept"]; now?: Date } = {}) {
  const now = options.now ?? NOW;
  const fetch = createFakeFetch({ now, intercept: options.intercept });
  const logs: string[] = [];
  const ctx: Context = { fetch, env: options.env ?? FIXTURE_ENV, now, sleep: async () => {}, log: (m) => logs.push(m) };
  return { ctx, fetch, logs };
}

/** Adresses des appels IA, dans l'ordre. */
export const aiCalls = (fetch: { calls: Array<{ url: string; init?: RequestInit }> }) =>
  fetch.calls
    .filter((c) => c.url.endsWith("/chat/completions"))
    .map((c) => `${new URL(c.url).hostname}:${JSON.parse(String(c.init?.body)).model}`);

export const completion = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { headers: { "Content-Type": "application/json" } });
