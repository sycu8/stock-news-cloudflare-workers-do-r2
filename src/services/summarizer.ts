import type { DailyReport, Env, StoredArticle } from "../types";
import { truncate } from "../utils/text";

export async function summarizeArticle(article: StoredArticle, env: Env): Promise<string> {
  const limitedTag = article.contentLimited
    ? "Thông tin nguồn bị giới hạn. Chỉ tóm tắt từ tiêu đề/snippet."
    : "Có snippet.";
  const prompt = [
    "Tóm tắt tin chứng khoán Việt Nam: tiếng Việt có dấu, tối đa 2 câu, gọn và trung tính.",
    "Không viết tiêu đề, lời mở đầu hay dòng kiểu 'Dưới đây là…' — chỉ nội dung tóm tắt.",
    "Không bổ sung sự kiện không có trong dữ liệu.",
    `Tiêu đề: ${article.title}`,
    `Nguồn: ${article.sourceName}`,
    `Nội dung gốc (snippet): ${truncate(article.snippet || article.title, 600)}`,
    limitedTag
  ].join("\n");

  return runSummarizationPrompt(prompt, env, fallbackArticleSummary(article));
}

export async function summarizeArticleFromSource(
  article: StoredArticle,
  sourceText: string,
  env: Env
): Promise<string> {
  const prompt = [
    "Tóm tắt tin chứng khoán Việt Nam: tiếng Việt có dấu, tối đa 2 câu, gọn và trung tính.",
    "Không viết tiêu đề, lời mở đầu hay dòng kiểu 'Dưới đây là…' — chỉ nội dung tóm tắt.",
    "Chỉ dựa trên nội dung nguồn được cung cấp. Không bịa thêm dữ liệu.",
    `Tiêu đề: ${article.title}`,
    `Nguồn: ${article.sourceName}`,
    `URL: ${article.url}`,
    `Nội dung nguồn (trích): ${truncate(sourceText, 2200)}`
  ].join("\n");

  return runSummarizationPrompt(prompt, env, fallbackArticleSummary(article));
}

export async function summarizeDailyOverview(
  reportDate: string,
  articles: StoredArticle[],
  env: Env
): Promise<DailyReport> {
  const compact = articles
    .slice(0, 30)
    .map((a, idx) => `${idx + 1}. [${a.sourceName}] ${a.title} | ${truncate(a.summaryVi ?? a.snippet, 180)}`)
    .join("\n");

  const overviewPrompt = [
    "Bạn là trợ lý tổng hợp tin thị trường chứng khoán Việt Nam.",
    "Viết 1 đoạn tổng quan ngắn gọn (4-6 câu), nêu rõ xu hướng tin tức trong ngày.",
    "Chỉ dựa trên dữ liệu được cung cấp. Viết tiếng Việt có dấu."
  ].join("\n");
  const outlookPrompt = [
    "Viết mục market outlook cho phiên tiếp theo bằng tiếng Việt có dấu, 3-5 câu.",
    "Dùng ngôn ngữ thận trọng: “có thể”, “kịch bản”, “rủi ro”, “giả định”.",
    "Không đưa lời khuyên đầu tư hoặc đảm bảo kết quả."
  ].join("\n");
  const assumptionsPrompt = [
    "Liệt kê 3 giả định/rủi ro chính đang tác động đến outlook ngắn hạn, ngắn gọn (cách nhau bởi dấu chấm phẩy). Viết tiếng Việt có dấu."
  ].join("\n");

  const [overviewVi, outlookVi, assumptionsVi] = await Promise.all([
    runSummarizationPrompt(`${overviewPrompt}\n\nDu lieu:\n${compact}`, env, fallbackOverview(articles)),
    runSummarizationPrompt(`${outlookPrompt}\n\nDu lieu:\n${compact}`, env, fallbackOutlook(articles)),
    runSummarizationPrompt(`${assumptionsPrompt}\n\nDu lieu:\n${compact}`, env, fallbackAssumptions(articles))
  ]);

  return {
    reportDate,
    overviewVi,
    outlookVi,
    assumptionsVi,
    articleCount: articles.length
  };
}

