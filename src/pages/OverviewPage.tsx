// src/pages/OverviewPage.tsx
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import ObligationsInbox from "../components/ObligationsInbox";
import { useVersionApp } from "../state";
import { getVariablesSummary } from "../lib/api";
import VariablesDrawer from "../components/VariablesDrawer";

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  sub?: string;
};

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ececec",
        borderRadius: 14,
        padding: 14,
        minHeight: 78,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 750, color: "#111" }}>{value}</div>
      {sub ? <div style={{ fontSize: 12, color: "#777" }}>{sub}</div> : null}
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "danger" | "neutral";
  children: React.ReactNode;
}) {
  const bg =
    tone === "ok"
      ? "#eaf7ef"
      : tone === "warn"
      ? "#fff5e6"
      : tone === "danger"
      ? "#fdecec"
      : "#f3f3f3";
  const border =
    tone === "ok"
      ? "#cfeedd"
      : tone === "warn"
      ? "#ffe0b5"
      : tone === "danger"
      ? "#f6c7c7"
      : "#e6e6e6";
  const color =
    tone === "ok"
      ? "#1a7f4b"
      : tone === "warn"
      ? "#9a5b00"
      : tone === "danger"
      ? "#b42318"
      : "#444";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${border}`,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 650,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 750, color: "#111" }}>{title}</div>
      {right}
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const size = 120;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;

  return (
    <div style={{ display: "grid", placeItems: "center", width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#efefef" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#111"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ position: "absolute", textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{pct}%</div>
        <div style={{ fontSize: 12, color: "#666" }}>Readiness</div>
      </div>
    </div>
  );
}

function ActionCard({
  tone,
  title,
  subtitle,
  onClick,
}: {
  tone: "danger" | "warn" | "ok" | "neutral";
  title: string;
  subtitle: string;
  onClick?: () => void;
}) {
  const bg =
    tone === "ok" ? "#f3fbf6" : tone === "warn" ? "#fff8ee" : tone === "danger" ? "#fff1f1" : "#f7f7f7";
  const border =
    tone === "ok" ? "#d8f1e3" : tone === "warn" ? "#ffe6c8" : tone === "danger" ? "#f7d1d1" : "#ececec";

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 14,
        padding: 14,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontWeight: 800, color: "#111", fontSize: 13 }}>{title}</div>
          <div style={{ color: "#666", fontSize: 12 }}>{subtitle}</div>
        </div>
        <div style={{ color: "#777", fontSize: 18, lineHeight: 1 }}>›</div>
      </div>
    </button>
  );
}

function PrimaryCTA({ label, hint, onClick }: { label: string; hint?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        background: "#111",
        color: "#fff",
        border: "1px solid #111",
        borderRadius: 14,
        padding: "12px 14px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        alignItems: "flex-start",
      }}
    >
      <div style={{ fontWeight: 850, fontSize: 13 }}>{label}</div>
      {hint ? <div style={{ fontSize: 12, color: "#d8d8d8" }}>{hint}</div> : null}
    </button>
  );
}

function SecondaryCTA({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        background: "#fff",
        color: "#111",
        border: "1px solid #e6e6e6",
        borderRadius: 14,
        padding: "10px 14px",
        cursor: "pointer",
        fontWeight: 750,
        fontSize: 13,
        textAlign: "left",
      }}
    >
      {label}
    </button>
  );
}

function TimelineItem({
  title,
  meta,
  tone,
}: {
  title: string;
  meta: string;
  tone: "ok" | "warn" | "danger" | "neutral";
}) {
  const dot =
    tone === "ok" ? "#1a7f4b" : tone === "warn" ? "#9a5b00" : tone === "danger" ? "#b42318" : "#777";

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{ width: 10, height: 10, borderRadius: 999, background: dot, marginTop: 4 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 750, color: "#111" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#666" }}>{meta}</div>
      </div>
    </div>
  );
}

/**
 * Phase-1 Overview Dashboard (high-fidelity wireframe style)
 */
export function OverviewPage() {
  const { role } = useVersionApp();
  const cycleId = "CYCLE-DEMO-2026Q1";
  const [varsOpen, setVarsOpen] = useState(false);
  const [summary, setSummary] = useState<{ missing: number; estimated: number; verified: number } | null>(null);

  useEffect(() => {
    let alive = true;
    getVariablesSummary(role, cycleId)
      .then((s) => {
        if (!alive) return;
        setSummary({ missing: s.missing, estimated: s.estimated, verified: s.verified });
      })
      .catch(() => {
        if (!alive) return;
        setSummary(null);
      });
    return () => {
      alive = false;
    };
  }, [role]);

  const actionQueue = useMemo(
    () => [
      {
        tone: "danger" as const,
        title: `${summary?.missing ?? "—"} Blocking variables missing`,
        subtitle: "Provide values + attach evidence",
      },
      {
        tone: "warn" as const,
        title: `${summary?.estimated ?? "—"} Estimated need confirmation`,
        subtitle: "Convert to VERIFIED where possible",
      },
      {
        tone: "ok" as const,
        title: `${summary?.verified ?? "—"} Verified variables`,
        subtitle: "All good — keep traceable citations",
      },
    ],
    [summary]
  );

  // Replace these with real API data later
  const mock = {
    regulation: "CBAM",
    version: "2026 v1",
    stage: "COLLECT",
    readiness: 92,
    blockers: 2,
    dueInDays: 18,
    statusPills: [
      { tone: "ok" as const, text: "✔ Regulation uploaded" },
      { tone: "ok" as const, text: "✔ Scope accepted" },
      { tone: "warn" as const, text: "⚠ Applicability not checked" },
    ],
    // actionQueue comes from EPIC-4 summary
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <VariablesDrawer open={varsOpen} onClose={() => setVarsOpen(false)} role={role} cycleId={cycleId} />
      {/* Page header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 850, color: "#111" }}>Overview</div>
          <div style={{ color: "#666", fontSize: 13 }}>
            Your guided rhythm: <b>Understand → Scope → Apply → Collect → Review</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Pill tone="neutral">Persona: {role}</Pill>
          <Pill tone="neutral">Cycle: 2026-Q1</Pill>
          <Pill tone="neutral">Tenant: ORG-01</Pill>
        </div>
      </div>

      {/* Main grid (center + right rail) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.55fr 0.85fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        {/* Center column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Top section — Compliance status snapshot */}
          <div style={{ background: "#fff", border: "1px solid #eaeaea", borderRadius: 16, padding: 16 }}>
            <SectionTitle
              title="Compliance Status Snapshot"
              right={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {mock.statusPills.map((p, idx) => (
                    <Pill key={idx} tone={p.tone}>
                      {p.text}
                    </Pill>
                  ))}
                </div>
              }
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: 12,
              }}
            >
              <StatCard label="Current Regulation" value={mock.regulation} sub="Legal basis (frozen)" />
              <StatCard label="Current Version" value={mock.version} sub="version_id locked after activation" />
              <StatCard label="Compliance Stage" value={mock.stage} sub="Phase 1 execution" />
              <StatCard label="Due Date Countdown" value={`${mock.dueInDays} days`} sub="Next deadline window" />
            </div>

            <div style={{ display: "flex", gap: 14, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <ProgressRing value={mock.readiness} />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Pill tone={mock.blockers > 0 ? "danger" : "ok"}>
                      Blocking: <b>{mock.blockers}</b>
                    </Pill>
                    <Pill tone="neutral">Evidence: Connected</Pill>
                    <Pill tone="neutral">Citations: Required</Pill>
                  </div>

                  <div style={{ color: "#666", fontSize: 13, maxWidth: 420 }}>
                    Focus on clearing blockers first. When blockers go to zero, your readiness can reach 100% and unlock{" "}
                    <b>Request Approval</b>.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle — My Action Queue */}
          <div style={{ background: "#fff", border: "1px solid #eaeaea", borderRadius: 16, padding: 16 }}>
            <SectionTitle title="My Action Queue" right={<Pill tone="neutral">Today</Pill>} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {actionQueue.map((a, idx) => (
                <ActionCard
                  key={idx}
                  tone={a.tone}
                  title={a.title}
                  subtitle={a.subtitle}
                  onClick={() => {
                    setVarsOpen(true);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Bottom — Timeline */}
          <div style={{ background: "#fff", border: "1px solid #eaeaea", borderRadius: 16, padding: 16 }}>
            <SectionTitle title="Timeline View" right={<Pill tone="neutral">Last 7 days</Pill>} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <TimelineItem tone="ok" title="Regulation uploaded" meta="EPIC-1 • Version created • Fingerprint computed" />
                <TimelineItem tone="ok" title="Scope accepted" meta="EPIC-1 • Data Steward locked scope_json" />
                <TimelineItem tone="warn" title="Applicability pending" meta="EPIC-2 • Not evaluated for this period" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <TimelineItem tone="danger" title="Blocking variables missing" meta="EPIC-4 • 3 items need values" />
                <TimelineItem tone="neutral" title="Last activity" meta="2 hours ago • Evidence uploaded by Supplier" />
                <TimelineItem tone="neutral" title="Upcoming" meta="Recompute readiness after evidence confirmation" />
              </div>
            </div>
          </div>
        </div>

        {/* Right rail — Next Recommended Action */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#fff", border: "1px solid #eaeaea", borderRadius: 16, padding: 16 }}>
            <SectionTitle title="Next Recommended Action" />
            {/* One primary CTA only */}
            <PrimaryCTA
              label="➡ Provide Missing Variables"
              hint="Resolve blockers → unlock approval"
              onClick={() => setVarsOpen(true)}
            />
            <div style={{ height: 10 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <SecondaryCTA label="Upload Evidence" onClick={() => setVarsOpen(true)} />
              <SecondaryCTA label="Run Applicability Check" onClick={() => console.log("applicability") } />
              <SecondaryCTA label="Recompute Readiness" onClick={() => window.location.reload()} />
            </div>

            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #efefef" }}>
              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>
                <b>Tip:</b> If Applicability isn’t checked, you may be collecting data for a regulation that doesn’t apply
                this period. Run it once to avoid wasted effort.
              </div>
            </div>
          </div>

          {/* Quick links block */}
          <div style={{ background: "#fff", border: "1px solid #eaeaea", borderRadius: 16, padding: 16 }}>
            <SectionTitle title="Quick Links" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <SecondaryCTA label="Go to Upload (EPIC-1)" />
              <SecondaryCTA label="Edit Scope (Data Steward)" />
              <SecondaryCTA label="Review Obligations (EPIC-3)" />
              <SecondaryCTA label="Variables Workspace (EPIC-4)" />
              <SecondaryCTA label="Readiness & Risk (EPIC-5)" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <ObligationsInbox
          role={role}
          org_id="DEMO"
          regulation_key="CBAM"
          version_id="VER-2026-0001"
          period_id="2026-Q1"
        />
      </div>
    </div>
  );
}