import type { Env, StoredArticle } from "../types";
import { truncate } from "../utils/text";
import {
  maxTokensForTextPurpose,
  openAiChatCompletionsUrl,
  openAiChatModel,
  openAiChatRequestHeaders,
  textInferenceOrder,
  workersAiGatewayOptions,
  workersAiTextModel
} from "./ai-config";
import {
  buildArticleTranslationCacheKey,
  normalizeEnglishArticleTranslation,
  type EnglishArticleTranslation
} from "./article-translation-shape";

const TRANSLATION_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function purgeArticleTranslationCachesForUrls(env: Env, articleUrls: string[]): Promise<number> {
  let n = 0;
  for (const url of articleUrls) {
    await env.CACHE.delete(buildArticleTranslationCacheKey(url));
    n += 1;
  }
  return n;
}

export async function getOrCreateEnglishArticleTranslation(
  env: Env,
  article: Pick<StoredArticle, "title" | "sourceName" | "summaryVi" | "snippet" | "url">,
  aiAnalysis?: string | null
): Promise<EnglishArticleTranslation> {
  const key = buildArticleTranslationCacheKey(article.url);
  const rawJson = await env.CACHE.get(key, "json");
  const cached = normalizeEnglishArticleTranslation(rawJson);
  if (cached) return cached;
  if (rawJson != null && rawJson !== "") {
    await env.CACHE.delete(key);
  }

  const translated = await translateArticleForForeignInvestors(env, article, aiAnalysis);
  await env.CACHE.put(key, JSON.stringify(translated), { expirationTtl: TRANSLATION_TTL_SECONDS });
  return translated;
}

async function translateArticleForForeignInvestors(
  env: Env,
  article: Pick<StoredArticle, "title" | "sourceName" | "summaryVi" | "snippet" | "url">,
  aiAnalysis?: string | null
): Promise<EnglishArticleTranslation> {
  const prompt = [
    "The INPUT is Vietnamese market news plus optional Vietnamese AI bullets.",
    "Translate and rewrite entirely into ENGLISH only (no Vietnamese words, titles, diacritics, or bilingual lines).",
    "Return STRICT JSON ONLY with keys: title, summary, analysis, sourceName.",
    "\"sourceName\": translate/source label in English (e.g. \"Vietstock\"), not verbatim Vietnamese.",
    "summary: tight English synopsis. analysis: 3-6 short English bullets (prefix each with \"• \" internally or plain lines).",
    "Keep it concise, neutral, useful for foreigners scanning Vietnam equities. Do not invent facts.",
    "No buy/sell recommendations.",
    `Source (VI): ${article.sourceName}`,
    `Title (VI): ${article.title}`,
    `Summary (VI): ${truncate(article.summaryVi ?? "", 900)}`,
    `Excerpt (VI): ${truncate(article.snippet ?? "", 1400)}`,
    aiAnalysis ? `Vietnamese AI analysis (VI): ${truncate(aiAnalysis, 1400)}` : ""
  ].join("\n");

  const systemContent =
    "You are an editor translating Vietnam equity news for English-only readers. Every JSON string value MUST be English. Invalid if any Vietnamese remains. Output only valid JSON.";

  const tryWorkers = async (): Promise<EnglishArticleTranslation | null> => {
    if (!env.AI) return null;
    try {
      const res = await env.AI.run(
        workersAiTextModel(env, "translate"),
        {
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: prompt }
          ],
          max_tokens: maxTokensForTextPurpose("translate")
        },
        workersAiGatewayOptions(env)
      );
      const text =
        (res as { response?: string; result?: { response?: string } })?.response ??
        (res as { result?: { response?: string } })?.result?.response ??
        (res as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content;
      return parseTranslationText(text);
    } catch (error) {
      console.error("Workers AI article translation failed:", error);
      return null;
    }
  };

  const tryOpenAi = async (): Promise<EnglishArticleTranslation | null> => {
    if (!env.OPENAI_API_KEY) return null;
    try {
      const response = await fetch(openAiChatCompletionsUrl(env), {
        method: "POST",
        headers: openAiChatRequestHeaders(env),
        body: JSON.stringify({
          model: openAiChatModel(env, "translate"),
          temperature: 0.1,
          max_tokens: maxTokensForTextPurpose("translate"),
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: prompt }
          ]
        })
      });
      if (!response.ok) {
        console.error("OpenAI translation response error:", response.status, await response.text());
        return null;
      }
      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return parseTranslationText(data.choices?.[0]?.message?.content);
    } catch (error) {
      console.error("OpenAI article translation failed:", error);
      return null;
    }
  };

  for (const backend of textInferenceOrder(env, "translate")) {
    const out = backend === "workers" ? await tryWorkers() : await tryOpenAi();
    if (out) return out;
  }

  return fallbackEnglishTranslation();
}

function parseTranslationText(input: unknown): EnglishArticleTranslation | null {
  if (typeof input !== "string" || !input.trim()) return null;
  try {
    return normalizeEnglishArticleTranslation(JSON.parse(extractJsonObject(input)));
  } catch {
    return null;
  }
}

function extractJsonObject(input: string): string {
  const trimmed = input.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function fallbackEnglishTranslation(): EnglishArticleTranslation {
  const msg =
    "Automatic translation to English failed. Try again later or use your browser translator with the Vietnamese article above.";
  return {
    title: "English translation unavailable",
    summary: msg,
    analysis:
      `• ${msg}`,
    sourceName: "—"
  };
}
