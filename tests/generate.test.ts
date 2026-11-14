import { describe, expect, it } from "vitest";
import { generateBrief, fallbackSummary, validateAiOutput } from "../src/lib/brief/generate";
import { toSnapshot } from "../src/lib/brief/market";
import { parseFeed } from "../src/lib/brief/news";
import { briefSchema, DISCLAIMER, type NewsCandidate } from "../src/lib/brief/types";
import { FIXTURE_ENV } from "./fixtures/fake-fetch";
import { INPUT, makeCtx } from "./helpers";

describe("génération du brief", () => {
  it("produit un brief complet et valide", async () => {
    const { ctx } = makeCtx();
    const brief = await generateBrief(ctx, INPUT);

    expect(() => briefSchema.parse(brief)).not.toThrow();
    expect(brief.date).toBe("2026-11-13");
    expect(brief.disclaimer).toBe(DISCLAIMER);
    expect(brief.summary.length).toBeGreaterThan(0);
    expect(brief.summary.length).toBeLessThanOrEqual(5);
    expect(brief.markets.map((a) => a.id)).toEqual(["cac40", "sp500", "nasdaq100", "msciworld"]);
    expect(brief.positions.map((a) => a.id)).toEqual(["pea-monde", "pea-sp500", "pea-nasdaq", "nvda", "meta"]);
    for (const asset of [...brief.markets, ...brief.positions]) {
      expect(asset.status).toBe("ok");
      expect(asset.closes).toHaveLength(6);
      expect(asset.asOf).toBe("2026-11-12"); // clôture de la veille
    }
    expect(brief.meta).toEqual({ ai: { provider: "gemini", model: "gemini-flash-latest" }, degraded: [] });
  });

  it("cite pour chaque actualité la source et le lien du flux, pas ceux de l'IA", async () => {
    const { ctx } = makeCtx();
    const brief = await generateBrief(ctx, INPUT);
    expect(brief.news.length).toBeGreaterThanOrEqual(3);
    expect(brief.news.length).toBeLessThanOrEqual(5);
    for (const item of brief.news) {
      expect(item.source).toMatch(/\(exemple\)$/);
      expect(item.url).toMatch(/^https:\/\/rss\.example\.com\/a\//);
      expect(item.summary).not.toBe("");
    }
  });

  it("écarte les actualités trop anciennes et les doublons", async () => {
    const { ctx } = makeCtx();
    const brief = await generateBrief(ctx, { ...INPUT, systemPrompt: "x" });
    const titles = brief.news.map((n) => n.title);
    expect(titles).not.toContain("Rapport annuel 2019");
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("ajoute les résultats du jour des sociétés suivies à « à surveiller »", async () => {
    const { ctx } = makeCtx();
    const brief = await generateBrief(ctx, INPUT);
    expect(brief.watch[0]).toEqual({ label: "Résultats de NVIDIA (après la clôture de Wall Street)", kind: "earnings" });
    expect(brief.watch.some((w) => w.kind === "central_bank")).toBe(true);
    expect(brief.watch.some((w) => w.label.includes("ZZZZ"))).toBe(false); // société non suivie
  });

  it("passe à la source suivante quand la première tombe, et signale un actif sans source", async () => {
    const { ctx } = makeCtx({ intercept: (url) => (url.includes("stooq.com") ? new Response("boom", { status: 500 }) : undefined) });
    const brief = await generateBrief(ctx, INPUT);
    const byId = Object.fromEntries([...brief.markets, ...brief.positions].map((a) => [a.id, a]));

    expect(byId.nvda).toMatchObject({ status: "ok", provider: "twelvedata" });
    expect(byId.sp500).toMatchObject({ status: "ok", provider: "twelvedata" });
    expect(byId.cac40).toMatchObject({ status: "unavailable", price: null, closes: [] }); // Stooq est sa seule source
    expect(brief.meta.degraded).toContain("Cours indisponible : CAC 40");
  });

  it("ignore une source dont la clé manque", async () => {
    const { ctx, logs } = makeCtx({ env: { ...FIXTURE_ENV, TWELVEDATA_API_KEY: undefined } });
    const brief = await generateBrief(ctx, INPUT);
    expect(brief.positions.find((a) => a.id === "pea-monde")).toMatchObject({ status: "ok", provider: "alphavantage" });
    expect(logs.join("\n")).not.toMatch(/TWELVEDATA/);
  });

  it("reste publiable sans aucune IA : résumé automatique et titres bruts", async () => {
    const { ctx } = makeCtx({ env: { ...FIXTURE_ENV, GEMINI_API_KEY: "", GROQ_API_KEY: "", OPENROUTER_API_KEY: "" } });
    const brief = await generateBrief(ctx, INPUT);
    expect(brief.meta.ai).toBeNull();
    expect(brief.meta.degraded).toContain("Aucune clé IA : résumé automatique");
    expect(brief.summary[0]).toMatch(/^CAC 40 : [+−]\d+,\d{2} % à la dernière séance/);
    expect(brief.news.length).toBeGreaterThan(0);
    expect(brief.news[0].summary).toBe(brief.news[0].title);
    expect(brief.watch).toEqual([{ label: "Résultats de NVIDIA (après la clôture de Wall Street)", kind: "earnings" }]);
  });

  it("signale un flux d'actualités en panne sans bloquer le brief", async () => {
    const { ctx } = makeCtx({ intercept: (url) => (url.includes("tech.atom") ? new Response("", { status: 503 }) : undefined) });
    const brief = await generateBrief(ctx, INPUT);
    expect(brief.meta.degraded).toEqual(["Flux d'actualités indisponible : Tech Hebdo (exemple)"]);
    expect(brief.news.length).toBeGreaterThanOrEqual(3);
  });
});

describe("calculs de marché", () => {
  const asset = INPUT.watchlist.positions[3];
  const closes = [100, 102, 101, 104, 103, 105, 110].map((close, i) => ({ date: `2026-11-0${i + 2}`, close }));

  it("calcule la variation de la veille et sur 5 séances", () => {
    const snap = toSnapshot(asset, closes, "stooq", "2026-11-09");
    expect(snap.price).toBe(110);
    expect(snap.changePct).toBe(4.76); // 105 → 110
    expect(snap.change5dPct).toBe(7.84); // 102 → 110
    expect(snap.closes).toEqual([102, 101, 104, 103, 105, 110]);
  });

  it("ne compte pas une séance du jour encore en cours", () => {
    const snap = toSnapshot(asset, closes, "stooq", "2026-11-08");
    expect(snap.asOf).toBe("2026-11-07");
    expect(snap.price).toBe(105);
  });

  it("n'annonce pas de tendance 5 jours sans assez d'historique", () => {
    const snap = toSnapshot(asset, closes.slice(-2), "finnhub", "2026-11-09");
    expect(snap.changePct).toBe(4.76);
    expect(snap.change5dPct).toBeNull();
  });
});

describe("contrôle de la réponse de l'IA", () => {
  const candidates = ["n1", "n2", "n3", "n4"].map((id): NewsCandidate => ({ id, title: id, snippet: "", source: "S", url: "https://e.x/" + id, category: "macro", publishedAt: null }));

  it("rejette une réponse qui invente des actualités", () => {
    const raw = { summary: ["a"], news: [{ id: "n1", summary: "ok" }, { id: "n99", summary: "inventée" }, { id: "x", summary: "inventée" }] };
    expect(() => validateAiOutput(raw, candidates)).toThrow(/1 actualité\(s\) valide\(s\) sur 3/);
  });

  it("limite le résumé à 5 lignes et retire les doublons", () => {
    const raw = {
      summary: ["1", "2", "3", "4", "5", "6", "7"],
      news: [{ id: "n1", summary: "a" }, { id: "n1", summary: "bis" }, { id: "n2", summary: "b" }, { id: "n3", summary: "c" }],
      watch: [{ label: "x", kind: "inconnu" }],
    };
    const out = validateAiOutput(raw, candidates);
    expect(out.summary).toHaveLength(5);
    expect(out.news.map((n) => n.id)).toEqual(["n1", "n2", "n3"]);
    expect(out.watch).toEqual([{ label: "x", kind: "other" }]);
  });

  it("rejette une réponse sans résumé", () => {
    expect(() => validateAiOutput({ summary: [], news: [] }, [])).toThrow();
  });
});

describe("lecture des flux", () => {
  it("lit RSS et Atom, nettoie le HTML et les entités", () => {
    const rss = parseFeed(`<rss><channel><item><title>A &amp; B</title><link>https://e.x/1</link><description><![CDATA[<p>Un <b>texte</b>&nbsp;riche</p>]]></description><pubDate>Fri, 13 Nov 2026 05:00:00 GMT</pubDate></item><item><title>Sans lien</title></item></channel></rss>`);
    expect(rss).toEqual([{ title: "A & B", url: "https://e.x/1", snippet: "Un texte riche", publishedAt: "2026-11-13T05:00:00.000Z" }]);
    const atom = parseFeed(`<feed><entry><title>T</title><link rel="self" href="https://e.x/self"/><link rel="alternate" href="https://e.x/2"/><updated>2026-11-13T05:00:00Z</updated></entry></feed>`);
    expect(atom[0]).toMatchObject({ title: "T", url: "https://e.x/2" });
  });
});

describe("résumé de secours", () => {
  it("dit clairement quand il n'y a aucune donnée", () => {
    expect(fallbackSummary([], [])).toEqual(["Les données de marché sont indisponibles ce matin."]);
  });
});
