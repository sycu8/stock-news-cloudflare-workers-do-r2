/**
 * WebMCP (https://webmachinelearning.github.io/webmcp/) — register tools via
 * `navigator.modelContext.registerTool()` so agents can act on the home page.
 * Inlined at the **end of body** (inside the main `<script>`) so the DOM exists and
 * `modelContext` is more likely to be available; retries cover late injection.
 */

export interface HomeWebMcpContext {
  reportDate: string;
  selectedSource: string;
  selectedSentiment: string;
  q: string;
  page: number;
  total: number;
  pageSize: number;
}

/** Escape `<` in serialized JSON embedded inside HTML `<script>`. */
function embedJsonInScript(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

/**
 * Raw JavaScript (no `<script>` wrapper) injected at the start of the home page bundle script.
 */
export function renderHomeWebMcpInlineBootstrap(ctx: HomeWebMcpContext): string {
  const c = embedJsonInScript(ctx);
  return `
(function () {
  var C = ${c};
  var registered = false;
  var ac = null;
  var pagehideBound = false;
  function bindPagehide() {
    if (pagehideBound) return;
    pagehideBound = true;
    window.addEventListener(
      "pagehide",
      function () {
        if (ac) {
          try {
            ac.abort();
          } catch (e) {}
          ac = null;
        }
        registered = false;
      },
      { once: true }
    );
  }

  function buildHomeUrl(p) {
    var params = new URLSearchParams();
    var date = p && p.date ? String(p.date).trim() : "";
    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) params.set("date", date);
    else if (C.reportDate) params.set("date", C.reportDate);
    var q = p && p.q != null ? String(p.q).trim() : "";
    if (q) params.set("q", q.slice(0, 120));
    var source = p && p.source != null ? String(p.source).trim() : "";
    if (source) params.set("source", source.slice(0, 80));
    var sentiment = p && p.sentiment != null ? String(p.sentiment).trim().toLowerCase() : "";
    if (sentiment === "positive" || sentiment === "neutral" || sentiment === "negative") params.set("sentiment", sentiment);
    var page = p && p.page != null ? Number(p.page) : NaN;
    if (!isNaN(page) && page > 1) params.set("page", String(Math.min(200, Math.max(1, Math.floor(page)))));
    var qs = params.toString();
    return qs ? "/?" + qs : "/";
  }

  function registerAllTools() {
    if (registered) return true;
    var mc = navigator.modelContext;
    if (!mc || typeof mc.registerTool !== "function") return false;
    bindPagehide();
    var myAc = new AbortController();
    var opt = { signal: myAc.signal };
    try {
      mc.registerTool(
        {
          name: "site.get-page-state",
          title: "Current filters and report",
          description: "Returns the Vietnam stock news home page state: report date, search query, source and sentiment filters, pagination, and the current browser URL.",
          inputSchema: { type: "object", additionalProperties: false, properties: {} },
          annotations: { readOnlyHint: true },
          execute: function () {
            return Promise.resolve({
              reportDate: C.reportDate,
              selectedSource: C.selectedSource || "",
              selectedSentiment: C.selectedSentiment || "",
              q: C.q || "",
              page: C.page,
              total: C.total,
              pageSize: C.pageSize,
              path: typeof location !== "undefined" ? location.pathname + location.search : "/"
            });
          }
        },
        opt
      );

      mc.registerTool(
        {
          name: "site.get-news-json",
          title: "Fetch daily news JSON",
          description: "GET /api/news/today (same-origin) with optional date, source, page, pageSize, and search query q.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              date: { type: "string", description: "YYYY-MM-DD" },
              source: { type: "string" },
              page: { type: "integer", minimum: 1, maximum: 200 },
              pageSize: { type: "integer", minimum: 1, maximum: 200 },
              q: { type: "string" }
            }
          },
          annotations: { readOnlyHint: true },
          execute: function (input) {
            input = input || {};
            var u = new URL("/api/news/today", location.origin);
            if (input.date) u.searchParams.set("date", String(input.date).slice(0, 10));
            if (input.source) u.searchParams.set("source", String(input.source).slice(0, 80));
            if (input.page != null) u.searchParams.set("page", String(Math.min(200, Math.max(1, Math.floor(Number(input.page))))));
            if (input.pageSize != null) u.searchParams.set("pageSize", String(Math.min(200, Math.max(1, Math.floor(Number(input.pageSize))))));
            if (input.q) u.searchParams.set("q", String(input.q).slice(0, 120));
            return fetch(u.toString(), { credentials: "same-origin", headers: { Accept: "application/json" } }).then(function (r) {
              if (!r.ok) return { ok: false, status: r.status, url: u.toString() };
              return r.json();
            });
          }
        },
        opt
      );

      mc.registerTool(
        {
          name: "site.navigate-home",
          title: "Open home with filters",
          description: "Navigates to the daily Vietnam stock news feed. Optional filters: report date (YYYY-MM-DD), search keywords, media source name, sentiment (positive|neutral|negative), and page number.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              date: { type: "string", description: "Report date YYYY-MM-DD" },
              q: { type: "string", description: "Search query" },
              source: { type: "string", description: "Filter by publisher/source name" },
              sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
              page: { type: "integer", minimum: 1, maximum: 200 }
            }
          },
          execute: function (input) {
            var url = buildHomeUrl(input || {});
            location.assign(url);
            return Promise.resolve({ ok: true, navigatedTo: url });
          }
        },
        opt
      );

      mc.registerTool(
        {
          name: "site.scroll-to-section",
          title: "Scroll to page section",
          description: "Scrolls the main view to a landmark section on the home page: main-content, tin-tuc (news grid), du-lieu (market data), tin-van (briefs), or du-bao (outlook).",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["sectionId"],
            properties: {
              sectionId: {
                type: "string",
                enum: ["main-content", "tin-tuc", "du-lieu", "tin-van", "du-bao"]
              }
            }
          },
          execute: function (input) {
            var id = input && input.sectionId ? String(input.sectionId) : "";
            var el = id ? document.getElementById(id) : null;
            if (!el) return Promise.resolve({ ok: false, error: "Section not found: " + id });
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            return Promise.resolve({ ok: true, sectionId: id });
          }
        },
        opt
      );

      mc.registerTool(
        {
          name: "site.open-ai-explain",
          title: "Open AI explanation for an article",
          description: "Opens the in-page AI Explain modal for a news article on this page, matched by canonical article URL (data-ai-explain-url).",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["articleUrl"],
            properties: {
              articleUrl: { type: "string", description: "Full article URL" }
            }
          },
          execute: function (input) {
            var url = input && input.articleUrl ? String(input.articleUrl).trim() : "";
            if (!url) return Promise.resolve({ ok: false, error: "articleUrl required" });
            var btns = document.querySelectorAll(".aiExplainBtn[data-ai-explain-url]");
            var btn = null;
            for (var i = 0; i < btns.length; i++) {
              if (btns[i].getAttribute("data-ai-explain-url") === url) {
                btn = btns[i];
                break;
              }
            }
            if (!btn) return Promise.resolve({ ok: false, error: "No matching article button on this page" });
            btn.click();
            return Promise.resolve({ ok: true, articleUrl: url });
          }
        },
        opt
      );

      mc.registerTool(
        {
          name: "site.open-path",
          title: "Go to calendar, notify, or status",
          description: "Navigates to /calendar, /notify, or /status.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["path"],
            properties: {
              path: { type: "string", enum: ["/calendar", "/notify", "/status"] }
            }
          },
          execute: function (input) {
            var path = input && input.path ? String(input.path) : "";
            if (path !== "/calendar" && path !== "/notify" && path !== "/status") {
              return Promise.resolve({ ok: false, error: "Invalid path" });
            }
            location.assign(path);
            return Promise.resolve({ ok: true, navigatedTo: path });
          }
        },
        opt
      );

      ac = myAc;
      registered = true;
      return true;
    } catch (e) {
      try {
        myAc.abort();
      } catch (_) {}
      console.warn("WebMCP registration failed", e);
      return false;
    }
  }

  function schedule() {
    if (registerAllTools()) return;
    var kick = function () {
      registerAllTools();
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", kick, { once: true });
    } else {
      kick();
    }
    window.addEventListener("load", kick, { once: true });
    setTimeout(kick, 0);
    setTimeout(kick, 120);
    setTimeout(kick, 400);
    setTimeout(kick, 1500);
  }
  schedule();
})();
`.trim();
}
