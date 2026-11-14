import { BriefHeader, BriefView } from "@/components/brief/brief-view";
import { getLatestBrief } from "@/lib/data";

export default async function HomePage() {
  const brief = await getLatestBrief();
  return (
    <>
      <BriefHeader brief={brief} eyebrow="Le brief du matin" />
      <BriefView brief={brief} />
    </>
  );
}
