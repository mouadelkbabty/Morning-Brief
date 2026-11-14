import { timingSafeEqual } from "node:crypto";
import { loadWatchlist, readLatestBrief } from "@/lib/brief/store";
import { handleCommand, sendMessages, type TelegramUpdate } from "@/lib/brief/telegram";
import type { Context } from "@/lib/brief/types";

function sameSecret(received: string | null, expected: string): boolean {
  const a = Buffer.from(received ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Webhook Telegram : répond à /brief et /watchlist.
 * Telegram joint à chaque appel le secret choisi lors du branchement
 * (`npm run telegram:webhook`) ; sans lui, la requête est refusée.
 */
export async function POST(request: Request) {
  const { TELEGRAM_WEBHOOK_SECRET: secret, TELEGRAM_CHAT_ID: ownerChatId, TELEGRAM_BOT_TOKEN: token, APP_URL: appUrl } = process.env;
  if (!secret || !ownerChatId || !token) return Response.json({ error: "webhook non configuré" }, { status: 503 });
  if (!sameSecret(request.headers.get("x-telegram-bot-api-secret-token"), secret)) {
    return Response.json({ error: "non autorisé" }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  const messages = update && handleCommand(update, { ownerChatId, latest: readLatestBrief(), watchlist: loadWatchlist(), appUrl });
  if (messages) {
    const ctx: Context = {
      fetch: (url, init) => fetch(url, init),
      env: process.env,
      now: new Date(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      log: (message) => console.warn(message),
    };
    // On répond toujours 200 : sinon Telegram renverrait la même commande en boucle.
    await sendMessages(ctx, ownerChatId, messages).catch((error) => console.error(error.message));
  }
  return Response.json({ ok: true });
}
