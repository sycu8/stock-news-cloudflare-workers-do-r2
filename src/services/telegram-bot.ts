/**
 * Telegram Bot: subscribe via deep link, receive broadcasts from the Worker.
 * Configure: TELEGRAM_BOT_TOKEN (secret), TELEGRAM_BOT_USERNAME (public), TELEGRAM_WEBHOOK_SECRET (secret).
 * Set webhook: https://api.telegram.org/bot<token>/setWebhook?url=https://<worker>/webhooks/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>
 */

import type { Env, StoredArticle } from "../types";
import { collapseDuplicateNews } from "./news-cluster";
import { parsePortfolioSymbols } from "./portfolio-watchlist";
import {
  DEFAULT_TELEGRAM_PREFS,
  filterArticlesForTelegramSubscriber,
  normalizeTelegramPrefs,
  type TelegramSubscriberPrefs
} from "./telegram-prefs";
import { formatTelegramArticleBatch } from "./telegram-format";

const SUB_KEY = "notify:telegram:subscribers";
const MAX_SUBSCRIBERS = 5000;

export type { TelegramSubscriberPrefs } from "./telegram-prefs";
export {
  DEFAULT_TELEGRAM_PREFS,
  filterArticlesForTelegramSubscriber,
  normalizeTelegramPrefs
} from "./telegram-prefs";

export type TelegramSubscriber = {
  chatId: string;
  subscribedAt: string;
  prefs?: TelegramSubscriberPrefs;
};

type SubscriberFile = { chats: TelegramSubscriber[] };

export function isTelegramNotifyConfigured(env: Env): boolean {
  return Boolean(env.TELEGRAM_BOT_TOKEN?.trim() && env.TELEGRAM_BOT_USERNAME?.trim());
}

export async function getTelegramSubscriberCount(env: Env): Promise<number> {
  const raw = await env.CACHE.get(SUB_KEY, "text");
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw) as SubscriberFile;
    return Array.isArray(parsed.chats) ? parsed.chats.length : 0;
  } catch {
    return 0;
  }
}

async function loadSubscribers(env: Env): Promise<TelegramSubscriber[]> {
  const raw = await env.CACHE.get(SUB_KEY, "text");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SubscriberFile;
    if (!Array.isArray(parsed.chats)) return [];
    return parsed.chats.map((c) => ({
      chatId: c.chatId,
      subscribedAt: c.subscribedAt,
      prefs: c.prefs ? normalizeTelegramPrefs(c.prefs) : { ...DEFAULT_TELEGRAM_PREFS }
    }));
  } catch {
    return [];
  }
}

async function saveSubscribers(env: Env, chats: TelegramSubscriber[]): Promise<void> {
  const trimmed = chats.slice(-MAX_SUBSCRIBERS);
  await env.CACHE.put(SUB_KEY, JSON.stringify({ chats: trimmed }), { expirationTtl: 60 * 60 * 24 * 365 });
}

export async function getTelegramSubscriber(env: Env, chatId: string): Promise<TelegramSubscriber | null> {
  const chats = await loadSubscribers(env);
  return chats.find((c) => c.chatId === chatId) ?? null;
}

export async function addTelegramSubscriber(env: Env, chatId: string): Promise<void> {
  const chats = await loadSubscribers(env);
  if (chats.some((c) => c.chatId === chatId)) return;
  chats.push({ chatId, subscribedAt: new Date().toISOString(), prefs: { ...DEFAULT_TELEGRAM_PREFS } });
  await saveSubscribers(env, chats);
}

export async function removeTelegramSubscriber(env: Env, chatId: string): Promise<void> {
  const chats = (await loadSubscribers(env)).filter((c) => c.chatId !== chatId);
  await saveSubscribers(env, chats);
}

export async function updateTelegramSubscriberPrefs(
  env: Env,
  chatId: string,
  patch: Partial<TelegramSubscriberPrefs>
): Promise<TelegramSubscriberPrefs> {
  const chats = await loadSubscribers(env);
  const idx = chats.findIndex((c) => c.chatId === chatId);
  if (idx < 0) {
    await addTelegramSubscriber(env, chatId);
    return updateTelegramSubscriberPrefs(env, chatId, patch);
  }
  const current = normalizeTelegramPrefs(chats[idx]!.prefs);
  const next = normalizeTelegramPrefs({ ...current, ...patch });
  chats[idx] = { ...chats[idx]!, prefs: next };
  await saveSubscribers(env, chats);
  return next;
}

export async function telegramSendMessage(env: Env, chatId: string, text: string): Promise<boolean> {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return false;
  const body = {
    chat_id: chatId,
    text: truncate(text, 3900),
    parse_mode: "HTML" as const,
    disable_web_page_preview: true
  };
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.ok;
}

export async function broadcastTelegramMessage(env: Env, text: string): Promise<{ ok: number; fail: number }> {
  const chats = await loadSubscribers(env);
  let ok = 0;
  let fail = 0;
  for (const sub of chats) {
    const sent = await telegramSendMessage(env, sub.chatId, text);
    if (sent) ok += 1;
    else fail += 1;
  }
  return { ok, fail };
}

export async function notifySubscribersOfNewArticles(
  env: Env,
  articles: StoredArticle[],
  newUrls: Set<string>
): Promise<{ ok: number; fail: number; skipped: number }> {
  if (!newUrls.size) return { ok: 0, fail: 0, skipped: 0 };
  if (!isTelegramNotifyConfigured(env)) return { ok: 0, fail: 0, skipped: 0 };

  const subscribers = await loadSubscribers(env);
  if (!subscribers.length) return { ok: 0, fail: 0, skipped: 0 };

  const news = articles.filter((item) => newUrls.has(item.url));
  const clustered = collapseDuplicateNews(news);

  let ok = 0;
  let fail = 0;
  let skipped = 0;

  for (const sub of subscribers) {
    const prefs = normalizeTelegramPrefs(sub.prefs);
    const matched = filterArticlesForTelegramSubscriber(clustered, prefs);
    if (!matched.length) {
      skipped += 1;
      continue;
    }
    const sent = await telegramSendMessage(env, sub.chatId, formatTelegramArticleBatch(matched));
    if (sent) ok += 1;
    else fail += 1;
  }

  return { ok, fail, skipped };
}

