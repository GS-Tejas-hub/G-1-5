// src/pages/LifecycleWheelPage.tsx
import * as React from "react";
import { LifecycleWheel } from "../components/LifecycleWheel";
import {
  LifecycleState,
  initialLifecycleState,
  hydrateDoneFromSignals,
  phaseStatus,
  phaseLabel,
  PHASE_ORDER,
} from "../state/lifecycleMachine";
import { useVersion } from "../state";
import {
  createUiCycle,
  CreateCycleRequest,
  getWheelSignals,
  getUiCycles,
  getUiVersions,
  getUiRegulations,
  UiCycle,
  UiVersion,
  UiRegulation,
  WheelSignals,
} from "../lib/api";

const LS_KEY = "grenomy_lifecycle_wheel_v1";
const DEFAULT_CYCLE_ID = "CYCLE-DEMO-2026Q1";
const CYCLE_LS_KEY = "grenomy_selected_cycle_id_v1";

function safeLoad(): Partial<LifecycleState> | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<LifecycleState>;
  } catch {
    return null;
  }
}

function safeSave(state: LifecycleState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export default function LifecycleWheelPage() {
  const app = useVersion();

  const [state, setState] = React.useState<LifecycleState>(() => {
    const saved = safeLoad();
    return { ...initialLifecycleState(), ...(saved || {}) } as LifecycleState;
  });

  const [signals, setSignals] = React.useState<WheelSignals | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [cycles, setCycles] = React.useState<UiCycle[]>([]);
  const [versions, setVersions] = React.useState<UiVersion[]>([]);
  const [regulations, setRegulations] = React.useState<UiRegulation[]>([]);
  const [selectedRegulationKey, setSelectedRegulationKey] = React.useState<string>("");
  const [cycleId, setCycleId] = React.useState<string>(() => {
    try {
      return localStorage.getItem(CYCLE_LS_KEY) || DEFAULT_CYCLE_ID;
    } catch {
      return DEFAULT_CYCLE_ID;
    }
  });

  // Create-cycle UI state
  const [showCreate, setShowCreate] = React.useState(false);
  const [createOrgId, setCreateOrgId] = React.useState("DEMO");
  const [createPeriod, setCreatePeriod] = React.useState("2026-Q1");
  const [createRegulationKey, setCreateRegulationKey] = React.useState<string>("");
  const [createVersionId, setCreateVersionId] = React.useState<string>(() => (app?.version_chain?.selected_version_id as any) || "VER-2026-0001");
  const [createBusy, setCreateBusy] = React.useState(false);
  const [createMsg, setCreateMsg] = React.useState<string | null>(null);

  function persistCycle(id: string) {
    setCycleId(id);
    try {
      localStorage.setItem(CYCLE_LS_KEY, id);
    } catch {
      // ignore
    }
  }

  async function refreshCycles() {
    const res = await getUiCycles(app.role as any);
    const items = res.items || [];
    setCycles(items);
    if (items.length > 0 && !items.some((c) => c.cycle_id === cycleId)) {
      persistCycle(items[0].cycle_id);
    }
  }


  async function refreshVersions() {
    try {
      const res = await getUiVersions(app.role as any);
      const items = res.items || [];
      setVersions(items);
      // default selection if not present
      if (items.length > 0 && !items.some((v) => v.version_id === createVersionId)) {
        setCreateVersionId(items[0].version_id);
      }
    } catch {
      // ignore
    }
  }

async function refreshRegulations() {
  try {
    const res = await getUiRegulations(app.role as any);
    const items = res.items || [];
    setRegulations(items);
    if (items.length > 0 && !selectedRegulationKey) {
      setSelectedRegulationKey(items[0].regulation_key);
    }
    if (items.length > 0 && !createRegulationKey) {
      setCreateRegulationKey(items[0].regulation_key);
    }
  } catch {
    // ignore
  }
}



  // Load available cycles for dropdown
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await refreshCycles();
        await refreshVersions();
        await refreshRegulations();
      } catch {
        // ignore - wheel can still run with default cycleId
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.role]);

  
React.useEffect(() => {
  if (!selectedRegulationKey) return;
  const vlist = versions.filter((v) => v.regulation_key === selectedRegulationKey);
  if (vlist.length === 0) return;
  // If current createVersionId doesn't belong to selected regulation, switch to first.
  if (!vlist.some((v) => v.version_id === createVersionId)) {
    setCreateVersionId(vlist[0].version_id);
  }
}, [selectedRegulationKey, versions]);

