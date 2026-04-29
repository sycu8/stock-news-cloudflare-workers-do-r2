/**
 * Telegram Bot: subscribe via deep link, receive broadcasts from the Worker.
 * Configure: TELEGRAM_BOT_TOKEN (secret), TELEGRAM_BOT_USERNAME (public), TELEGRAM_WEBHOOK_SECRET (secret).
 * Set webhook: https://api.telegram.org/bot<token>/setWebhook?url=https://<worker>/webhooks/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>
 */

import type { Env } from "../types";

const SUB_KEY = "notify:telegram:subscribers";
const MAX_SUBSCRIBERS = 5000;

export type TelegramSubscriber = { chatId: string; subscribedAt: string };

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
    return Array.isArray(parsed.chats) ? parsed.chats : [];
  } catch {
    return [];
  }
}

async function saveSubscribers(env: Env, chats: TelegramSubscriber[]): Promise<void> {
  const trimmed = chats.slice(-MAX_SUBSCRIBERS);
  await env.CACHE.put(SUB_KEY, JSON.stringify({ chats: trimmed }), { expirationTtl: 60 * 60 * 24 * 365 });
}

export async function addTelegramSubscriber(env: Env, chatId: string): Promise<void> {
  const chats = await loadSubscribers(env);
  if (chats.some((c) => c.chatId === chatId)) return;
  chats.push({ chatId, subscribedAt: new Date().toISOString() });
  await saveSubscribers(env, chats);
}

export async function removeTelegramSubscriber(env: Env, chatId: string): Promise<void> {
  const chats = (await loadSubscribers(env)).filter((c) => c.chatId !== chatId);
  await saveSubscribers(env, chats);
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

/** Verify Telegram webhook secret (setWebhook ...&secret_token=); pass header value from inbound request */
export function verifyTelegramWebhookSecret(env: Env, headerValue: string | undefined): boolean {
  const secret = env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const got = (headerValue ?? "").trim();
  return got === secret;
}

export async function handleTelegramWebhookUpdate(env: Env, body: unknown): Promise<void> {
  const msg = (body as { message?: { chat?: { id?: number }; text?: string } })?.message;
  if (!msg?.chat?.id) return;

  const chatId = String(msg.chat.id);
  const text = (msg.text ?? "").trim();

  if (text === "/stop" || text.toLowerCase() === "/unsubscribe") {
    await removeTelegramSubscriber(env, chatId);
    await telegramSendMessage(env, chatId, "Bạn đã tắt thông báo. Gửi /start từ menu bot để đăng ký lại.");
    return;
  }

  if (text.startsWith("/start")) {
    await addTelegramSubscriber(env, chatId);
    await telegramSendMessage(
      env,
      chatId,
      "✅ Đã bật thông báo từ Stock News.\nGửi /stop để huỷ nhận tin."
    );
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}
