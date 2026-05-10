import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { DEMO_SCENARIOS } from "../data/demoScenarios";
import { DemoStrip } from "./DemoStrip";

type Tab = "chat" | "objective" | "tasks";

export function CeoConsole(props: { companyId: string; onAgentsRefresh: () => void; onBusy?: (v: boolean) => void }) {
  const { companyId, onAgentsRefresh, onBusy } = props;
  const [tab, setTab] = useState<Tab>("objective");
  const [objective, setObjective] = useState("Validate a B2B micro-SaaS idea for dentists");
  const [out, setOut] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [tasks, setTasks] = useState<{ id: string; title: string; status: string }[]>([]);
  const [chat, setChat] = useState("");

  async function runObjective() {
    setBusy(true);
    onBusy?.(true);
    setOut("");
    try {
      const res = await api<{ output: unknown }>("/api/tasks/objective", {
        method: "POST",
        body: JSON.stringify({ companyId, objective }),
      });
      setOut(JSON.stringify(res.output, null, 2));
      const t = await api<{ tasks: { id: string; title: string; status: string }[] }>(`/api/tasks/company/${companyId}`);
      setTasks(t.tasks);
      onAgentsRefresh();
    } catch (e: unknown) {
      setOut(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }

  async function loadTasks() {
    try {
      const t = await api<{ tasks: { id: string; title: string; status: string }[] }>(`/api/tasks/company/${companyId}`);
      setTasks(t.tasks);
    } catch {
      setTasks([]);
    }
  }

  return (
    <section className="omc-console panel">
      <div className="panel-header">
        <h2>👑 CEO CONSOLE</h2>
        <span style={{ fontSize: "var(--text-label)", color: "var(--text-dim)" }}>You</span>
      </div>
      <div className="console-tabs">
        <button type="button" className={`console-tab${tab === "chat" ? " active" : ""}`} onClick={() => setTab("chat")}>
          💬 Chat
        </button>
        <button type="button" className={`console-tab${tab === "objective" ? " active" : ""}`} onClick={() => setTab("objective")}>
          🎯 Objective
        </button>
        <button
          type="button"
          className={`console-tab${tab === "tasks" ? " active" : ""}`}
          onClick={() => {
            setTab("tasks");
            void loadTasks();
          }}
        >
          📋 Tasks
        </button>
      </div>
      <div className="console-body">
        {tab === "chat" && (
          <>
            <p className="roster-meta">Quick memo to your EA (local only in this MVP).</p>
            <textarea className="omc-textarea" style={{ minHeight: 80 }} value={chat} onChange={(e) => setChat(e.target.value)} placeholder="Type a note…" />
          </>
        )}
        {tab === "objective" && (
          <>
            <DemoStrip scenarios={DEMO_SCENARIOS} disabled={busy} onPick={(line) => setObjective(line)} />
            <p className="roster-meta">
              Cloudflare MVP: EA → COO → CSO → QA → EA summary (Workers AI + AI Gateway). Full pixel office + autonomous runs:{" "}
              <a href="https://1mancompany.github.io/OneManCompany/#demos" target="_blank" rel="noreferrer">
                official demos ↗
              </a>
            </p>
            <textarea className="omc-textarea" value={objective} onChange={(e) => setObjective(e.target.value)} />
            <button type="button" className="pixel-btn" disabled={busy} onClick={() => void runObjective()}>
              {busy ? "Running…" : "▶ Run company objective"}
            </button>
            {out && <pre className="pre-json">{out}</pre>}
          </>
        )}
        {tab === "tasks" && (
          <>
            <button type="button" className="pixel-btn secondary small" onClick={() => void loadTasks()}>
              🔄 Refresh
            </button>
            <div>
              {tasks.map((t) => (
                <div key={t.id} className="roster-row">
                  <Link to={`/tasks/${t.id}`}>
                    <strong style={{ color: "var(--pixel-yellow)" }}>{t.title}</strong>
                  </Link>
                  <div className="roster-meta">{t.status}</div>
                </div>
              ))}
              {tasks.length === 0 && <div className="roster-meta">No tasks</div>}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
