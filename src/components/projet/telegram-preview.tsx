import { briefSections } from "@/lib/brief/telegram";
import type { Brief } from "@/lib/brief/types";

/** Le message Telegram tel qu'il est réellement envoyé, dans une bulle de conversation. */
export function TelegramPreview({ brief }: { brief: Brief }) {
  // Même HTML que celui envoyé à Telegram : tout le texte y est déjà échappé.
  const html = briefSections(brief).join("\n\n").replaceAll("\n", "<br/>");
  return (
    <div className="-mx-4 -mt-14 min-h-[840px] bg-[#0e1621] px-3 pt-14 pb-6">
      <div className="mb-3 flex items-center gap-3 border-b border-white/10 pb-3">
        <span className="grid size-10 place-items-center rounded-full bg-gradient-to-b from-[#ffd9a8] to-[#ff8a5b] text-lg">☀️</span>
        <div>
          <p className="text-[0.9375rem] font-semibold">Morning Brief</p>
          <p className="text-xs text-[#6c7883]">bot</p>
        </div>
      </div>
      <div
        className="rounded-2xl rounded-bl-md bg-[#182533] p-3.5 text-[0.875rem] leading-[1.45] [&_a]:text-[#6ab3f3] [&_b]:font-semibold [&_i]:text-white/70"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
