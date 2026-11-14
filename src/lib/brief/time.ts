// L'heure de référence est toujours celle de Paris, quelle que soit la machine
// (GitHub Actions tourne en UTC). Intl gère seul l'heure d'été et d'hiver.
const PARIS = "Europe/Paris";

export interface ParisTime {
  /** AAAA-MM-JJ */
  date: string;
  /** 1 = lundi … 7 = dimanche */
  weekday: number;
  hour: number;
  minute: number;
  second: number;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function parisTime(now: Date): ParisTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PARIS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: WEEKDAYS.indexOf(get("weekday")) + 1,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

/** Fenêtre d'exécution planifiée : de 7h30 à 9h30, heure de Paris. */
const WINDOW_START = 7 * 60 + 30;
const WINDOW_END = 9 * 60 + 30;

export type ScheduleDecision = { run: true } | { run: false; reason: string };

/**
 * Deux crons UTC déclenchent le script (05:50 et 06:50). Selon la saison, un
 * seul tombe vers 7h50 à Paris : l'autre est hors fenêtre, ou trouve le brief
 * du jour déjà généré. Résultat : exactement un brief par jour ouvré.
 */
export function scheduleDecision(now: Date, alreadyGenerated: boolean): ScheduleDecision {
  const t = parisTime(now);
  if (t.weekday > 5) return { run: false, reason: "week-end à Paris" };
  const minutes = t.hour * 60 + t.minute;
  if (minutes < WINDOW_START || minutes >= WINDOW_END) {
    return { run: false, reason: `hors fenêtre 7h30–9h30 (il est ${pad(t.hour)}h${pad(t.minute)} à Paris)` };
  }
  if (alreadyGenerated) return { run: false, reason: `le brief du ${t.date} existe déjà` };
  return { run: true };
}

/** Millisecondes à attendre pour atteindre 8h00 pile à Paris (0 si déjà passé). */
export function msUntilEight(now: Date): number {
  const t = parisTime(now);
  const seconds = t.hour * 3600 + t.minute * 60 + t.second;
  const remaining = 8 * 3600 - seconds;
  return remaining > 0 ? remaining * 1000 - now.getMilliseconds() : 0;
}

/** Décale une date AAAA-MM-JJ de `days` jours. */
export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const pad = (n: number) => String(n).padStart(2, "0");
