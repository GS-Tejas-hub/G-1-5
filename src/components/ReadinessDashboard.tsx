import React from "react";
import { fetchBlockingSummary, fetchFinancial, fetchReadiness, fetchRisk, recomputeEpic5 } from "../lib/api";
import type { ApiRole } from "../lib/api";

type Props = {
  cycleId: string;
  role: ApiRole;
};

export function ReadinessDashboard({ cycleId, role }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [readiness, setReadiness] = React.useState<any>(null);
  const [risk, setRisk] = React.useState<any>(null);
  const [finance, setFinance] = React.useState<any>(null);
  const [blocking, setBlocking] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [r, k, b] = await Promise.all([
        fetchReadiness({ cycle_id: cycleId }),
        fetchRisk({ cycle_id: cycleId }),
        fetchBlockingSummary({ cycle_id: cycleId }),
      ]);
      setReadiness(r);
      setRisk(k);
      setBlocking(b);

      // Finance might be forbidden (Supplier) – handle gracefully
      try {
        const f = await fetchFinancial({ cycle_id: cycleId });
        setFinance(f);
      } catch (e: any) {
        setFinance({ message: "Not authorized to view financial exposure." });
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load EPIC-5");
    } finally {
      setLoading(false);
    }
  }

  async function recompute() {
    setLoading(true);
    setErr(null);
    try {
      await recomputeEpic5({ cycle_id: cycleId });
      await load();
    } catch (e: any) {
      setErr(e?.message || "Recompute failed");
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (cycleId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>EPIC-5 — Readiness, Risk & Exposure</h2>
        <div style={{ flex: 1 }} />
        <button onClick={recompute} disabled={loading} style={{ padding: "8px 12px" }}>
          Recompute
        </button>
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}
      {loading && <div>Loading…</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Readiness</h3>
          {readiness ? (
            <>
              <div><b>State:</b> {readiness.state}</div>
              <div><b>Readiness %:</b> {readiness.readiness_pct}</div>
              <div><b>Variable completion %:</b> {readiness.variable_completion_pct}</div>
              <div style={{ marginTop: 8 }}>
                <b>Gates</b>
                <ul style={{ margin: "6px 0 0 18px" }}>
                  {Object.entries(readiness.gates || {}).map(([k, v]) => (
                    <li key={k}>{k}: {String(v)}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div>—</div>
          )}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Blocking Summary</h3>
          {blocking ? (
            <>
              <div><b>Open blocking obligations:</b> {blocking.blocking_obligations_open}</div>
              <div><b>Missing required variables:</b> {blocking.blocking_variables_missing}</div>
              <div><b>Estimated need confirmation:</b> {blocking.estimated_need_confirmation}</div>
            </>
          ) : (
            <div>—</div>
          )}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Risk</h3>
          {risk ? (
            <>
              <div><b>Risk score:</b> {risk.risk_score}</div>
              <div><b>Probability:</b> {risk.probability}</div>
              <div><b>Impact:</b> {risk.impact}</div>
              {role !== "Investor" && Array.isArray(risk.per_obligation) && (
                <div style={{ marginTop: 8 }}>
                  <b>Per obligation</b>
                  <ul style={{ margin: "6px 0 0 18px" }}>
                    {risk.per_obligation.slice(0, 6).map((o: any) => (
                      <li key={o.obligation_id}>
                        {o.obligation_id} — {o.status} — risk {o.risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div>—</div>
          )}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Financial Exposure</h3>
          {finance ? (
            finance.message ? (
              <div>{finance.message}</div>
            ) : (
              <>
                <div><b>Potential penalty (assumed):</b> {finance.potential_penalty}</div>
                <div><b>Expected exposure:</b> {finance.expected_exposure}</div>
                <div><b>Operational impact estimate:</b> {finance.operational_impact_estimate}</div>
                <div><b>Reporting cost estimate:</b> {finance.reporting_cost_estimate}</div>
              </>
            )
          ) : (
            <div>—</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
        Cycle: <code>{cycleId}</code>
      </div>
    </div>
  );
}
