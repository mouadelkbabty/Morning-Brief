import { Badge } from "@/components/ui/badge";
import { fmtPct, fmtPrice, trend } from "@/lib/brief/format";
import type { AssetSnapshot } from "@/lib/brief/types";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";

const ARROW = { up: "▲", down: "▼", flat: "•" } as const;
const TEXT = { up: "text-up", down: "text-down", flat: "text-flat" } as const;

function ChangeBadge({ value }: { value: number | null }) {
  const t = trend(value);
  return (
    <Badge variant={t}>
      <span aria-hidden className="text-[0.6em]">{ARROW[t]}</span>
      {fmtPct(value)}
    </Badge>
  );
}

const sparkLabel = (a: AssetSnapshot) => `${a.name} : ${fmtPct(a.change5dPct)} sur 5 séances`;

/** Carte d'un indice : gros chiffre, variation de la veille, courbe 5 jours. */
export function MarketCard({ asset }: { asset: AssetSnapshot }) {
  const off = asset.status === "unavailable";
  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-4 @xl:p-5" title={asset.note}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{asset.name}</p>
          <p className="text-xs text-muted-foreground">{asset.symbol}</p>
        </div>
        {!off && <ChangeBadge value={asset.changePct} />}
      </div>
      {off ? (
        <p className="py-3 text-sm text-muted-foreground">Indisponible ce matin</p>
      ) : (
        <>
          <p className="num text-[1.625rem] leading-none font-semibold @xl:text-3xl">{fmtPrice(asset.price, asset.currency)}</p>
          <div className="flex items-end justify-between gap-3">
            <p className="text-xs whitespace-nowrap text-muted-foreground">
              5 jours <span className={cn("num font-medium", TEXT[trend(asset.change5dPct)])}>{fmtPct(asset.change5dPct)}</span>
            </p>
            <Sparkline values={asset.closes} trend={trend(asset.change5dPct ?? asset.changePct)} label={sparkLabel(asset)} className="w-20 @xl:w-24" />
          </div>
        </>
      )}
    </div>
  );
}

/** Ligne d'une position : nom, courbe, cours et variations. */
export function PositionRow({ asset }: { asset: AssetSnapshot }) {
  const off = asset.status === "unavailable";
  return (
    <li className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-medium">{asset.name}</p>
        <p className="text-xs text-muted-foreground">
          {asset.symbol}
          {!off && (
            <>
              {" · 5 j "}
              <span className={cn("num", TEXT[trend(asset.change5dPct)])}>{fmtPct(asset.change5dPct)}</span>
            </>
          )}
        </p>
      </div>
      {off ? (
        <p className="text-sm text-muted-foreground">Indisponible</p>
      ) : (
        <>
          <Sparkline values={asset.closes} trend={trend(asset.change5dPct ?? asset.changePct)} label={sparkLabel(asset)} className="hidden w-16 @[21rem]:block" />
          <div className="flex w-[5.5rem] flex-col items-end gap-1">
            <p className="num text-[0.9375rem] font-semibold">{fmtPrice(asset.price, asset.currency)}</p>
            <ChangeBadge value={asset.changePct} />
          </div>
        </>
      )}
    </li>
  );
}