/** Verify Telegram webhook secret (setWebhook ...&secret_token=); pass header value from inbound request */
export function verifyTelegramWebhookSecret(env: Env, headerValue: string | undefined): boolean {
  const secret = env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const got = (headerValue ?? "").trim();
  return got === secret;
}

function formatPrefsHelp(prefs: TelegramSubscriberPrefs): string {
  const sym = prefs.symbols.length > 0 ? prefs.symbols.join(", ") : "(tất cả mã — không lọc)";
  return [
    "⚙️ <b>Cài đặt thông báo</b>",
    `• Mã theo dõi: <code>${escapeTelegramHtml(sym)}</code>`,
    `• Điểm tối thiểu: <b>${prefs.minImpact}</b> (0–100)`,
    `• Chỉ tin đa nguồn: <b>${prefs.breakingOnly ? "bật" : "tắt"}</b>`,
    "",
    "Lệnh:",
    "/symbols VNM,FPT — lọc theo mã",
    "/all — nhận mọi tin (bỏ lọc mã)",
    "/impact 50 — điểm tối thiểu",
    "/breaking on|off — chỉ tin ≥2 nguồn",
    "/stop — huỷ đăng ký"
  ].join("\n");
}

export async function handleTelegramWebhookUpdate(env: Env, body: unknown): Promise<void> {
  const msg = (body as { message?: { chat?: { id?: number }; text?: string } })?.message;
  if (!msg?.chat?.id) return;

  const chatId = String(msg.chat.id);
  const text = (msg.text ?? "").trim();
  const lower = text.toLowerCase();

  if (text === "/stop" || lower === "/unsubscribe") {
    await removeTelegramSubscriber(env, chatId);
    await telegramSendMessage(env, chatId, "Bạn đã tắt thông báo. Gửi /start từ menu bot để đăng ký lại.");
    return;
  }

  if (lower === "/settings" || lower === "/help") {
    const sub = await getTelegramSubscriber(env, chatId);
    const prefs = normalizeTelegramPrefs(sub?.prefs);
    await telegramSendMessage(env, chatId, formatPrefsHelp(prefs));
    return;
  }

  if (lower.startsWith("/symbols ")) {
    await addTelegramSubscriber(env, chatId);
    const raw = text.slice("/symbols ".length);
    const symbols = parsePortfolioSymbols(raw);
    await updateTelegramSubscriberPrefs(env, chatId, { symbols });
    await telegramSendMessage(
      env,
      chatId,
      symbols.length
        ? `✅ Đã lưu mã: <code>${escapeTelegramHtml(symbols.join(", "))}</code>\nChỉ nhận tin nhắc các mã này.`
        : "✅ Đã xoá lọc mã — bạn sẽ nhận mọi tin mới (trừ khi bật /breaking)."
    );
    return;
  }

  if (lower === "/all") {
    await addTelegramSubscriber(env, chatId);
    await updateTelegramSubscriberPrefs(env, chatId, { symbols: [] });
    await telegramSendMessage(env, chatId, "✅ Đã bật nhận mọi tin mới (không lọc mã).");
    return;
  }

  if (lower.startsWith("/impact")) {
    await addTelegramSubscriber(env, chatId);
    const num = Number(text.split(/\s+/)[1] ?? "0");
    const minImpact = Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : 0;
    await updateTelegramSubscriberPrefs(env, chatId, { minImpact });
    await telegramSendMessage(env, chatId, `✅ Chỉ nhận tin có điểm ≥ <b>${minImpact}</b>.`);
    return;
  }

  if (lower.startsWith("/breaking")) {
    await addTelegramSubscriber(env, chatId);
    const arg = (text.split(/\s+/)[1] ?? "").toLowerCase();
    if (arg === "off" || arg === "0" || arg === "tắt" || arg === "tat") {
      await updateTelegramSubscriberPrefs(env, chatId, { breakingOnly: false });
      await telegramSendMessage(env, chatId, "✅ Đã tắt lọc đa nguồn.");
      return;
    }
    if (arg === "on" || arg === "1" || arg === "bật" || arg === "bat") {
      await updateTelegramSubscriberPrefs(env, chatId, { breakingOnly: true });
      await telegramSendMessage(env, chatId, "✅ Chỉ nhận tin từ ≥2 nguồn (breaking/confirmed).");
      return;
    }
    const cur = normalizeTelegramPrefs((await getTelegramSubscriber(env, chatId))?.prefs);
    const next = !cur.breakingOnly;
    await updateTelegramSubscriberPrefs(env, chatId, { breakingOnly: next });
    await telegramSendMessage(env, chatId, next ? "✅ Đã bật lọc đa nguồn." : "✅ Đã tắt lọc đa nguồn.");
    return;
  }

  if (text.startsWith("/start")) {
    await addTelegramSubscriber(env, chatId);
    await telegramSendMessage(
      env,
      chatId,
      "✅ Đã bật thông báo từ Stock News.\n\nCá nhân hoá:\n/symbols VNM,FPT — lọc mã\n/impact 40 — điểm tối thiểu\n/breaking on — chỉ tin đa nguồn\n/settings — xem cài đặt\n/stop — huỷ"
    );
  }
}

function escapeTelegramHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}
