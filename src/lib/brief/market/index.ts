import { createThrottle, errorMessage } from "../http";
import { parisTime } from "../time";
import type { AssetConfig, AssetSnapshot, Context } from "../types";
import { MIN_INTERVAL_MS, MissingKeyError, PROVIDERS, type Close } from "./providers";

const SPARK_POINTS = 6; // 6 clôtures = 5 séances de variation

const pct = (from: number, to: number) => Math.round((to / from - 1) * 10_000) / 100;

/** Transforme une série de clôtures en cours, variations et points de sparkline. */
export function toSnapshot(asset: AssetConfig, closes: Close[], provider: string, today: string): AssetSnapshot {
  // On ne garde que les séances terminées : le brief part avant l'ouverture,
  // mais une source peut déjà publier une ligne partielle pour aujourd'hui.
  const done = closes.filter((c) => c.date < today);
  const series = (done.length >= 2 ? done : closes).slice(-SPARK_POINTS);
  const last = series.at(-1)!;
  const previous = series.at(-2);
  return {
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    kind: asset.kind,
    currency: asset.currency,
    status: "ok",
    price: last.close,
    changePct: previous ? pct(previous.close, last.close) : null,
    change5dPct: series.length === SPARK_POINTS ? pct(series[0].close, last.close) : null,
    closes: series.map((c) => c.close),
    asOf: last.date,
    provider,
    ...(asset.note ? { note: asset.note } : {}),
  };
}

function unavailable(asset: AssetConfig): AssetSnapshot {
  return {
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    kind: asset.kind,
    currency: asset.currency,
    status: "unavailable",
    price: null,
    changePct: null,
    change5dPct: null,
    closes: [],
    asOf: null,
    provider: null,
    ...(asset.note ? { note: asset.note } : {}),
  };
}

/**
 * Récupère chaque actif en essayant ses sources dans l'ordre de la watchlist.
 * Une source qui échoue (limite, panne, symbole inconnu) laisse la place à la
 * suivante ; si toutes échouent, l'actif est marqué « indisponible » et le
 * brief part quand même.
 */
export async function fetchSnapshots(ctx: Context, assets: AssetConfig[]): Promise<AssetSnapshot[]> {
  const throttle = createThrottle(ctx, MIN_INTERVAL_MS);
  const today = parisTime(ctx.now).date;

  return Promise.all(
    assets.map(async (asset) => {
      for (const source of asset.sources) {
        try {
          await throttle(source.provider);
          const closes = await PROVIDERS[source.provider](ctx, source);
          return toSnapshot(asset, closes, source.provider, today);
        } catch (error) {
          // Une clé absente n'est pas une panne : on passe à la source suivante sans bruit.
          if (!(error instanceof MissingKeyError)) {
            ctx.log(`⚠ ${asset.name} via ${source.provider} (${source.symbol}) : ${errorMessage(error)}`);
          }
        }
      }
      ctx.log(`✗ ${asset.name} : aucune source n'a répondu`);
      return unavailable(asset);
    }),
  );
}
