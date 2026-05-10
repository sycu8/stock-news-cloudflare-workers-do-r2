import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

type Industry = { id: string; label: string };

export function Onboarding() {
  const nav = useNavigate();
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [industryId, setIndustryId] = useState("saas_founder");
  const [companyName, setCompanyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const existing = sessionStorage.getItem("omc_company");

  useEffect(() => {
    api<{ industries: Industry[] }>("/api/onboarding/industries")
      .then((r) => setIndustries(r.industries))
      .catch((e) => setErr(String(e.message)));
  }, []);

  async function create() {
    setBusy(true);
    setErr(null);
    try {
      const res = await api<{ companyId: string; workspaceId: string }>("/api/onboarding/workspace", {
        method: "POST",
        body: JSON.stringify({ industryId, companyName: companyName || undefined }),
      });
      sessionStorage.setItem("omc_company", res.companyId);
      sessionStorage.setItem("omc_workspace", res.workspaceId);
      nav("/office");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="omc-onboard">
      <div className="omc-onboard-card">
        <h1>🏢 ONE MAN COMPANY</h1>
        <p style={{ fontSize: "var(--text-label)", color: "var(--text-dim)", textAlign: "center", lineHeight: 1.6 }}>
          The Agent Operating System — Cloudflare build. Pick an industry quick start.
        </p>
        {existing && (
          <p style={{ textAlign: "center", marginBottom: 12 }}>
            <Link to="/office">→ Open your office</Link>
          </p>
        )}
        {err && <p style={{ color: "var(--pixel-red)", fontSize: "var(--text-label)" }}>{err}</p>}
        <label className="omc-label">Industry</label>
        <select className="omc-select" value={industryId} onChange={(e) => setIndustryId(e.target.value)}>
          {industries.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
        <label className="omc-label" style={{ marginTop: 12 }}>
          Company name (optional)
        </label>
        <input className="omc-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="SaaS Venture Co" />
        <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center" }}>
          <button type="button" className="pixel-btn" disabled={busy} onClick={() => void create()}>
            {busy ? "…" : "Create workspace"}
          </button>
          {existing && (
            <button type="button" className="pixel-btn secondary" onClick={() => nav("/office")}>
              Office
            </button>
          )}
        </div>
      </div>
      <p style={{ fontSize: "var(--text-label)", color: "var(--text-dim)", textAlign: "center", lineHeight: 1.7 }}>
        UI theme aligned with{" "}
        <a href="https://github.com/1mancompany/OneManCompany" target="_blank" rel="noreferrer">
          1mancompany/OneManCompany
        </a>
        <br />
        Live reference:{" "}
        <a href="https://1mancompany.github.io/OneManCompany/#demos" target="_blank" rel="noreferrer">
          Demos on GitHub Pages ↗
        </a>
      </p>
    </div>
  );
}
