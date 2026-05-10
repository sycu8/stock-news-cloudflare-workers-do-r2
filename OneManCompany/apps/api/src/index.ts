import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { onboarding } from "./routes/onboarding";
import { agents } from "./routes/agents";
import { tasks } from "./routes/tasks";
import { workflows } from "./routes/workflows";
import { artifacts } from "./routes/artifacts";

export { CompanyRoom } from "./durable-objects/CompanyRoom";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], allowHeaders: ["Content-Type"] }));

app.get("/", (c) =>
  c.json({
    service: "OneManCompany API",
    version: "0.1.0",
    routes: ["/health", "/api/onboarding/*", "/api/agents/*", "/api/tasks/*", "/api/workflows/*", "/api/artifacts/*"],
  })
);

app.get("/health", (c) => c.json({ ok: true }));

app.route("/api/onboarding", onboarding);
app.route("/api/agents", agents);
app.route("/api/tasks", tasks);
app.route("/api/workflows", workflows);
app.route("/api/artifacts", artifacts);

export default app;
