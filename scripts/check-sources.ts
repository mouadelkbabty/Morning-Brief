// Teste chaque source de config/watchlist.json avec tes clés et affiche ce qui
// répond. À lancer après avoir rempli .env, ou après avoir modifié la watchlist.
//
//   npm run check:sources
import { existsSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { errorMessage } from "../src/lib/brief/http";
import { MIN_INTERVAL_MS, MissingKeyError, PROVIDERS } from "../src/lib/brief/market/providers";
import { loadWatchlist } from "../src/lib/brief/store";
import type { Context } from "../src/lib/brief/types";

async function main() {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const ctx: Context = { fetch: (url, init) => fetch(url, init), env: process.env, now: new Date(), sleep: (ms) => sleep(ms).then(() => undefined), log: () => {} };
  const { markets, positions } = loadWatchlist();
  let broken = 0;

  for (const asset of [...markets, ...positions]) {
    console.log(`\n${asset.name}`);
    let ok = false;
    for (const source of asset.sources) {
      const label = `  ${source.provider.padEnd(13)} ${source.symbol.padEnd(12)}`;
      try {
        const closes = await PROVIDERS[source.provider](ctx, source);
        const last = closes.at(-1)!;
        console.log(`${label} ✓ ${closes.length} clôtures, dernière ${last.close} le ${last.date}`);
        ok = true;
      } catch (error) {
        console.log(`${label} ${error instanceof MissingKeyError ? "– clé absente" : `✗ ${errorMessage(error)}`}`);
      }
      await sleep(MIN_INTERVAL_MS[source.provider]);
    }
    if (!ok) broken++;
  }

  console.log(broken ? `\n${broken} actif(s) sans aucune source valide : corrige leurs symboles dans config/watchlist.json.` : "\nChaque actif a au moins une source valide.");
  process.exit(broken ? 1 : 0);
}

main();
