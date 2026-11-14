import {
  siFramer,
  siGithubactions,
  siGooglegemini,
  siNextdotjs,
  siOpenrouter,
  siShadcnui,
  siTailwindcss,
  siTelegram,
  siTypescript,
  siVercel,
  siVitest,
  type SimpleIcon,
} from "simple-icons";

interface Tech {
  name: string;
  role: string;
  icon?: SimpleIcon;
}

const STACK: Tech[] = [
  { name: "Next.js", role: "Web app, App Router", icon: siNextdotjs },
  { name: "TypeScript", role: "Tout le code", icon: siTypescript },
  { name: "Tailwind CSS", role: "Styles", icon: siTailwindcss },
  { name: "shadcn/ui", role: "Composants", icon: siShadcnui },
  { name: "Motion", role: "Animations", icon: siFramer },
  { name: "GitHub Actions", role: "Planification", icon: siGithubactions },
  { name: "Vercel", role: "Hébergement", icon: siVercel },
  { name: "Telegram", role: "Bot et envoi", icon: siTelegram },
  { name: "Gemini", role: "IA principale", icon: siGooglegemini },
  { name: "Groq", role: "IA de secours" },
  { name: "OpenRouter", role: "IA de secours", icon: siOpenrouter },
  { name: "Vitest", role: "Tests", icon: siVitest },
];

export function Stack() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {STACK.map((tech) => (
        <li key={tech.name} className="glass flex items-center gap-3 rounded-2xl p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
            {tech.icon ? (
              <svg viewBox="0 0 24 24" className="size-5 fill-foreground" aria-hidden>
                <path d={tech.icon.path} />
              </svg>
            ) : (
              <span aria-hidden className="text-sm font-semibold">{tech.name[0]}</span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{tech.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{tech.role}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
