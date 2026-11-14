// Branche (ou débranche) le webhook Telegram sur la web app, pour que le bot
// réponde à /brief et /watchlist.
//
//   npm run telegram:webhook            branche sur APP_URL/api/telegram
//   npm run telegram:webhook -- --off   débranche
//   npm run telegram:webhook -- --chat-id   affiche ton chat_id (écris d'abord au bot)
import { existsSync } from "node:fs";

async function call(token: string, method: string, body?: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`${method} : ${data.description ?? res.status}`);
  return data.result;
}

async function main() {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: secret, APP_URL: appUrl } = process.env;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN non renseigné dans .env");

  if (process.argv.includes("--chat-id")) {
    const updates: Array<{ message?: { chat?: { id: number; first_name?: string } } }> = await call(token, "getUpdates");
    const chats = new Map(updates.filter((u) => u.message?.chat).map((u) => [u.message!.chat!.id, u.message!.chat!.first_name ?? ""]));
    if (!chats.size) console.log("Aucun message reçu. Envoie « bonjour » à ton bot dans Telegram, puis relance (le webhook doit être débranché : --off).");
    for (const [id, name] of chats) console.log(`chat_id : ${id}  (${name})`);
    return;
  }
  if (process.argv.includes("--off")) {
    await call(token, "deleteWebhook");
    console.log("Webhook débranché.");
    return;
  }

  if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET non renseigné dans .env");
  if (!appUrl?.startsWith("https://")) throw new Error("APP_URL doit être l'URL https de ton app Vercel");
  const url = `${appUrl.replace(/\/$/, "")}/api/telegram`;
  await call(token, "setWebhook", { url, secret_token: secret, allowed_updates: ["message"] });
  await call(token, "setMyCommands", {
    commands: [
      { command: "brief", description: "Le dernier brief" },
      { command: "watchlist", description: "Les actifs suivis" },
    ],
  });
  console.log(`Webhook branché sur ${url}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
