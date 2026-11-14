import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Maquette d'iPhone. Le contenu est rendu à 375 px de large puis réduit :
 * on voit donc la vraie interface, pas une capture d'écran.
 */
export function Phone({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative h-[600px] w-[292px] shrink-0 rounded-[3rem] border border-white/15 bg-[#0b0c0f] p-[9px] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9),inset_0_0_0_1px_rgb(255_255_255/0.04)]",
        className,
      )}
    >
      <div className="relative size-full overflow-hidden rounded-[2.5rem] bg-background">
        <div aria-hidden className="absolute top-2.5 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
        {/* inert : la maquette est décorative, on n'y navigue pas au clavier. */}
        <div inert className="pointer-events-none w-[375px] origin-top-left scale-[0.7307] px-4 pt-14 select-none">
          {children}
        </div>
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </div>
    </div>
  );
}
