import { errorMessage, request } from "./http";
import { parisTime } from "./time";
import type { Context, EarningsEvent } from "./types";

export interface EarningsResult {
  events: EarningsEvent[];
  /** Faux si le calendrier n'a pas pu être consulté (clé absente ou panne). */
  available: boolean;
}

/** Publications de résultats du jour (Finnhub, offre gratuite) pour les sociétés suivies. */
export async function fetchEarnings(ctx: Context, tracked: Record<string, string>): Promise<EarningsResult> {
  const token = ctx.env.FINNHUB_API_KEY;
  if (!token || !Object.keys(tracked).length) return { events: [], available: false };
  const today = parisTime(ctx.now).date;
  try {
    const params = new URLSearchParams({ from: today, to: today, token });
    const data = await (await request(ctx, `https://finnhub.io/api/v1/calendar/earnings?${params}`)).json();
    const rows: Array<{ symbol?: string; hour?: string }> = Array.isArray(data?.earningsCalendar) ? data.earningsCalendar : [];
    const events = rows
      .filter((row) => row.symbol && tracked[row.symbol])
      .map((row) => ({ symbol: row.symbol!, name: tracked[row.symbol!], hour: row.hour || null }));
    return { events, available: true };
  } catch (error) {
    ctx.log(`⚠ calendrier des résultats : ${errorMessage(error)}`);
    return { events: [], available: false };
  }
}

const HOURS: Record<string, string> = { bmo: "avant l'ouverture de Wall Street", amc: "après la clôture de Wall Street" };

export function earningsLabel(event: EarningsEvent): string {
  const when = event.hour && HOURS[event.hour] ? ` (${HOURS[event.hour]})` : "";
  return `Résultats de ${event.name}${when}`;
}
