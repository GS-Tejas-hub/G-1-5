// src/components/LifecycleWheel.tsx
import * as React from "react";
import {
  LifecyclePhase,
  LifecycleState,
  PHASE_ORDER,
  phaseLabel,
  phaseStatus,
  phaseSummary,
  transition,
} from "../state/lifecycleMachine";

type Props = {
  state: LifecycleState;
  onChange: (next: LifecycleState) => void;
  size?: number; // px
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, startAngle: number, endAngle: number) {
  const startOuter = polarToCartesian(cx, cy, rOuter, endAngle);
  const endOuter = polarToCartesian(cx, cy, rOuter, startAngle);

  const startInner = polarToCartesian(cx, cy, rInner, startAngle);
  const endInner = polarToCartesian(cx, cy, rInner, endAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArcFlag} 1 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

function statusStyle(status: string) {
  // No hard-coded colors from style guides were forbidden only for matplotlib; UI is ok.
  // Keep neutral palette; status differences via stroke + opacity.
  if (status === "DONE") return { fill: "#111", opacity: 0.92, stroke: "#111" };
  if (status === "AVAILABLE") return { fill: "#fff", opacity: 1, stroke: "#111" };
  if (status === "BLOCKED") return { fill: "#fff", opacity: 1, stroke: "#b91c1c" };
  return { fill: "#fff", opacity: 0.35, stroke: "#ddd" }; // LOCKED
}

function labelColor(status: string, active: boolean) {
  if (active) return "#111";
  if (status === "LOCKED") return "#999";
  if (status === "BLOCKED") return "#b91c1c";
  if (status === "DONE") return "#111";
  return "#111";
}

export function LifecycleWheel({ state, onChange, size = 460 }: Props) {
  const [hovered, setHovered] = React.useState<LifecyclePhase | null>(null);
  const active = state.active;

  const cx = size / 2;
  const cy = size / 2;
  const outer = size * 0.48;
  const inner = size * 0.28;

  const phases = PHASE_ORDER;

  const activeStatus = phaseStatus(state, active);
  const activeBlockers = state.ctx.blockedBy?.[active] || [];

  function activate(p: LifecyclePhase) {
    onChange(transition(state, { type: "JUMP", to: p }));
  }

  function markDone(p: LifecyclePhase) {
    onChange(transition(state, { type: "MARK_DONE", phase: p }));
  }

  function reopen(p: LifecyclePhase) {
    onChange(transition(state, { type: "REOPEN", phase: p }));
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eaeaea",
        borderRadius: 18,
        padding: 16,
        display: "grid",
        gridTemplateColumns: "minmax(320px, 520px) 1fr",
        gap: 16,
        alignItems: "start",
      }}
    >
      {/* Wheel */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <svg width={size} height={size} role="img" aria-label="Lifecycle wheel">
          {/* Background ring */}
          <circle cx={cx} cy={cy} r={outer} fill="#fff" stroke="#eee" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={inner} fill="#fff" stroke="#eee" strokeWidth={2} />

          {phases.map((p, i) => {
            const anglePer = 360 / phases.length;
            const start = i * anglePer;
            const end = start + anglePer;

            const st = phaseStatus(state, p);
            const isActive = p === active;
            const isHover = hovered === p;

            const d = arcPath(cx, cy, outer, inner, start + 2, end - 2);

            const base = statusStyle(st);
            const fill = isActive ? "#f3f4f6" : base.fill; // active highlight
            const stroke = isActive ? "#111" : base.stroke;
            const opacity = isHover ? 1 : base.opacity;

            // label position
            const midAngle = start + anglePer / 2;
            const labelPos = polarToCartesian(cx, cy, (outer + inner) / 2, midAngle);

            return (
              <g
                key={p}
                onMouseEnter={() => setHovered(p)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => activate(p)}
                style={{ cursor: st === "LOCKED" ? "not-allowed" : "pointer" }}
              >
                <path d={d} fill={fill} opacity={opacity} stroke={stroke} strokeWidth={isActive ? 2.5 : 1.5} />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontSize: 10.5,
                    fontWeight: isActive ? 900 : 700,
                    fill: labelColor(st, isActive),
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  {phaseLabel(p)}
                </text>
              </g>
            );
          })}

          {/* Center summary */}
          <circle cx={cx} cy={cy} r={inner - 12} fill="#fff" stroke="#eee" strokeWidth={1.5} />
          <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 13, fontWeight: 900, fill: "#111" }}>
            {phaseLabel(active)}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: "#666" }}>
            Status: {activeStatus}
          </text>
        </svg>
      </div>

      {/* Side panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#111" }}>{phaseLabel(active)}</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: activeStatus === "BLOCKED" ? "#b91c1c" : "#666" }}>
            {activeStatus}
          </div>
        </div>

        <div style={{ fontSize: 13, color: "#444", lineHeight: 1.55 }}>{phaseSummary(active)}</div>

        {activeStatus === "BLOCKED" && activeBlockers.length > 0 && (
          <div
            style={{
              border: "1px solid #fee2e2",
              background: "#fff7f7",
              borderRadius: 14,
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 900, color: "#b91c1c", fontSize: 13 }}>Blocked by</div>
            <ul style={{ margin: "8px 0 0 18px", padding: 0, color: "#7f1d1d", fontSize: 12.5, lineHeight: 1.5 }}>
              {activeBlockers.map((b, idx) => (
                <li key={idx}>{b}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
          <button
            onClick={() => onChange(transition(state, { type: "BACK" }))}
            style={{
              border: "1px solid #e6e6e6",
              background: "#fff",
              borderRadius: 999,
              padding: "9px 12px",
              fontSize: 13,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Back
          </button>
          <button
            onClick={() => onChange(transition(state, { type: "NEXT" }))}
            style={{
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              borderRadius: 999,
              padding: "9px 12px",
              fontSize: 13,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Next
          </button>
          <button
            onClick={() => markDone(active)}
            style={{
              border: "1px solid #e6e6e6",
              background: "#fff",
              borderRadius: 999,
              padding: "9px 12px",
              fontSize: 13,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Mark Done
          </button>
          <button
            onClick={() => reopen(active)}
            style={{
              border: "1px solid #e6e6e6",
              background: "#fff",
              borderRadius: 999,
              padding: "9px 12px",
              fontSize: 13,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Reopen
          </button>
        </div>

        <div
          style={{
            marginTop: 6,
            borderTop: "1px solid #eee",
            paddingTop: 10,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#111" }}>Legend</div>
            <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 12, color: "#444" }}>
              <div>
                <span style={{ fontWeight: 900 }}>DONE</span> — completed
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>AVAILABLE</span> — can work now
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>BLOCKED</span> — prerequisites missing
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>LOCKED</span> — earlier phase incomplete
              </div>
            </div>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#111" }}>Quick tips</div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#444", lineHeight: 1.45 }}>
              Click any segment to jump. Locked segments prevent skipping. Blocked segments show explicit reasons.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
