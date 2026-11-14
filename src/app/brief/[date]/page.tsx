import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefHeader, BriefView } from "@/components/brief/brief-view";
import { fmtDateLong } from "@/lib/brief/format";
import { getBrief, getBriefDates } from "@/lib/data";

export async function generateStaticParams() {
  return (await getBriefDates()).map((date) => ({ date }));
}

export async function generateMetadata({ params }: PageProps<"/brief/[date]">): Promise<Metadata> {
  const { date } = await params;
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? { title: `Brief du ${fmtDateLong(date)}` } : {};
}

export default async function BriefPage({ params }: PageProps<"/brief/[date]">) {
  const { date } = await params;
  const brief = await getBrief(date);
  if (!brief) notFound();
  return (
    <>
      <Link href="/historique" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden />
        Historique
      </Link>
      <BriefHeader brief={brief} eyebrow="Archive" />
      <BriefView brief={brief} />
    </>
  );
}
