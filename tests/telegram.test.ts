import { describe, expect, it } from "vitest";
import { generateBrief } from "../src/lib/brief/generate";
import { briefSections, formatBrief, handleCommand, htmlToText, sendMessages, splitMessages, TELEGRAM_LIMIT } from "../src/lib/brief/telegram";
import { DISCLAIMER, type Brief } from "../src/lib/brief/types";
import { INPUT, makeCtx } from "./helpers";

async function sampleBrief(): Promise<Brief> {
  return generateBrief(makeCtx().ctx, INPUT);
}

describe("format Telegram", () => {
  it("place le résumé en tête et l'avertissement en dernier", async () => {
    const [message, ...rest] = formatBrief(await sampleBrief());
    expect(rest).toEqual([]);
    expect(message.length).toBeLessThan(TELEGRAM_LIMIT);
    const order = ["Morning Brief", "<b>En bref</b>", "<b>Marchés</b>", "<b>Mes positions</b>", "<b>Actus</b>", "<b>À surveiller aujourd'hui</b>"].map((s) => message.indexOf(s));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(message.endsWith(`<i>${DISCLAIMER}</i>`)).toBe(true);
    expect(message).toContain("Vendredi 13 novembre 2026");
  });

  it("affiche cours, variation et tendance 5 jours avec la bonne couleur", async () => {
    const brief = await sampleBrief();
    brief.markets[0] = { ...brief.markets[0], price: 8123.45, changePct: -0.42, change5dPct: 1.2 };
    // Intl insère des espaces insécables : on les ramène à des espaces simples pour comparer.
    const text = htmlToText(formatBrief(brief)[0]).replace(/[\u202f\u00a0]/g, " ");
    expect(text).toContain("🔴 CAC 40\n     8 123,45 · −0,42 % · 5 j +1,20 %");
  });

  it("n'utilise que des balises HTML acceptées par Telegram, toutes refermées", async () => {
    const message = formatBrief(await sampleBrief(), "https://app.example.com")[0];
    const tags = [...message.matchAll(/<\/?([a-z]+)[^>]*>/g)];
    expect(new Set(tags.map((t) => t[1]))).toEqual(new Set(["b", "i", "a"]));
    for (const tag of ["b", "i", "a"]) {
      expect(message.split(`<${tag}`).length).toBe(message.split(`</${tag}>`).length);
    }
    expect(message).toContain('<a href="https://app.example.com">📱 Ouvrir dans l\'app</a>');
  });

  it("échappe le texte venu de l'extérieur", async () => {
    const brief = await sampleBrief();
    brief.summary = ["AT&T <script> monte"];
    brief.news[0] = { ...brief.news[0], summary: "Q&A <b>gras</b>", source: "L'Écho & Co", url: 'https://e.x/?a=1&b="2"' };
    const message = formatBrief(brief)[0];
    expect(message).toContain("• AT&amp;T &lt;script&gt; monte");
    expect(message).toContain('Q&amp;A &lt;b&gt;gras&lt;/b&gt; <a href="https://e.x/?a=1&amp;b=&quot;2&quot;">L\'Écho &amp; Co</a>');
  });

  it("signale un actif indisponible et un brief partiel", async () => {
    const brief = await sampleBrief();
    brief.markets[0] = { ...brief.markets[0], status: "unavailable", price: null, changePct: null, change5dPct: null, closes: [] };
    brief.meta.degraded = ["Cours indisponible : CAC 40"];
    brief.watch = [];
    const message = formatBrief(brief)[0];
    expect(message).toContain("⚪️ CAC 40 · <i>indisponible</i>");
    expect(message).toContain("⚠️ <i>Brief partiel : Cours indisponible : CAC 40.</i>");
    expect(message).toContain("<i>Rien de notable au calendrier.</i>");
  });

  it("ne garde que 5 lignes de résumé", async () => {
    const brief = await sampleBrief();
    brief.summary = ["1", "2", "3", "4", "5", "6"];
    expect(briefSections(brief)[1].split("\n")).toHaveLength(6); // titre + 5 lignes
  });

  it("découpe un message trop long sans dépasser la limite ni perdre de texte", () => {
    const sections = ["A".repeat(60), "B".repeat(60), ["C".repeat(40), "D".repeat(40), "E".repeat(40)].join("\n")];
    const messages = splitMessages(sections, 100);
    expect(messages.every((m) => m.length <= 100)).toBe(true);
    expect(messages.join("").replace(/\n/g, "")).toBe(sections.join("").replace(/\n/g, ""));
    expect(messages).toHaveLength(4);
  });
});

describe("envoi Telegram", () => {
  it("poste chaque message en HTML, sans aperçu de lien", async () => {
    const { ctx, fetch } = makeCtx();
    await sendMessages(ctx, "42", ["un", "deux"]);
    expect(fetch.calls.map((c) => c.url)).toEqual(Array(2).fill("https://api.telegram.org/bot123:fake-token/sendMessage"));
    expect(JSON.parse(String(fetch.calls[0].init?.body))).toEqual({ chat_id: "42", text: "un", parse_mode: "HTML", link_preview_options: { is_disabled: true } });
  });

  it("ne laisse pas fuiter le jeton dans une erreur", async () => {
    const { ctx } = makeCtx({ intercept: () => new Response("Unauthorized for bot123:fake-token", { status: 401 }) });
    await expect(sendMessages(ctx, "42", ["x"])).rejects.toThrow(/Envoi Telegram refusé : HTTP 401 Unauthorized for bot\*\*\*/);
  });

  it("refuse d'envoyer sans jeton", async () => {
    const { ctx } = makeCtx({ env: {} });
    await expect(sendMessages(ctx, "42", ["x"])).rejects.toThrow("TELEGRAM_BOT_TOKEN");
  });
});

describe("commandes du bot", () => {
  const data = { ownerChatId: "42", latest: null as Brief | null, watchlist: INPUT.watchlist };
  const update = (text: string, id: number | string = 42) => ({ message: { text, chat: { id } } });

  it("/brief renvoie le dernier brief", async () => {
    const latest = await sampleBrief();
    expect(handleCommand(update("/brief"), { ...data, latest })?.[0]).toContain("<b>En bref</b>");
    expect(handleCommand(update("/brief@MonBot maintenant"), { ...data, latest })?.[0]).toContain("<b>En bref</b>");
    expect(handleCommand(update("/brief"), data)).toEqual(["Aucun brief n'a encore été généré."]);
  });

  it("/watchlist liste les actifs suivis", () => {
    const [text] = handleCommand(update("/watchlist"), data)!;
    expect(text).toContain("• CAC 40 <code>PX1</code>");
    expect(text).toContain("• NVIDIA <code>NVDA</code>");
    expect(text).toContain("• S&amp;P 500 <code>SPX</code>");
  });

  it("ignore les autres conversations et les messages ordinaires", () => {
    expect(handleCommand(update("/brief", 999), data)).toBeNull();
    expect(handleCommand(update("bonjour"), data)).toBeNull();
    expect(handleCommand({}, data)).toBeNull();
    expect(handleCommand(update("/inconnue"), data)?.[0]).toMatch(/^Commande inconnue/);
    expect(handleCommand(update("/start"), data)?.[0]).toContain("/watchlist");
  });
});
