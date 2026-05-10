import type { DemoScenario } from "../data/demoScenarios";

export function DemoStrip(props: { scenarios: DemoScenario[]; onPick: (line: string) => void; disabled?: boolean }) {
  const { scenarios, onPick, disabled } = props;
  return (
    <div className="demo-strip">
      <div className="demo-strip-head">
        <span className="demo-strip-title">Demos</span>
        <span className="demo-strip-sub">One sentence from the CEO — the team takes it from there.</span>
      </div>
      <div className="demo-strip-flow" aria-hidden>
        You speak → EA → COO → CSO → QA → EA summary
      </div>
      <div className="demo-cards">
        {scenarios.map((d) => (
          <button
            key={d.id}
            type="button"
            className="demo-card"
            disabled={disabled}
            onClick={() => onPick(d.ceoLine)}
            title={d.ceoLine}
          >
            <span className="demo-card-title">{d.title}</span>
            <span className="demo-card-blurb">{d.blurb}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
