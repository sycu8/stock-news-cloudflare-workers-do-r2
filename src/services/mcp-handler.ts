import type { Env } from "../types";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const MCP_TOOLS = [
  {
    name: "get_news_today",
    description: "JSON feed for today's Vietnam market news",
    inputSchema: { type: "object", properties: { date: { type: "string" }, q: { type: "string" } } }
  },
  {
    name: "get_stock_insight",
    description: "Stock insight JSON for a HOSE ticker symbol",
    inputSchema: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] }
  },
  {
    name: "explain_article",
    description: "AI explanation of news impact for an article URL",
    inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }
  },
  {
    name: "list_clusters",
    description: "Multi-source news clusters for a report date",
    inputSchema: { type: "object", properties: { date: { type: "string" } } }
  }
] as const;

export async function handleMcpJsonRpc(
  env: Env,
  origin: string,
  body: JsonRpcRequest,
  invoke: {
    newsToday: (date?: string, q?: string) => Promise<unknown>;
    stockInsight: (symbol: string) => Promise<unknown>;
    explainArticle: (url: string) => Promise<unknown>;
    listClusters: (date: string) => Promise<unknown>;
  }
): Promise<Record<string, unknown>> {
  const id = body.id ?? null;
  const method = body.method ?? "";
  if (body.jsonrpc && body.jsonrpc !== "2.0") {
    return err(id, -32600, "Invalid Request");
  }
  if (method === "initialize") {
    return ok(id, {
      protocolVersion: "2024-11-05",
      serverInfo: { name: "vn-market-daily-worker", version: "1.1.0" },
      capabilities: { tools: {} }
    });
  }
  if (method === "tools/list") {
    return ok(id, { tools: MCP_TOOLS });
  }
  if (method === "tools/call") {
    const name = String(body.params?.name ?? "");
    const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
    try {
      if (name === "get_news_today") {
        const data = await invoke.newsToday(typeof args.date === "string" ? args.date : undefined, typeof args.q === "string" ? args.q : undefined);
        return ok(id, { content: [{ type: "text", text: JSON.stringify(data) }] });
      }
      if (name === "get_stock_insight") {
        const symbol = String(args.symbol ?? "").trim().toUpperCase();
        if (!symbol) return err(id, -32602, "symbol required");
        const data = await invoke.stockInsight(symbol);
        return ok(id, { content: [{ type: "text", text: JSON.stringify(data) }] });
      }
      if (name === "explain_article") {
        const url = String(args.url ?? "").trim();
        if (!url) return err(id, -32602, "url required");
        const data = await invoke.explainArticle(url);
        return ok(id, { content: [{ type: "text", text: JSON.stringify(data) }] });
      }
      if (name === "list_clusters") {
        const date = typeof args.date === "string" ? args.date : new Date().toISOString().slice(0, 10);
        const data = await invoke.listClusters(date);
        return ok(id, { content: [{ type: "text", text: JSON.stringify(data) }] });
      }
      return err(id, -32601, `Unknown tool: ${name}`);
    } catch (e) {
      return err(id, -32000, e instanceof Error ? e.message : "tool failed");
    }
  }
  if (method === "ping") return ok(id, {});
  return err(id, -32601, `Method not found: ${method}`);
}

function ok(id: string | number | null, result: unknown): Record<string, unknown> {
  return { jsonrpc: "2.0", id, result };
}

function err(id: string | number | null, code: number, message: string): Record<string, unknown> {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

export function mcpToolsForServerCard(): Array<{ name: string; description: string }> {
  return MCP_TOOLS.map((t) => ({ name: t.name, description: t.description }));
}
