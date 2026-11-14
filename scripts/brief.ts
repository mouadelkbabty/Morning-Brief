// Génère le brief du jour.
//
//   npm run brief          aperçu en console : rien n'est envoyé ni enregistré
//   npm run brief:demo     idem, sans réseau ni clés (données fictives)
//   npm run brief:send     enregistre le brief et l'envoie sur Telegram
//
// Options : --send  --save  --force  --scheduled  --wait  --fixtures  --json
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { generateBrief } from "../src/lib/brief/generate";
import { briefExists, loadFeeds, loadPrompt, loadWatchlist, writeBrief } from "../src/lib/brief/store";
import { formatBrief, htmlToText, sendMessages } from "../src/lib/brief/telegram";
import { msUntilEight, parisTime, scheduleDecision } from "../src/lib/brief/time";
import type { Context } from "../src/lib/brief/types";

const args = new Set(process.argv.slice(2));
const flag = (name: string) => args.has(`--${name}`);

async function main() {
  if (existsSync(".env")) process.loadEnvFile(".env");
  // BRIEF_NOW permet de rejouer une date précise (ex. pour régénérer l'exemple).
  const now = process.env.BRIEF_NOW ? new Date(process.env.BRIEF_NOW) : new Date();
  const today = parisTime(now).date;

  // Lancement planifié : on vérifie l'heure de Paris et l'absence de doublon.
  if (flag("scheduled") && !flag("force")) {
    const decision = scheduleDecision(now, briefExists(today));
    if (!decision.run) {
      console.log(`Rien à faire : ${decision.reason}.`);
      return;
    }
  }

  let ctx: Context = { fetch: (url, init) => fetch(url, init), env: process.env, now, sleep: (ms) => sleep(ms).then(() => undefined), log: (m) => console.error(m) };
  let feeds = loadFeeds();
  if (flag("fixtures")) {
    const fixtures = await import("../tests/fixtures/fake-fetch");
    ctx = { ...ctx, fetch: fixtures.createFakeFetch({ now }), env: fixtures.FIXTURE_ENV, sleep: async () => {} };
    feeds = fixtures.FIXTURE_FEEDS;
  }

  const brief = await generateBrief(ctx, { watchlist: loadWatchlist(), feeds, systemPrompt: loadPrompt("brief.system.md") });
  if (flag("fixtures")) brief.sample = true;

  // Brief d'exemple de la web app : npm run brief:sample
  if (flag("sample")) {
    const file = path.join("data", "sample", "brief.json");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(brief, null, 2)}\n`);
    console.log(`Exemple enregistré : ${file}`);
    return;
  }

  const messages = formatBrief(brief, process.env.APP_URL);
  console.log(flag("json") ? JSON.stringify(brief, null, 2) : messages.map(htmlToText).join("\n\n"));

  // Un brief sans aucun cours n'apporte rien : on échoue pour que le workflow le signale.
  const priced = [...brief.markets, ...brief.positions].some((a) => a.status === "ok");
  if (!priced && (flag("send") || flag("save"))) throw new Error("Aucune donnée de marché disponible : brief non publié.");

  if (flag("save") && !flag("fixtures")) console.error(`Brief enregistré : ${writeBrief(brief)}`);

  if (flag("send") && !flag("fixtures")) {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId) throw new Error("TELEGRAM_CHAT_ID non renseigné");
    if (flag("wait")) {
      const wait = msUntilEight(new Date());
      if (wait > 0) {
        console.error(`Attente de ${Math.round(wait / 1000)} s jusqu'à 8h00 (Paris)…`);
        await sleep(wait);
      }
    }
    await sendMessages(ctx, chatId, messages);
    console.error("Brief envoyé sur Telegram.");
  } else if (!flag("save")) {
    console.error("\n(aperçu : rien n'a été envoyé ni enregistré)");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
