import type { ClusteredArticle } from "./news-cluster";
import { buildTelegramArticleHref } from "./telegram-article-link";

export function formatTelegramArticleBatch(articles: ClusteredArticle[]): string {
  const lines: string[] = [`🆕 <b>Có ${articles.length} tin mới</b>`];
  for (let i = 0; i < articles.length; i += 1) {
    const item = articles[i]!;
    const summary = (item.summaryVi ?? item.snippet ?? "").trim().slice(0, 180);
    const articleHref = buildTelegramArticleHref(item);
    const badge =
      item.confirmationLevel === "confirmed"
        ? "✓ đa nguồn"
        : item.confirmationLevel === "breaking"
          ? "⚡ 2 nguồn"
          : "1 nguồn";
    lines.push(
      "",
      `<b>${i + 1}. ${escapeTelegramHtml(item.title)}</b>`,
      `${escapeTelegramHtml(item.sourceName)} • ${badge} • ${escapeTelegramHtml(item.publishedAt)}`,
      summary ? `<i>${escapeTelegramHtml(summary)}</i>` : "",
      `<a href="${escapeTelegramAttr(articleHref)}">Đọc bài</a>`
    );
  }
  let text = lines.filter(Boolean).join("\n");
  if (text.length > 3900) {
    text = `${text.slice(0, 3850)}\n\n... (rút gọn)`;
  }
  return text;
}

function escapeTelegramHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeTelegramAttr(input: string): string {
  return input.replace(/"/g, "&quot;");
}
