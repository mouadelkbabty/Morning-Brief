"use client";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { fmtDateLong, fmtDayMonth, fmtPct, trend } from "@/lib/brief/format";
import type { HistoryEntry } from "@/lib/data";

const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const monthOf = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

/** Toutes les façons d'écrire une date : 2026-11-13, 13/11/2026, vendredi 13 novembre 2026. */
function searchText(entry: HistoryEntry): string {
  const [y, m, d] = entry.date.split("-");
  return normalize([entry.date, `${d}/${m}/${y}`, fmtDayMonth(entry.date), fmtDateLong(entry.date), entry.headline].join(" "));
}

export function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  const [query, setQuery] = useState("");
  const indexed = useMemo(() => entries.map((entry) => ({ entry, text: searchText(entry) })), [entries]);
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const results = indexed.filter(({ text }) => words.every((w) => text.includes(w))).map(({ entry }) => entry);

  const groups = new Map<string, HistoryEntry[]>();
  for (const entry of results) {
    const month = monthOf(entry.date);
    groups.set(month, [...(groups.get(month) ?? []), entry]);
  }

  return (
    <div>
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une date : 13/11, novembre, vendredi…"
          aria-label="Rechercher un brief par date"
          className="pl-11"
        />
      </div>

      {results.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Aucun brief ne correspond à « {query} ».</p>
      ) : (
        [...groups].map(([month, items]) => (
          <section key={month} className="mb-8">
            <h2 className="mb-3 px-1 text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">{month}</h2>
            <ul className="glass divide-y overflow-hidden rounded-2xl">
              {items.map((entry) => (
                <li key={entry.date}>
                  <Link
                    href={`/brief/${entry.date}`}
                    className="flex items-center gap-3 p-4 transition-colors hover:bg-card-strong active:bg-card-strong sm:p-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium first-letter:uppercase">
                        <span className="first-letter:uppercase">{fmtDateLong(entry.date)}</span>
                        {entry.sample && <Badge variant="warning">Exemple</Badge>}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{entry.headline}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {entry.movers.map((m) => (
                          <Badge key={m.name} variant={trend(m.changePct)}>
                            <span className="font-normal opacity-80">{m.name}</span> {fmtPct(m.changePct)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
