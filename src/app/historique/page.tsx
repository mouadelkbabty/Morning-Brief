import type { Metadata } from "next";
import { HistoryList } from "@/components/brief/history-list";
import { getHistory } from "@/lib/data";

export const metadata: Metadata = { title: "Historique" };

export default async function HistoryPage() {
  const entries = await getHistory();
  return (
    <>
      <header className="mb-6 sm:mb-8">
        <p className="mb-2 text-sm font-medium text-primary">Archives</p>
        <h1 className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.035em] sm:text-5xl">Historique</h1>
      </header>
      <HistoryList entries={entries} />
    </>
  );
}
