import type { Env } from "../types";
import { sha256Hex } from "../utils/sha256";
import { workersAiGatewayOptions, workersAiImageModel } from "./ai-config";

export async function ensureGeneratedThumbnail(params: {
  env: Env;
  reportDate: string;
  articleUrl: string;
  title: string;
}): Promise<{ key: string; publicPath: string } | null> {
  const { env, reportDate, articleUrl, title } = params;
  if (!env.AI || !env.ASSETS) return null;

  const hash = await sha256Hex(articleUrl);
  const key = `generated/${reportDate}/${hash}.png`;
  const publicPath = `/assets/${key}`;

  // Avoid regenerating if it already exists.
  const existing = await env.ASSETS.head(key);
  if (existing) {
    return { key, publicPath };
  }

  const prompt = buildPrompt(title);
  const negative =
    "text, watermark, logo, brand, low quality, blurry, distorted, ugly, nsfw, people, face, portrait, hands";

  const model = workersAiImageModel(env);
  const result = await env.AI.run(
    model,
    {
      prompt,
      negative_prompt: negative,
      width: 1024,
      height: 576,
      num_steps: 6,
      guidance: 6
    },
    workersAiGatewayOptions(env)
  );

  const bytes = await readAiImageBytes(result);
  if (!bytes || bytes.byteLength < 128) return null;

  await env.ASSETS.put(key, bytes, {
    httpMetadata: { contentType: "image/png", cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: {
      kind: "generated_thumbnail",
      source: "workers-ai",
      model,
      title: title.slice(0, 120)
    }
  });

  return { key, publicPath };
}

function buildPrompt(title: string): string {
  const cleaned = title.replace(/\s+/g, " ").trim();
  return [
    "Minimal flat vector illustration, finance dashboard style, clean modern design.",
    "Vietnam stock market theme, VN-Index chart line, candlesticks, subtle grid background.",
    "No text, no logos, no watermarks.",
    `Concept inspired by: ${cleaned}`
  ].join(" ");
}

async function readAiImageBytes(result: unknown): Promise<ArrayBuffer | null> {
  // Workers AI image models return binary data (often as ReadableStream).
  if (!result) return null;

  // ReadableStream
  if (typeof (result as { getReader?: unknown })?.getReader === "function") {
    const resp = new Response(result as ReadableStream);
    return await resp.arrayBuffer();
  }

  // ArrayBuffer
  if (result instanceof ArrayBuffer) return result;

  // Uint8Array
  if (result instanceof Uint8Array) {
    // Ensure we return a real ArrayBuffer (not SharedArrayBuffer).
    const copied = new Uint8Array(result.byteLength);
    copied.set(result);
    return copied.buffer;
  }

  // Some runtimes may return a Response-like
  if (result instanceof Response) {
    return await result.arrayBuffer();
  }

  return null;
}