React.useEffect(() => {
  if (createRegulationKey && createRegulationKey !== selectedRegulationKey) {
    setSelectedRegulationKey(createRegulationKey);
  }
}, [createRegulationKey]);


// Poll wheel signals so the wheel reflects real EPIC facts.
  React.useEffect(() => {
    let alive = true;

    async function tick() {
      try {
        const s = await getWheelSignals(app.role as any, cycleId);
        if (!alive) return;
        setSignals(s);
        setErr(null);
        setState((prev) => {
          const next = hydrateDoneFromSignals(prev, s.phase_done || {});
          safeSave(next);
          return next;
        });
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || String(e));
      }
    }

    tick();
    const id = window.setInterval(tick, 5000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [app.role, cycleId]);

  const filteredVersions = React.useMemo(() => {
    if (!selectedRegulationKey) return versions;
    return versions.filter((v) => v.regulation_key === selectedRegulationKey);
  }, [versions, selectedRegulationKey]);

  const statuses = React.useMemo(() => {
    return PHASE_ORDER.map((p) => phaseStatus(state, p));
  }, [state]);

  async function onCreateCycle() {
    setCreateMsg(null);
    setCreateBusy(true);
    try {
      const req: CreateCycleRequest = {
        org_id: createOrgId.trim() || "DEMO",
        version_id: app.version_chain.selected_version_id,
        reporting_period: createPeriod.trim(),
      };
      const res = await createUiCycle(app.role as any, req);
      setCreateMsg(`Created: ${res.cycle.cycle_id}`);
      await refreshCycles();
      persistCycle(res.cycle.cycle_id);
      setShowCreate(false);
    } catch (e: any) {
      setCreateMsg(e?.message || String(e));
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>ESG Lifecycle Wheel</h2>

        <div style={{ opacity: 0.75, fontSize: 12 }}>
          Cycle: <b>{cycleId}</b> • Role: <b>{app.role}</b> • Version: <b>{app.version_chain.selected_version_id}</b>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, opacity: 0.8 }}>Select cycle:</label>
          <select
            value={cycleId}
            onChange={(e) => persistCycle(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.2)" }}
          >
            {(cycles.length ? cycles : [{ cycle_id: cycleId, regulation_key: "", version_id: "", reporting_period: "", status: "" } as any]).map(
              (c) => (
                <option key={c.cycle_id} value={c.cycle_id}>
                  {c.cycle_id}
                  {c.reporting_period ? ` — ${c.reporting_period}` : ""}
                  {c.regulation_key ? ` — ${c.regulation_key}` : ""}
                </option>
              )
            )}
          </select>

          <button
            onClick={() => { setShowCreate(true); setCreateMsg(null); }}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: "white",
              cursor: "pointer",
            }}
          >
            + Create cycle
          </button>
        </div>
      </div>

      {showCreate ? (
        <div
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            maxWidth: 780,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Create new compliance cycle</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, opacity: 0.8 }}>Org ID</label>
              <input
                value={createOrgId}
                onChange={(e) => setCreateOrgId(e.target.value)}
                style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.2)" }}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, opacity: 0.8 }}>Reporting period</label>
              <input
                value={createPeriod}
                onChange={(e) => setCreatePeriod(e.target.value)}
                placeholder="e.g., 2026-Q1"
                style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.2)" }}
              />
            </div>

            <div style={{ display: "grid", gap: 6, minWidth: 240 }}>
  <label style={{ fontSize: 12, opacity: 0.8 }}>Regulation</label>
  <select
    value={createRegulationKey || selectedRegulationKey}
    onChange={(e) => {
      setCreateRegulationKey(e.target.value);
      setSelectedRegulationKey(e.target.value);
    }}
    style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.2)" }}
  >
    {regulations.map((r) => (
      <option key={r.regulation_key} value={r.regulation_key}>
        {r.title}
      </option>
    ))}
  </select>
