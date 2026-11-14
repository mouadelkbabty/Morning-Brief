import { describe, expect, it } from "vitest";
import { aiProviders, extractJson } from "../src/lib/brief/ai";
import { generateBrief } from "../src/lib/brief/generate";
import { FIXTURE_ENV } from "./fixtures/fake-fetch";
import { aiCalls, completion, INPUT, makeCtx } from "./helpers";

const GEMINI = "generativelanguage.googleapis.com";
const GROQ = "api.groq.com";
const OPENROUTER = "openrouter.ai";
const down = (host: string, status: number) => (url: string) => (url.includes(host) ? new Response("limit", { status }) : undefined);

describe("bascule entre fournisseurs IA", () => {
  it("ordonne la chaîne Gemini → Groq → OpenRouter et saute les clés absentes", () => {
    expect(aiProviders(FIXTURE_ENV).map((p) => `${p.id}:${p.model}`)).toEqual([
      "gemini:gemini-flash-latest",
      "groq:llama-3.3-70b-versatile",
      "openrouter:meta-llama/llama-3.3-70b-instruct:free",
      "openrouter:google/gemma-3-27b-it:free",
    ]);
    expect(aiProviders({ GROQ_API_KEY: "k", GROQ_MODEL: "mon-modele" })).toMatchObject([{ id: "groq", model: "mon-modele" }]);
    expect(aiProviders({})).toEqual([]);
  });

  it("utilise Gemini seul quand tout va bien", async () => {
    const { ctx, fetch } = makeCtx();
    const brief = await generateBrief(ctx, INPUT);
    expect(brief.meta.ai?.provider).toBe("gemini");
    expect(aiCalls(fetch)).toEqual([`${GEMINI}:gemini-flash-latest`]);
  });

  it("bascule sur Groq quand Gemini atteint sa limite (429)", async () => {
    const { ctx, fetch } = makeCtx({ intercept: down(GEMINI, 429) });
    const brief = await generateBrief(ctx, INPUT);
    expect(brief.meta.ai).toEqual({ provider: "groq", model: "llama-3.3-70b-versatile" });
    // Gemini : 1 essai + 1 nouvelle tentative, puis Groq.
    expect(aiCalls(fetch).map((c) => c.split(":")[0])).toEqual([GEMINI, GEMINI, GROQ]);
    expect(brief.meta.degraded).toEqual([]);
  });

  it("ne réessaie pas une erreur définitive (clé refusée) avant de basculer", async () => {
    const { ctx, fetch } = makeCtx({ intercept: down(GEMINI, 401) });
    const brief = await generateBrief(ctx, INPUT);
    expect(brief.meta.ai?.provider).toBe("groq");
    expect(aiCalls(fetch).map((c) => c.split(":")[0])).toEqual([GEMINI, GROQ]);
  });

  it("bascule quand la réponse n'est pas du JSON exploitable", async () => {
    const { ctx } = makeCtx({ intercept: (url) => (url.includes(GEMINI) ? completion("Désolé, je ne peux pas.") : undefined) });
    expect((await generateBrief(ctx, INPUT)).meta.ai?.provider).toBe("groq");
  });

  it("bascule quand la réponse invente des actualités", async () => {
    const invented = JSON.stringify({ summary: ["ok"], news: [{ id: "n77", summary: "faux" }] });
    const { ctx, logs } = makeCtx({ intercept: (url) => (url.includes(GEMINI) ? completion(invented) : undefined) });
    expect((await generateBrief(ctx, INPUT)).meta.ai?.provider).toBe("groq");
    expect(logs.join("\n")).toMatch(/IA gemini.*fournisseur suivant/);
  });

  it("descend jusqu'au second modèle gratuit d'OpenRouter", async () => {
    const { ctx, fetch } = makeCtx({
      intercept: (url, init) => {
        if (url.includes(GEMINI) || url.includes(GROQ)) return new Response("down", { status: 503 });
        if (url.includes(OPENROUTER) && String(init?.body).includes("llama-3.3")) return new Response("limit", { status: 429 });
      },
    });
    const brief = await generateBrief(ctx, INPUT);
    expect(brief.meta.ai).toEqual({ provider: "openrouter", model: "google/gemma-3-27b-it:free" });
    expect(aiCalls(fetch).at(-1)).toBe(`${OPENROUTER}:google/gemma-3-27b-it:free`);
  });

  it("envoie la clé du bon fournisseur à chaque appel", async () => {
    const { ctx, fetch } = makeCtx({ intercept: down(GEMINI, 500) });
    await generateBrief(ctx, INPUT);
    const auth = fetch.calls.filter((c) => c.url.endsWith("/chat/completions")).map((c) => (c.init?.headers as Record<string, string>).Authorization);
    expect(auth).toEqual(["Bearer fake-gemini", "Bearer fake-gemini", "Bearer fake-groq"]);
  });

  it("publie un brief dégradé quand tous les fournisseurs échouent", async () => {
    const { ctx } = makeCtx({ intercept: (url) => (url.endsWith("/chat/completions") ? new Response("down", { status: 503 }) : undefined) });
    const brief = await generateBrief(ctx, INPUT);
    expect(brief.meta.ai).toBeNull();
    expect(brief.meta.degraded).toEqual(["IA indisponible : résumé automatique"]);
    expect(brief.summary.length).toBeGreaterThan(0);
    expect(brief.markets.every((a) => a.status === "ok")).toBe(true);
  });
});

describe("extractJson", () => {
  it("accepte un JSON entouré de balises de code ou de texte", () => {
    expect(extractJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Voici : {"a": {"b": 2}} fin')).toEqual({ a: { b: 2 } });
    expect(() => extractJson("rien")).toThrow(SyntaxError);
  });
});
