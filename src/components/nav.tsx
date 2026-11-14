"use client";

import { History, Sparkles, Sunrise } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Brief", icon: Sunrise, match: (p: string) => p === "/" || p.startsWith("/brief") },
  { href: "/historique", label: "Historique", icon: History, match: (p: string) => p.startsWith("/historique") },
  { href: "/projet", label: "Projet", icon: Sparkles, match: (p: string) => p.startsWith("/projet") },
] as const;

/** Barre du haut sur grand écran, barre d'onglets en verre en bas sur mobile. */
export function Nav() {
  const pathname = usePathname();
  return (
    <>
      <header className="sticky top-0 z-40 hidden border-b bg-background/70 backdrop-blur-xl sm:block">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-[0.9375rem] font-semibold tracking-tight">
            <Sunrise className="size-5 text-primary" aria-hidden />
            Morning Brief
          </Link>
          <nav className="flex items-center gap-1" aria-label="Navigation principale">
            {ITEMS.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm transition-colors",
                    active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden"
      >
        <div className="glass mx-auto flex max-w-sm items-stretch justify-around rounded-full p-1.5">
          {ITEMS.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[0.6875rem] font-medium transition-[background-color,color,transform] duration-150 active:scale-95",
                  active ? "bg-card-strong text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "text-primary")} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
