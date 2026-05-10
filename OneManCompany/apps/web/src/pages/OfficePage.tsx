import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api";
import { CeoConsole } from "../components/CeoConsole";
import { LeftRail } from "../components/LeftRail";
import { PixelOffice } from "../components/PixelOffice";
import { TeamRosterPanel, type AgentRow } from "../components/TeamRosterPanel";

export function OfficePage() {
  const [companyId] = useState(() => sessionStorage.getItem("omc_company"));
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadAgents = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const r = await api<{ agents: AgentRow[] }>(`/api/agents/company/${companyId}`);
      setAgents(r.agents);
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  if (!companyId) {
    return <Navigate to="/" replace />;
  }

  const roles = new Set(agents.map((a) => a.role));

  return (
    <div className="omc-app">
      <LeftRail
        agentCount={agents.length}
        companyId={companyId}
        onReset={() => {
          sessionStorage.removeItem("omc_company");
          sessionStorage.removeItem("omc_workspace");
          window.location.href = "/";
        }}
      />
      <PixelOffice rolesPresent={roles} busy={busy} />
      <TeamRosterPanel agents={agents} loading={loading} />
      <CeoConsole
        companyId={companyId}
        onAgentsRefresh={() => {
          void loadAgents();
        }}
        onBusy={setBusy}
      />
    </div>
  );
}
