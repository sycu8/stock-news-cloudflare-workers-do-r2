import { useState, type ReactNode } from "react";

export function Collapsible({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel" style={{ flex: 1, minHeight: 0 }}>
      <button type="button" className={`collapsible-header${open ? "" : " collapsed"}`} onClick={() => setOpen(!open)}>
        <span className="collapse-arrow">▼</span>
        <span>{title}</span>
      </button>
      {open && <div className="panel-scroll">{children}</div>}
    </div>
  );
}
