import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

export function TaskDetail() {
  const { taskId } = useParams();
  const [task, setTask] = useState<unknown>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;
    api<{ task: unknown }>(`/api/tasks/${taskId}`)
      .then((r) => setTask(r.task))
      .catch((e) => setErr(String(e.message)));
  }, [taskId]);

  return (
    <div className="omc-onboard" style={{ alignItems: "stretch", justifyContent: "flex-start", padding: 16 }}>
      <div className="omc-onboard-card" style={{ width: "100%", maxWidth: 720 }}>
        <div className="panel-header">
          <h2>📋 Task</h2>
          <Link to="/office" style={{ fontSize: "var(--text-label)" }}>
            ← Office
          </Link>
        </div>
        {err && <p style={{ color: "var(--pixel-red)" }}>{err}</p>}
        <pre className="pre-json" style={{ margin: 0, border: "none", maxHeight: "70vh" }}>
          {JSON.stringify(task, null, 2)}
        </pre>
      </div>
    </div>
  );
}
