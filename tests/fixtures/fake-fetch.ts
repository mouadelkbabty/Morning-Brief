// Faux réseau pour les tests et pour `npm run brief:demo` : chaque API renvoie
// une réponse au format réel, avec des valeurs FICTIVES mais stables.
import { parisTime, shiftDate } from "../../src/lib/brief/time";
import type { FeedsConfig, FetchLike } from "../../src/lib/brief/types";

/** Flux d'exemple : sources volontairement génériques, rien n'est attribué à un vrai média. */
export const FIXTURE_FEEDS: FeedsConfig = {
  maxAgeHours: 36,
  feeds: [
    { name: "Banque centrale (exemple)", url: "https://rss.example.com/taux.xml", category: "taux" },
    { name: "Éco Matin (exemple)", url: "https://rss.example.com/macro.xml", category: "macro" },
    { name: "Tech Hebdo (exemple)", url: "https://rss.example.com/tech.atom", category: "tech/IA" },
  ],
};

const BASE: Record<string, number> = {
  "^cac": 8120, "^spx": 6890, "^ndx": 25140, "urth.us": 182.4, "nvda.us": 188.2, "meta.us": 712.5,
  DCAM: 5.62, PE500: 51.3, PUST: 96.8, SPY: 688, QQQ: 612, URTH: 182.4, NVDA: 188.2, META: 712.5,
  "DCAM.PAR": 5.62, "PE500.PAR": 51.3, "PUST.PAR": 96.8,
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967295;
}

/** Douze séances fictives se terminant la veille de `today` (week-ends exclus). */
export function fakeCloses(symbol: string, today: string): Array<{ date: string; close: number }> {
  const dates: string[] = [];
  for (let d = shiftDate(today, -1); dates.length < 12; d = shiftDate(d, -1)) {
    const day = new Date(`${d}T12:00:00Z`).getUTCDay();
    if (day !== 0 && day !== 6) dates.unshift(d);
  }
  let price = BASE[symbol] ?? 100;
  return dates.map((date, i) => {
    price *= 1 + (hash(`${symbol}:${i}`) - 0.46) * 0.022;
    return { date, close: Math.round(price * 100) / 100 };
  });
}

const rssItem = (title: string, description: string, link: string, date: Date) =>
  `<item><title><![CDATA[${title}]]></title><link>${link}</link><description><![CDATA[${description}]]></description><pubDate>${date.toUTCString()}</pubDate></item>`;

function feedXml(url: string, now: Date): string {
  const ago = (hours: number) => new Date(now.getTime() - hours * 3_600_000);
  if (url.includes("taux")) {
    return `<?xml version="1.0"?><rss version="2.0"><channel><title>Taux</title>
      ${rssItem("La banque centrale maintient ses taux directeurs inchangés", "Le conseil juge l'inflation proche de sa cible et reste dépendant des données.", "https://rss.example.com/a/taux-inchanges", ago(14))}
      ${rssItem("Discours du gouverneur attendu aujourd'hui à 15h", "Les marchés guettent des indices sur le calendrier des prochaines décisions.", "https://rss.example.com/a/discours", ago(3))}
      ${rssItem("Rapport annuel 2019", "Archive.", "https://rss.example.com/a/archive", ago(24 * 400))}
    </channel></rss>`;
  }
  if (url.includes("macro")) {
    return `<?xml version="1.0"?><rss version="2.0"><channel><title>Macro</title>
      ${rssItem("L'inflation en zone euro ralentit plus que prévu", "La hausse des prix recule sur un an, portée par l'énergie.", "https://rss.example.com/a/inflation", ago(20))}
      ${rssItem("Wall Street termine en hausse, portée par la tech", "Les grands indices américains progressent pour la troisième séance d'affilée.", "https://rss.example.com/a/wall-street", ago(9))}
      ${rssItem("Wall Street termine en hausse, portée par la tech", "Doublon volontaire.", "https://rss.example.com/a/wall-street-bis", ago(8))}
    </channel></rss>`;
  }
  return `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Tech</title>
    <entry><title>Un fabricant de puces relève ses prévisions grâce à la demande en IA</title><link rel="alternate" href="https://rss.example.com/a/puces"/><summary>Les commandes de centres de données dépassent les attentes.</summary><updated>${ago(11).toISOString()}</updated></entry>
    <entry><title>Un géant des réseaux sociaux augmente ses investissements dans l&#39;IA</title><link href="https://rss.example.com/a/capex"/><summary>Le groupe prévoit des dépenses d&#39;infrastructure en forte hausse.</summary><updated>${ago(6).toISOString()}</updated></entry>
  </feed>`;
}

