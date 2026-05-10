import { Collapsible } from "./Collapsible";

export type AgentRow = {
  id: string;
  role: string;
  display_name: string;
  goal: string | null;
  tools?: { name: string }[];
};

export function TeamRosterPanel(props: { agents: AgentRow[]; loading: boolean }) {
  const { agents, loading } = props;
  return (
    <aside className="omc-roster">
      <Collapsible title="▼ TEAM ROSTER" defaultOpen>
        {loading && <div className="roster-row roster-meta">Loading…</div>}
        {!loading && agents.length === 0 && <div className="roster-row roster-meta">No employees</div>}
        {!loading &&
          agents.map((a) => (
            <div key={a.id} className="roster-row">
              <strong>
                {a.display_name} <span style={{ color: "var(--pixel-cyan)" }}>({a.role})</span>
              </strong>
              <div className="roster-meta">{a.goal?.slice(0, 120) ?? "—"}</div>
            </div>
          ))}
      </Collapsible>
    </aside>
  );
}
