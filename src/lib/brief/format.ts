// Mise en forme française des nombres et des dates, commune à Telegram et à la web app.

const pctFormat = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

/** +0,42 % */
export function fmtPct(value: number | null): string {
  if (value == null) return "—";
  return `${pctFormat.format(value).replace("-", "−")} %`;
}

/** 8 123,45 pts · 142,30 € · 135,20 $ */
export function fmtPrice(value: number | null, currency: string): string {
  if (value == null) return "—";
  if (currency === "pts") {
    return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

const asDate = (date: string) => new Date(`${date}T12:00:00Z`);

/** vendredi 14 novembre 2026 */
export function fmtDateLong(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(asDate(date));
}

/** ven. 14 nov. */
export function fmtDateShort(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(asDate(date));
}

/** 14/11 */
export function fmtDayMonth(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(asDate(date));
}

export type Trend = "up" | "down" | "flat";

export function trend(value: number | null): Trend {
  if (value == null || value === 0) return "flat";
  return value > 0 ? "up" : "down";
}
