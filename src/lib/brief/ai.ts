import { z } from "zod";
import { errorMessage, request } from "./http";
import { watchKinds, type Context } from "./types";

/** Ce que l'IA rédige. Les chiffres, sources et liens n'en font pas partie. */
export const aiOutputSchema = z.object({
  summary: z.array(z.string().min(1)).min(1),
  news: z.array(z.object({ id: z.string(), summary: z.string().min(1) })).default([]),
  watch: z.array(z.object({ label: z.string().min(1), kind: z.enum(watchKinds).catch("other") })).default([]),
});
export type AiOutput = z.infer<typeof aiOutputSchema>;

export interface AiProvider {
  id: string;
  /** Point d'entrée au format OpenAI (…/chat/completions). */
  url: string;
  apiKey: string;
  model: string;
}

/**
 * Chaîne de bascule : Gemini, puis Groq, puis chaque modèle gratuit OpenRouter.
 * Un fournisseur sans clé est simplement absent de la chaîne.
 */
export function aiProviders(env: Record<string, string | undefined>): AiProvider[] {
  const chain: AiProvider[] = [];
  if (env.GEMINI_API_KEY) {
    chain.push({
      id: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL || "gemini-flash-latest",
    });
  }
  if (env.GROQ_API_KEY) {
    chain.push({
      id: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: env.GROQ_API_KEY,
      model: env.GROQ_MODEL || "llama-3.3-70b-versatile",
    });
  }
  if (env.OPENROUTER_API_KEY) {
    const models = (env.OPENROUTER_MODELS || "meta-llama/llama-3.3-70b-instruct:free,google/gemma-3-27b-it:free")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    for (const model of models) {
      chain.push({ id: "openrouter", url: "https://openrouter.ai/api/v1/chat/completions", apiKey: env.OPENROUTER_API_KEY, model });
    }
  }
  return chain;
}

/** Extrait l'objet JSON d'une réponse, même entourée de ```json … ``` ou de texte. */
export function extractJson(content: string): unknown {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) throw new SyntaxError("pas d'objet JSON dans la réponse");
  return JSON.parse(content.slice(start, end + 1));
}

async function complete(ctx: Context, provider: AiProvider, system: string, user: string): Promise<string> {
  const res = await request(ctx, provider.url, {
    // Une seule nouvelle tentative par fournisseur : au-delà, mieux vaut basculer.
    retries: 1,
    timeoutMs: 45_000,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    },
  });
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("réponse vide");
  return content;
}

export interface AiResult<T> {
  output: T;
  provider: string;
  model: string;
}

/**
 * Interroge les fournisseurs dans l'ordre et renvoie la première réponse que
 * `validate` accepte. Limite atteinte, panne, délai dépassé, JSON invalide ou
 * contenu refusé par `validate` : dans tous les cas on passe au suivant.
 * Renvoie null si aucun fournisseur n'a abouti.
 */
export async function generateWithFallback<T>(
  ctx: Context,
  providers: AiProvider[],
  system: string,
  user: string,
  validate: (raw: unknown) => T,
): Promise<AiResult<T> | null> {
  for (const provider of providers) {
    try {
      const content = await complete(ctx, provider, system, user);
      const output = validate(extractJson(content));
      ctx.log(`✓ IA : ${provider.id} (${provider.model})`);
      return { output, provider: provider.id, model: provider.model };
    } catch (error) {
      ctx.log(`⚠ IA ${provider.id} (${provider.model}) : ${errorMessage(error)} → fournisseur suivant`);
    }
  }
  return null;
}
