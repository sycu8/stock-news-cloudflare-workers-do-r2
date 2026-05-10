import { DurableObject } from "cloudflare:workers";
import type { Env } from "../env";
import { safeJsonParse } from "../utils/json";

interface RoomHead {
  companyId?: string;
  industryId?: string;
  lastEventAt?: string;
}

/**
 * Live company coordination room — V1 keeps a tiny durable head in storage;
 * extend with alarms, WebSockets, and workflow state machines.
 */
export class CompanyRoom extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname.endsWith("/state")) {
      const head = (await this.ctx.storage.get<RoomHead>("head")) ?? {};
      const events = (await this.ctx.storage.get<unknown[]>("events")) ?? [];
      return Response.json({ head, events });
    }

    if (request.method === "POST" && url.pathname.endsWith("/seed")) {
      const raw = await request.text();
      const body = safeJsonParse<{ companyId?: string; industryId?: string }>(raw, {});
      const head: RoomHead = {
        companyId: body.companyId,
        industryId: body.industryId,
        lastEventAt: new Date().toISOString(),
      };
      await this.ctx.storage.put("head", head);
      await this.ctx.storage.put("events", []);
      return Response.json({ ok: true, head });
    }

    if (request.method === "POST" && url.pathname.endsWith("/event")) {
      const raw = await request.text();
      const evt = safeJsonParse<Record<string, unknown>>(raw, {});
      const events = (await this.ctx.storage.get<unknown[]>("events")) ?? [];
      events.push({ at: new Date().toISOString(), ...evt });
      const trimmed = events.slice(-200);
      await this.ctx.storage.put("events", trimmed);
      const head = (await this.ctx.storage.get<RoomHead>("head")) ?? {};
      head.lastEventAt = new Date().toISOString();
      await this.ctx.storage.put("head", head);
      return Response.json({ ok: true, size: trimmed.length });
    }

    return new Response("Not found", { status: 404 });
  }
}
