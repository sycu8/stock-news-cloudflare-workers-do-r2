const ORDER = ["EA", "COO", "HR", "CSO", "QA"] as const;

const ROLE_EMOJI: Record<string, string> = {
  EA: "📋",
  COO: "⚙️",
  HR: "👔",
  CSO: "📈",
  QA: "✅",
};

export function PixelOffice(props: { rolesPresent: Set<string>; busy: boolean }) {
  const { rolesPresent, busy } = props;
  return (
    <section className="omc-office" aria-label="Pixel office preview">
      <div className="panel-header">
        <h2>🏢 Pixel-Art Office</h2>
        <span style={{ fontSize: "var(--text-label)", color: "var(--text-dim)" }}>preview</span>
      </div>
      <div className="office-floor">
        <div className="office-floor-inner">
          {ORDER.map((role) => {
            const here = rolesPresent.has(role);
            return (
              <div key={role} className={`desk${busy && role === "EA" ? " working" : ""}`}>
                <div className="avatar">{ROLE_EMOJI[role] ?? "🤖"}</div>
                <div className="role">{role}</div>
                <div className="roster-meta">{here ? "on staff" : "empty"}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