</div>

<div style={{ display: "grid", gap: 6, minWidth: 260 }}>
  <label style={{ fontSize: 12, opacity: 0.8 }}>Version</label>
  <select
    value={createVersionId}
    onChange={(e) => setCreateVersionId(e.target.value)}
    style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.2)" }}
  >
    {(filteredVersions.length ? filteredVersions : versions).map((v) => (
      <option key={v.version_id} value={v.version_id}>
        {v.version_id} {v.status ? `(${v.status})` : ""}
      </option>
    ))}
  </select>
  <div style={{ fontSize: 12, opacity: 0.7 }}>
    {(() => {
      const vv = versions.find((x) => x.version_id === createVersionId);
      if (!vv) return null;
      return `${vv.regulation_key}${vv.title ? " — " + vv.title : ""}`;
    })()}
  </div>
</div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={onCreateCycle}
                disabled={createBusy || !createPeriod.trim()}
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.2)",
                  background: createBusy ? "#f2f2f2" : "white",
                  cursor: createBusy ? "not-allowed" : "pointer",
                }}
              >
                {createBusy ? "Creating…" : "Create"}
              </button>

              <button
                onClick={() => setShowCreate(false)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.2)",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>

          {createMsg ? (
            <div style={{ marginTop: 8, fontSize: 12, color: createMsg.startsWith("Created") ? "green" : "crimson" }}>
              {createMsg}
            </div>
          ) : null}

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
            Note: regulation_key is derived from the selected version on the backend.
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 520px", minWidth: 360 }}>
          <LifecycleWheel
            state={state}
            onChange={(next) => {
              safeSave(next);
              setState(next);
            }}
          />
        </div>

        <div style={{ flex: "1 1 360px", minWidth: 320 }}>
          <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Live gating signals</div>

            {err ? <div style={{ color: "crimson", fontSize: 12 }}>API error: {err}</div> : null}

            <div style={{ fontSize: 12, display: "grid", gap: 6 }}>
              <div>
                Scope: <b>{signals?.scope?.state || "UNKNOWN"}</b>
              </div>
              <div>
                Applicability: <b>{signals?.applicability_latest?.decision || "NOT_RUN"}</b>
              </div>
              <div>
                Obligations open / blocking:{" "}
                <b>
                  {signals?.counts?.obligations_open ?? "-"} / {signals?.counts?.obligations_blocking_open ?? "-"}
                </b>
              </div>
              <div>
                Variables missing required: <b>{signals?.counts?.variables_required_missing ?? "-"}</b>
              </div>
              <div>
                Snapshot present: <b>{signals?.epic5?.snapshot_present ? "YES" : "NO"}</b>
              </div>
            </div>

            <hr style={{ margin: "12px 0" }} />

            <div style={{ fontWeight: 700, marginBottom: 8 }}>Phase status</div>
            <div style={{ display: "grid", gap: 6 }}>
              {PHASE_ORDER.map((p, idx) => {
                const st = statuses[idx];
                return (
                  <div
                    key={p}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      padding: "6px 8px",
                      borderRadius: 10,
                      border: "1px solid #eee",
                    }}
                  >
                    <span>{phaseLabel(p)}</span>
                    <span style={{ fontWeight: 700 }}>{st}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
              Tip: run EPIC-2 applicability, derive EPIC-3 obligations, set EPIC-4 variables, then recompute EPIC-5 to see the wheel move.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
