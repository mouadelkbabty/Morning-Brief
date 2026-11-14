import { ArrowRight, Bot, Braces, CalendarClock, Coins, Database, ListChecks, Rss, Send, ShieldCheck, Smartphone, Timer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { siGithub } from "simple-icons";
import { BriefHeader, BriefView } from "@/components/brief/brief-view";
import { HistoryList } from "@/components/brief/history-list";
import { Phone } from "@/components/projet/phone";
import { DrawLine, Float, MotionRoot, Reveal } from "@/components/projet/reveal";
import { Stack } from "@/components/projet/stack";
import { TelegramPreview } from "@/components/projet/telegram-preview";
import { buttonVariants } from "@/components/ui/button";
import { readSampleBrief } from "@/lib/brief/store";
import { getHistory } from "@/lib/data";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Le projet",
  description: "Comment Morning Brief fabrique chaque matin un brief bourse fiable, gratuit, envoyé à 8h sur Telegram.",
};

const STEPS = [
  { icon: CalendarClock, time: "7h50", title: "Le réveil", text: "GitHub Actions lance le script chaque jour ouvré, calé sur l'heure de Paris, été comme hiver." },
  { icon: Database, time: "Données", title: "La collecte", text: "Cours de clôture via des API officielles, actualités via des flux RSS, résultats du jour." },
  { icon: Bot, time: "IA", title: "La rédaction", text: "Gemini résume et trie. S'il atteint sa limite, Groq puis OpenRouter prennent le relais." },
  { icon: Send, time: "8h00", title: "L'envoi", text: "Le brief part sur Telegram et s'enregistre dans le dépôt, ce qui met la web app à jour." },
];

const FACTS = [
  { value: "0 €", label: "par mois, tout compris" },
  { value: "8h00", label: "heure de Paris, jours ouvrés" },
  { value: "3", label: "IA en relais automatique" },
  { value: "4", label: "sources de cours en secours" },
];

const REASONS = [
  {
    icon: Timer,
    title: "Deux minutes, pas vingt onglets",
    text: "Avant l'ouverture, je veux savoir ce qui a bougé et ce qui arrive, sans ouvrir cinq sites ni faire défiler un fil d'actualité.",
  },
  {
    icon: ShieldCheck,
    title: "Une IA qui ne touche pas aux chiffres",
    text: "Les cours viennent des API et sont calculés par le code. L'IA rédige le résumé et choisit les actus, mais ne peut inventer ni une source ni un lien.",
  },
  {
    icon: Coins,
    title: "Gratuit, et fait pour durer",
    text: "Uniquement des offres gratuites. Si une source ou une IA tombe, une autre prend le relais, et le brief part quand même.",
  },
];

const DETAILS = [
  { icon: Rss, text: "Chaque actualité renvoie vers son article d'origine." },
  { icon: Braces, text: "Chaque brief est un fichier JSON versionné, relisible à tout moment." },
  { icon: ListChecks, text: "Une suite de tests couvre la génération, la bascule IA et le format Telegram." },
  { icon: Smartphone, text: "La web app s'installe sur l'écran d'accueil de l'iPhone, en plein écran." },
];

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <Reveal className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
      <p className="mb-3 text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="text-3xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-[2.75rem]">{title}</h2>
      {text && <p className="mt-4 text-lg leading-relaxed text-pretty text-muted-foreground">{text}</p>}
    </Reveal>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="fill-current" aria-hidden>
      <path d={siGithub.path} />
    </svg>
  );
}

