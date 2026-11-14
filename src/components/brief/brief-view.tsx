import { CalendarDays, ChartColumn, ExternalLink, Landmark, TrendingUp, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDateLong, fmtDayMonth } from "@/lib/brief/format";
import type { Brief, WatchItem } from "@/lib/brief/types";
import { MarketCard, PositionRow } from "./asset";

const WATCH_ICON: Record<WatchItem["kind"], typeof Landmark> = {
  earnings: ChartColumn,
  central_bank: Landmark,
  macro: TrendingUp,
  other: CalendarDays,
};

const AI_NAME: Record<string, string> = { gemini: "Gemini", groq: "Groq", openrouter: "OpenRouter" };

export function BriefHeader({ brief, eyebrow }: { brief: Brief; eyebrow: string }) {
  const date = fmtDateLong(brief.date);
  return (
    <header className="mb-6 @xl:mb-8">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-primary">{eyebrow}</p>
        {brief.sample && <Badge variant="warning">Exemple · chiffres fictifs</Badge>}
      </div>
      <h1 className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.035em] first-letter:uppercase @xl:text-5xl">{date}</h1>
    </header>
  );
}

/**
 * Le brief en cartes : résumé, marchés, positions, actus, à surveiller.
 * La mise en page suit la largeur du conteneur (requêtes de conteneur), ce qui
 * permet de réutiliser la vue telle quelle dans la maquette de téléphone de /projet.
 */
export function BriefView({ brief }: { brief: Brief }) {
  const asOf = [...brief.markets, ...brief.positions].find((a) => a.asOf)?.asOf;
  return (
    <div className="@container">
    <div className="flex flex-col gap-4 @xl:gap-5">
      <Card className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-56 rounded-full bg-primary/20 blur-3xl" />
        <CardHeader>
          <CardTitle>En bref</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3">
            {brief.summary.map((line) => (
              <li key={line} className="flex gap-3 text-[1.0625rem] leading-snug @xl:text-lg">
                <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-pretty">{line}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <section aria-labelledby="marches">
        <div className="mb-3 flex items-baseline justify-between px-1 pt-2">
          <h2 id="marches" className="text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">Marchés</h2>
          {asOf && <p className="text-xs text-muted-foreground">Clôture du {fmtDayMonth(asOf)}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 @xl:gap-4 @4xl:grid-cols-4">
          {brief.markets.map((asset) => (
            <MarketCard key={asset.id} asset={asset} />
          ))}
        </div>
      </section>

      <div className="grid items-start gap-4 *:min-w-0 @xl:gap-5 @4xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mes positions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {brief.positions.map((asset) => (
                <PositionRow key={asset.id} asset={asset} />
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 @xl:gap-5">
          <Card>
            <CardHeader>
              <CardTitle>À surveiller aujourd&apos;hui</CardTitle>
            </CardHeader>
            <CardContent>
              {brief.watch.length ? (
                <ul className="flex flex-col gap-3">
                  {brief.watch.map((item) => {
                    const Icon = WATCH_ICON[item.kind];
                    return (
                      <li key={item.label} className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-primary">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="text-[0.9375rem] leading-snug">{item.label}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Rien de notable au calendrier.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actus</CardTitle>
            </CardHeader>
            <CardContent>
              {brief.news.length ? (
                <ol className="flex flex-col gap-4">
                  {brief.news.map((item, i) => (
                    <li key={item.url} className="flex gap-3">
                      <span className="num mt-0.5 w-4 shrink-0 text-sm text-muted-foreground">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-[0.9375rem] leading-snug text-pretty">{item.summary}</p>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <span className="truncate">
                            {item.source} · {item.category}
                          </span>
                          <ExternalLink className="size-3 shrink-0" aria-hidden />
                        </a>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune actualité récupérée ce matin.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {brief.meta.degraded.length > 0 && (
        <div className="flex gap-3 rounded-2xl border border-primary/25 bg-primary/8 p-4 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-medium">Brief partiel</p>
            <ul className="mt-1 text-muted-foreground">
              {brief.meta.degraded.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <footer className="px-1 pt-2 pb-4 text-xs leading-relaxed text-muted-foreground">
        <p>{brief.disclaimer}</p>
        <p className="mt-1">
          {brief.meta.ai ? `Rédigé avec ${AI_NAME[brief.meta.ai.provider] ?? brief.meta.ai.provider}` : "Résumé automatique, sans IA"}
          {" · chiffres issus des API de marché"}
        </p>
      </footer>
    </div>
    </div>
  );
}
