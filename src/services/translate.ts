import type { Env } from "../types";
import { sha256Hex } from "../utils/sha256";
import {
  maxTokensForTextPurpose,
  openAiChatCompletionsUrl,
  openAiChatModel,
  openAiChatRequestHeaders
} from "./ai-config";

const DISCLAIMER_PHRASE = "This is not financial advice.";

export async function translateTexts(params: { env: Env; to: "en"; texts: string[] }): Promise<string[]> {
  const { env, to, texts } = params;
  if (to !== "en") {
    // Only English is supported for now.
    return texts;
  }

  if (!env.OPENAI_API_KEY) {
    // If OpenAI is not configured, return original Vietnamese.
    return texts;
  }

  const kv = env.CACHE;
  const cacheKeys = await Promise.all(
    texts.map(async (t) => {
      const normalized = t ?? "";
      const hash = await sha256Hex(normalized);
      return `translation:en:${hash}`;
    })
  );

  const cached: Array<string | null> = await Promise.all(
    cacheKeys.map(async (key) => {
      const val = await kv.get(key);
      return typeof val === "string" ? val : null;
    })
  );

  const missingIndices: number[] = [];
  const missingTexts: string[] = [];
  for (let i = 0; i < texts.length; i++) {
    if (!cached[i]) {
      missingIndices.push(i);
      missingTexts.push(texts[i] ?? "");
    }
  }

  const results = [...cached] as string[];
  if (missingTexts.length) {
    const translated = await translateBatchWithOpenAI(env, missingTexts);
    for (let j = 0; j < missingTexts.length; j++) {
      const original = missingTexts[j];
      const output = translated[j] ?? original;
      results[missingIndices[j]] = output;
    }

    // Cache after successful translation.
    const ttlSeconds = 60 * 60 * 24 * 7; // 7 days
    await Promise.all(
      missingTexts.map(async (_t, j) => {
        const i = missingIndices[j];
        const key = cacheKeys[i];
        const val = results[i];
        if (val) {
          await kv.put(key, val, { expirationTtl: ttlSeconds });
        }
      })
    );
  }

  return results;
}

async function translateBatchWithOpenAI(env: Env, texts: string[]): Promise<string[]> {
  const prepared = texts.map((t) => stripAndRememberDisclaimer(t));
  const mappingDisclaimer = texts.map((t) => hasDisclaimer(t));

  try {
    const response = await fetch(openAiChatCompletionsUrl(env), {
      method: "POST",
      headers: openAiChatRequestHeaders(env),
      body: JSON.stringify({
        model: openAiChatModel(env, "translate"),
        temperature: 0.2,
        max_tokens: maxTokensForTextPurpose("translate"),
        messages: [
          {
            role: "system",
            content:
              "You translate Vietnamese text to English accurately. Do not add new information. Keep names, numbers, and URLs unchanged. Output ONLY JSON."
          },
          {
            role: "user",
            content: `Translate this array of Vietnamese strings to English.\n\nReturn ONLY a JSON object: {"translations":[...]} where translations has the same length and order.\n\nInput: ${JSON.stringify(prepared)}`
          }
        ]
      })
    });

    if (!response.ok) {
      console.error("OpenAI translation error:", response.status, await response.text());
      return texts;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const translations = safeParseTranslations(raw);
    if (!translations || translations.length !== texts.length) {
      return texts;
    }

    // Re-attach disclaimer phrase exactly where needed.
    return translations.map((t, i) => (mappingDisclaimer[i] ? appendDisclaimer(t) : t));
  } catch (error) {
    console.error("OpenAI translation failed:", error);
    return texts;
  }
}

function safeParseTranslations(raw: string): string[] | null {
  // Try strict JSON parse first.
  try {
    const obj = JSON.parse(raw) as { translations?: unknown };
    if (Array.isArray(obj.translations) && obj.translations.every((x) => typeof x === "string")) {
      return obj.translations as string[];
    }
  } catch {
    // ignore
  }

  // Fallback: extract JSON block.
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]) as { translations?: unknown };
      if (Array.isArray(obj.translations) && obj.translations.every((x) => typeof x === "string")) {
        return obj.translations as string[];
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function hasDisclaimer(t: string): boolean {
  return t.includes(DISCLAIMER_PHRASE);
}

function stripAndRememberDisclaimer(t: string): string {
  return hasDisclaimer(t) ? t.replace(DISCLAIMER_PHRASE, "").trim() : t;
}

function appendDisclaimer(translated: string): string {
  const base = translated.trim();
  if (!base) return DISCLAIMER_PHRASE;
  return `${base} ${DISCLAIMER_PHRASE}`;
}