export default async function ProjectPage() {
  const sample = readSampleBrief();
  const history = await getHistory();

  return (
    <MotionRoot>
      <div className="flex flex-col gap-24 sm:gap-36">
        {/* ——— Hero ——— */}
        <section className="grid items-center gap-12 pt-6 sm:pt-10 lg:grid-cols-[1.1fr_auto] lg:gap-16">
          <div className="text-center lg:text-left">
            <Reveal>
              <p className="glass mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-up" aria-hidden />
                Chaque jour ouvré à 8h00
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-7xl">
                La bourse, résumée <span className="text-gradient">avant le café.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground sm:text-xl lg:mx-0">
                Morning Brief rassemble les marchés, mes positions, les actus qui comptent et l&apos;agenda du jour, puis me
                l&apos;envoie sur Telegram. Automatique, vérifiable, gratuit.
              </p>
            </Reveal>
            <Reveal delay={0.18} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/" className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full sm:w-auto")}>
                Voir le brief du jour
                <ArrowRight aria-hidden />
              </Link>
              <a href={SITE.githubUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}>
                <GithubIcon />
                Code source
              </a>
            </Reveal>
          </div>
          <Reveal delay={0.2} y={40} className="flex justify-center">
            <Float>
              <Phone label="Aperçu de l'app : le brief du jour sur iPhone">
                <BriefHeader brief={sample} eyebrow="Le brief du matin" />
                <BriefView brief={sample} />
              </Phone>
            </Float>
          </Reveal>
        </section>

        {/* ——— Chiffres ——— */}
        <Reveal>
          <dl className="glass grid grid-cols-2 gap-y-8 rounded-2xl p-6 sm:p-8 lg:grid-cols-4">
            {FACTS.map((fact) => (
              <div key={fact.label} className="flex flex-col-reverse gap-1 text-center">
                <dt className="text-sm text-muted-foreground">{fact.label}</dt>
                <dd className="num text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        {/* ——— Comment ça marche ——— */}
        <section aria-labelledby="fonctionnement">
          <SectionTitle
            eyebrow="Comment ça marche"
            title="Des données au message, en quatre étapes"
            text="Tout se passe en une dizaine de minutes, sans serveur à maintenir."
          />
          <h2 id="fonctionnement" className="sr-only">Comment ça marche</h2>
          <div className="relative">
            <DrawLine className="absolute top-0 bottom-0 left-[1.6875rem] w-px origin-top bg-gradient-to-b from-primary/70 via-primary/30 to-transparent lg:top-[1.6875rem] lg:right-[12%] lg:bottom-auto lg:left-[12%] lg:h-px lg:w-auto lg:origin-left lg:bg-gradient-to-r" />
            <ol className="relative grid gap-8 lg:grid-cols-4 lg:gap-5">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <Reveal delay={i * 0.1} className="flex gap-5 lg:flex-col lg:items-center lg:text-center">
                    <span className="grid size-[3.375rem] shrink-0 place-items-center rounded-full border bg-[#101116] text-primary shadow-[0_0_0_6px_var(--background)]">
                      <step.icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <p className="num text-xs font-medium tracking-wide text-primary uppercase">{step.time}</p>
                      <h3 className="mt-1 text-lg font-semibold tracking-tight">{step.title}</h3>
                      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground">{step.text}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
          <Reveal className="mt-12 grid gap-3 sm:grid-cols-2">
            <div className="glass rounded-2xl p-5">
              <p className="text-sm font-medium">Si une IA atteint sa limite</p>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="rounded-full bg-primary/15 px-3 py-1 font-medium text-primary">Gemini</span>
                <ArrowRight className="size-4" aria-hidden />
                <span className="rounded-full bg-muted px-3 py-1">Groq</span>
                <ArrowRight className="size-4" aria-hidden />
                <span className="rounded-full bg-muted px-3 py-1">OpenRouter</span>
                <ArrowRight className="size-4" aria-hidden />
                <span className="rounded-full bg-muted px-3 py-1">Résumé sans IA</span>
              </p>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="text-sm font-medium">Si une source de cours tombe</p>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="rounded-full bg-primary/15 px-3 py-1 font-medium text-primary">Stooq</span>
                <ArrowRight className="size-4" aria-hidden />
                <span className="rounded-full bg-muted px-3 py-1">Twelve Data</span>
                <ArrowRight className="size-4" aria-hidden />
                <span className="rounded-full bg-muted px-3 py-1">Alpha Vantage</span>
                <ArrowRight className="size-4" aria-hidden />
                <span className="rounded-full bg-muted px-3 py-1">Finnhub</span>
              </p>
            </div>
          </Reveal>
        </section>

        {/* ——— Aperçus ——— */}
        <section aria-labelledby="apercus">
          <SectionTitle eyebrow="Aperçus" title="Un message le matin, une app pour le reste" text="Les trois écrans ci-dessous sont l'interface réelle, affichée avec un brief d'exemple." />
          <h2 id="apercus" className="sr-only">Aperçus</h2>
          <div className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-6 sm:mx-0 sm:justify-center sm:overflow-visible sm:px-0 lg:gap-10">
            {[
              { caption: "Sur Telegram, à 8h00", node: <TelegramPreview brief={sample} /> },
              {
                caption: "Le brief du jour",
                node: (
                  <>
                    <BriefHeader brief={sample} eyebrow="Le brief du matin" />
                    <BriefView brief={sample} />
                  </>
                ),
              },
              {
                caption: "L'historique",
                node: (
                  <>
                    <header className="mb-6">
                      <p className="mb-2 text-sm font-medium text-primary">Archives</p>
                      <p className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.035em]">Historique</p>
                    </header>
                    <HistoryList entries={history} />
                  </>
                ),
              },
            ].map((screen, i) => (
              <Reveal key={screen.caption} delay={i * 0.1} y={30} className={cn("flex snap-center flex-col items-center gap-4", i === 2 && "sm:hidden lg:flex")}>
                <Phone label={`Aperçu : ${screen.caption}`}>{screen.node}</Phone>
                <p className="text-sm text-muted-foreground">{screen.caption}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ——— Pourquoi ——— */}
        <section aria-labelledby="pourquoi">
          <SectionTitle eyebrow="Pourquoi ce projet" title="Un outil que j'ouvre vraiment chaque matin" />
          <h2 id="pourquoi" className="sr-only">Pourquoi ce projet</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {REASONS.map((reason, i) => (
              <Reveal key={reason.title} delay={i * 0.08} className="glass rounded-2xl p-6">
                <span className="mb-5 grid size-11 place-items-center rounded-xl bg-primary/15 text-primary">
                  <reason.icon className="size-5" aria-hidden />
                </span>
                <h3 className="text-lg font-semibold tracking-tight">{reason.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground">{reason.text}</p>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <ul className="mt-4 grid gap-x-8 gap-y-3 rounded-2xl border p-6 sm:grid-cols-2">
              {DETAILS.map((detail) => (
                <li key={detail.text} className="flex items-start gap-3 text-[0.9375rem] text-muted-foreground">
                  <detail.icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {detail.text}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* ——— Stack ——— */}
        <section aria-labelledby="stack">
          <SectionTitle eyebrow="Stack technique" title="Des outils simples, bien assemblés" />
          <h2 id="stack" className="sr-only">Stack technique</h2>
          <Reveal>
            <Stack />
          </Reveal>
        </section>

        {/* ——— Appel final ——— */}
        <Reveal>
          <section className="glass relative overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:py-20">
            <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 size-80 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
            <h2 className="relative text-3xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">Le code est ouvert. Servez-vous.</h2>
            <p className="relative mx-auto mt-4 max-w-lg text-lg text-pretty text-muted-foreground">
              Le dépôt contient tout : le générateur, le bot, la web app et un guide d&apos;installation pas à pas.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href={SITE.githubUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
                <GithubIcon />
                Voir sur GitHub
              </a>
              <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}>
                Ouvrir l&apos;app
              </Link>
            </div>
            <p className="relative mt-10 text-xs text-muted-foreground">{sample.disclaimer}</p>
          </section>
        </Reveal>
      </div>
    </MotionRoot>
  );
}
