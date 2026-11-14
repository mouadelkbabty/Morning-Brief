import { fmtDateLong, fmtPct, fmtPrice, trend } from "./format";
import { request } from "./http";
import type { AssetSnapshot, Brief, Context, Watchlist } from "./types";

/** Longueur maximale d'un message Telegram. */
export const TELEGRAM_LIMIT = 4096;

export const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (text: string) => escapeHtml(text).replace(/"/g, "&quot;");

const DOT = { up: "🟢", down: "🔴", flat: "⚪️" } as const;
const WATCH_ICON = { earnings: "📊", central_bank: "🏦", macro: "📈", other: "•" } as const;

function assetLine(a: AssetSnapshot): string {
  if (a.status === "unavailable") return `⚪️ ${escapeHtml(a.name)} · <i>indisponible</i>`;
  const five = a.change5dPct != null ? ` · 5 j ${fmtPct(a.change5dPct)}` : "";
  return `${DOT[trend(a.changePct)]} <b>${escapeHtml(a.name)}</b>\n     ${fmtPrice(a.price, a.currency)} · <b>${fmtPct(a.changePct)}</b>${five}`;
}

/**
 * Met le brief en forme pour Telegram (mode HTML). Renvoie les sections
 * séparément : `splitMessages` les regroupe ensuite sans dépasser la limite.
 */
export function briefSections(brief: Brief, appUrl?: string): string[] {
  const sections: string[] = [];
  const title = fmtDateLong(brief.date);
  sections.push(
    `☀️ <b>Morning Brief</b>\n<i>${escapeHtml(title.charAt(0).toUpperCase() + title.slice(1))}</i>` +
      (brief.sample ? "\n⚠️ <i>Exemple : chiffres fictifs</i>" : ""),
  );
  sections.push(`<b>En bref</b>\n${brief.summary.slice(0, 5).map((s) => `• ${escapeHtml(s)}`).join("\n")}`);
  if (brief.markets.length) sections.push(`<b>Marchés</b>\n${brief.markets.map(assetLine).join("\n")}`);
  if (brief.positions.length) sections.push(`<b>Mes positions</b>\n${brief.positions.map(assetLine).join("\n")}`);
  if (brief.news.length) {
    const lines = brief.news.map(
      (n, i) => `${i + 1}. ${escapeHtml(n.summary)} <a href="${escapeAttr(n.url)}">${escapeHtml(n.source)}</a>`,
    );
    sections.push(`<b>Actus</b>\n${lines.join("\n")}`);
  }
  sections.push(
    `<b>À surveiller aujourd'hui</b>\n` +
      (brief.watch.length
        ? brief.watch.map((w) => `${WATCH_ICON[w.kind]} ${escapeHtml(w.label)}`).join("\n")
        : "<i>Rien de notable au calendrier.</i>"),
  );
  if (brief.meta.degraded.length) {
    sections.push(`⚠️ <i>Brief partiel : ${escapeHtml(brief.meta.degraded.join(" ; "))}.</i>`);
  }
  if (appUrl) sections.push(`<a href="${escapeAttr(appUrl)}">📱 Ouvrir dans l'app</a>`);
  sections.push(`<i>${escapeHtml(brief.disclaimer)}</i>`);
  return sections;
}

/** Regroupe des sections en messages de moins de `limit` caractères, sans couper une balise. */
export function splitMessages(sections: string[], limit = TELEGRAM_LIMIT): string[] {
  const messages: string[] = [];
  let current = "";
  const push = (piece: string, joiner: string) => {
    const next = current ? current + joiner + piece : piece;
    if (next.length <= limit) current = next;
    else {
      if (current) messages.push(current);
      current = piece.slice(0, limit);
    }
  };
  for (const section of sections) {
    if (section.length <= limit) push(section, "\n\n");
    // Une section trop longue à elle seule est répartie ligne par ligne.
    else section.split("\n").forEach((line, i) => push(line, i === 0 ? "\n\n" : "\n"));
  }
  if (current) messages.push(current);
  return messages;
}

export const formatBrief = (brief: Brief, appUrl?: string) => splitMessages(briefSections(brief, appUrl));

export function formatWatchlist(watchlist: Watchlist): string {
  const list = (assets: Watchlist["markets"]) => assets.map((a) => `• ${escapeHtml(a.name)} <code>${escapeHtml(a.symbol)}</code>`).join("\n");
  return `<b>Marchés suivis</b>\n${list(watchlist.markets)}\n\n<b>Mes positions</b>\n${list(watchlist.positions)}`;
}

export const HELP_TEXT =
  "<b>Morning Brief</b>\nLe brief arrive chaque jour ouvré à 8h00.\n\n/brief : le dernier brief\n/watchlist : les actifs suivis";

/** Version texte brut d'un message HTML, pour l'affichage en console. */
export function htmlToText(html: string): string {
  return html
    .replace(/<a href="([^"]*)">([^<]*)<\/a>/g, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

/** Envoie un ou plusieurs messages HTML dans une conversation. */
export async function sendMessages(ctx: Context, chatId: string, messages: string[]): Promise<void> {
  const token = ctx.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN non renseigné");
  for (const text of messages) {
    try {
      await request(ctx, `https://api.telegram.org/bot${token}/sendMessage`, {
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
        },
      });
    } catch (error) {
      // Le jeton fait partie de l'URL : on évite qu'il se retrouve dans un message d'erreur.
      throw new Error(`Envoi Telegram refusé : ${String(error instanceof Error ? error.message : error).replaceAll(token, "***")}`);
    }
  }
}

export interface TelegramUpdate {
  message?: { text?: string; chat?: { id?: number | string } };
}

/**
 * Réponse à une commande reçue par le webhook, ou null s'il ne faut rien
 * répondre. Le bot est privé : il ignore toute autre conversation que la tienne.
 */
export function handleCommand(
  update: TelegramUpdate,
  data: { ownerChatId: string; latest: Brief | null; watchlist: Watchlist; appUrl?: string },
): string[] | null {
  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim();
  if (chatId == null || !text || String(chatId) !== data.ownerChatId) return null;
  // "/brief@MonBot argument" → "/brief"
  const command = text.split(/\s+/)[0].split("@")[0].toLowerCase();
  switch (command) {
    case "/brief":
      return data.latest ? formatBrief(data.latest, data.appUrl) : ["Aucun brief n'a encore été généré."];
    case "/watchlist":
      return [formatWatchlist(data.watchlist)];
    case "/start":
    case "/help":
      return [HELP_TEXT];
    default:
      return text.startsWith("/") ? [`Commande inconnue.\n\n${HELP_TEXT}`] : null;
  }
}