/** Remove model echoes of instruction preambles (keep only the actual summary). */
function stripSummaryPreamble(text: string): string {
  let t = text.trim();
  const lines = t.split(/\r?\n/);
  const dropFirst = (cond: (line: string) => boolean) => {
    while (lines.length > 0 && cond(lines[0]!)) lines.shift();
    t = lines.join("\n").trim();
  };
  dropFirst((line) => {
    const s = line.trim();
    if (/^dưới đây/i.test(s)) return true;
    if (/^tóm tắt\s*:/i.test(s) && s.length < 120) return true;
    if (/tóm tắt bản tin chứng khoán việt nam/i.test(s) && s.length < 180) return true;
    return false;
  });
  return t;
}

async function runSummarizationPrompt(prompt: string, env: Env, fallback: string): Promise<string> {
  // Prefer Workers AI when available (no API key needed).
  if (env.AI) {
    try {
      const model = env.WORKERS_AI_MODEL_SUMMARY ?? "@cf/meta/llama-3.1-8b-instruct-fast";
      const res = await env.AI.run(
        model,
        {
          messages: [
            {
              role: "system",
              content:
                "Bạn là trợ lý tổng hợp tin chứng khoán. Không đưa lời khuyên đầu tư. Không bịa thêm dữ liệu. Luôn viết tiếng Việt có dấu khi được yêu cầu."
            },
            { role: "user", content: prompt }
          ],
          max_tokens: 420
        },
        env.AI_GATEWAY_ID
          ? {
              gateway: {
                id: env.AI_GATEWAY_ID,
                skipCache: true
              }
            }
          : undefined
      );

      const text =
        (res as { response?: string; result?: { response?: string } })?.response ??
        (res as { result?: { response?: string } })?.result?.response ??
        (res as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content;

      const trimmed = typeof text === "string" ? stripSummaryPreamble(text) : "";
      if (trimmed) return truncate(trimmed, 1200);
    } catch (error) {
      console.error("Workers AI summarization failed:", error);
    }
  }

  if (!env.OPENAI_API_KEY) {
    return fallback;
  }
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Bạn là trợ lý tổng hợp tin chứng khoán. Không đưa lời khuyên đầu tư. Không bịa thêm dữ liệu. Luôn viết tiếng Việt có dấu khi được yêu cầu."
          },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      console.error("OpenAI response error:", response.status, await response.text());
      return fallback;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return fallback;
    }
    const stripped = stripSummaryPreamble(raw);
    if (!stripped) return fallback;
    return truncate(stripped, 1200);
  } catch (error) {
    console.error("OpenAI summarization failed:", error);
    return fallback;
  }
}

function fallbackArticleSummary(article: StoredArticle): string {
  const limited = article.contentLimited ? " (dữ liệu hạn chế)" : "";
  return truncate(`${article.title}: ${article.snippet}${limited}`, 260);
}

function fallbackOverview(articles: StoredArticle[]): string {
  if (articles.length === 0) {
    return "Không có dữ liệu tin tức mới trong ngày để tổng hợp.";
  }
  const sources = Array.from(new Set(articles.map((a) => a.sourceName))).join(", ");
  return truncate(
    `Tổng hợp ${articles.length} tin từ ${sources}. Tâm điểm xoay quanh cập nhật doanh nghiệp, động thái thị trường và các thông tin vĩ mô liên quan đến cổ phiếu.`,
    600
  );
}

function fallbackOutlook(articles: StoredArticle[]): string {
  if (articles.length === 0) {
    return "Market outlook: dữ liệu hiện tại chưa đủ để xây dựng kịch bản rõ ràng. Nhà đầu tư nên theo dõi thêm tin tức và thanh khoản.";
  }
  return "Market outlook: thị trường có thể dao động theo diễn biến thông tin kết quả kinh doanh và dòng tiền ngắn hạn. Kịch bản tích cực phụ thuộc vào sự đồng thuận của nhóm vốn hoá lớn; kịch bản thận trọng là áp lực chốt lời quay lại khi thanh khoản suy yếu. Rủi ro cần theo dõi gồm tin vĩ mô bất ngờ và biến động tâm lý nhà đầu tư.";
}

function fallbackAssumptions(_articles: StoredArticle[]): string {
  return "Dòng tiền duy trì ở nhóm dẫn dắt; Thông tin doanh nghiệp không xấu hơn kỳ vọng; Môi trường vĩ mô và tỷ giá không xuất hiện biến động bất lợi đột ngột";
}

// Disclaimer is rendered in the UI (non-financial advice section).