const SUMMARIES: Record<string, string> = {
  "La banque centrale maintient ses taux directeurs inchangés": "La banque centrale laisse ses taux inchangés et dit rester guidée par les données.",
  "Discours du gouverneur attendu aujourd'hui à 15h": "Le gouverneur s'exprime aujourd'hui à 15h, les marchés attendent des indices sur la suite.",
  "L'inflation en zone euro ralentit plus que prévu": "L'inflation en zone euro ralentit plus que prévu, tirée par l'énergie.",
  "Wall Street termine en hausse, portée par la tech": "Wall Street enchaîne une troisième séance de hausse grâce aux valeurs technologiques.",
  "Un fabricant de puces relève ses prévisions grâce à la demande en IA": "Un fabricant de puces relève ses prévisions, porté par la demande des centres de données IA.",
  "Un géant des réseaux sociaux augmente ses investissements dans l'IA": "Un géant des réseaux sociaux va nettement augmenter ses dépenses d'infrastructure IA.",
};

/** Réponse d'un faux modèle : il choisit parmi les actualités réellement reçues. */
export function fakeCompletion(body: string): string {
  const user = JSON.parse(JSON.parse(body).messages[1].content);
  const news = (user.actualites as Array<{ id: string; titre: string }>).slice(0, 4);
  return JSON.stringify({
    summary: [
      "Séance positive hier à Wall Street, tirée par les valeurs technologiques.",
      "La banque centrale laisse ses taux inchangés, sans surprise pour les marchés.",
      "L'inflation en zone euro ralentit plus que prévu.",
      "La demande en puces pour l'IA reste le moteur du secteur.",
    ],
    news: news.map((n) => ({ id: n.id, summary: SUMMARIES[n.titre] ?? n.titre })),
    watch: [{ label: "Discours du gouverneur de la banque centrale à 15h", kind: "central_bank" }],
  });
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

export interface FakeFetchOptions {
  now: Date;
  /** Permet à un test de simuler une panne : renvoyer une Response, ou lever une erreur. */
  intercept?: (url: string, init?: RequestInit) => Response | undefined;
}

export interface FakeFetch extends FetchLike {
  calls: Array<{ url: string; init?: RequestInit }>;
}

export function createFakeFetch({ now, intercept }: FakeFetchOptions): FakeFetch {
  const today = parisTime(now).date;
  const fake = (async (url: string, init?: RequestInit) => {
    fake.calls.push({ url, init });
    const intercepted = intercept?.(url, init);
    if (intercepted) return intercepted;
    const u = new URL(url);

    if (u.hostname === "stooq.com") {
      const symbol = u.searchParams.get("s") ?? "";
      if (!(symbol in BASE)) return new Response("No data");
      const rows = fakeCloses(symbol, today).map((c) => `${c.date},${c.close},${c.close},${c.close},${c.close},1000`);
      return new Response(`Date,Open,High,Low,Close,Volume\n${rows.join("\n")}\n`);
    }
    if (u.hostname === "api.twelvedata.com") {
      const symbol = u.searchParams.get("symbol") ?? "";
      if (!(symbol in BASE)) return json({ code: 404, status: "error", message: "symbol not found" });
      const values = fakeCloses(symbol, today).reverse().map((c) => ({ datetime: c.date, close: String(c.close) }));
      return json({ status: "ok", values });
    }
    if (u.hostname === "www.alphavantage.co") {
      const symbol = u.searchParams.get("symbol") ?? "";
      if (!(symbol in BASE)) return json({ "Error Message": "Invalid API call." });
      const series = Object.fromEntries(fakeCloses(symbol, today).map((c) => [c.date, { "4. close": String(c.close) }]));
      return json({ "Time Series (Daily)": series });
    }
    if (u.hostname === "finnhub.io" && u.pathname.endsWith("/calendar/earnings")) {
      return json({ earningsCalendar: [{ symbol: "NVDA", hour: "amc" }, { symbol: "ZZZZ", hour: "bmo" }] });
    }
    if (u.hostname === "finnhub.io" && u.pathname.endsWith("/quote")) {
      const closes = fakeCloses(u.searchParams.get("symbol") ?? "", today);
      return json({ c: closes.at(-1)!.close, pc: closes.at(-2)!.close, t: Math.floor(now.getTime() / 1000) });
    }
    if (u.hostname === "rss.example.com") return new Response(feedXml(url, now));
    if (u.pathname.endsWith("/chat/completions")) {
      return json({ choices: [{ message: { role: "assistant", content: fakeCompletion(String(init?.body)) } }] });
    }
    if (u.hostname === "api.telegram.org") return json({ ok: true, result: {} });
    return new Response("not found", { status: 404 });
  }) as FakeFetch;
  fake.calls = [];
  return fake;
}

/** Clés factices : toutes les sources et tous les fournisseurs IA sont « configurés ». */
export const FIXTURE_ENV = {
  GEMINI_API_KEY: "fake-gemini",
  GROQ_API_KEY: "fake-groq",
  OPENROUTER_API_KEY: "fake-openrouter",
  TWELVEDATA_API_KEY: "fake-twelvedata",
  ALPHAVANTAGE_API_KEY: "fake-alphavantage",
  FINNHUB_API_KEY: "fake-finnhub",
  TELEGRAM_BOT_TOKEN: "123:fake-token",
  TELEGRAM_CHAT_ID: "42",
};
