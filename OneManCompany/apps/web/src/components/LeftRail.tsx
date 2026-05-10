import { Link } from "react-router-dom";
import { Collapsible } from "./Collapsible";

export function LeftRail(props: { agentCount: number; companyId: string | null; onReset: () => void }) {
  const { agentCount, companyId, onReset } = props;
  return (
    <>
      <div className="omc-left-top">
        <div className="panel" style={{ flex: "0 0 auto" }}>
          <div className="panel-header">
            <h2>🏢 ONE MAN COMPANY</h2>
          </div>
          <div className="panel-scroll" style={{ fontSize: "var(--text-label)" }}>
            <div className="stat-row">
              <span>👥 Agents</span>
              <b>{agentCount}</b>
            </div>
            <div className="stat-row">
              <span>🔧 Tools</span>
              <b>0</b>
            </div>
            <div className="stat-row">
              <span>🏢 Workspace</span>
              <b>{companyId ? "OK" : "—"}</b>
            </div>
            <div className="stat-row">
              <span>● API</span>
              <b style={{ color: "var(--pixel-green)" }}>ON</b>
            </div>
          </div>
        </div>
        <Collapsible title="▼ PRODUCTS" defaultOpen={false}>
          <p className="roster-meta">Cloudflare-native build. Connects to Workers API.</p>
          <Link to="/">↩ New workspace</Link>
        </Collapsible>
      </div>
      <div className="omc-left-bottom">
        <Collapsible title="▼ ACTIVITY LOG" defaultOpen>
          <div className="roster-meta" style={{ marginBottom: 8 }}>
            Session company: {companyId ? <code style={{ color: "var(--pixel-cyan)" }}>{companyId.slice(0, 18)}…</code> : "none"}
          </div>
          <button type="button" className="pixel-btn secondary small" style={{ width: "100%" }} onClick={onReset}>
            Clear session
          </button>
        </Collapsible>
      </div>
    </>
  );
}
