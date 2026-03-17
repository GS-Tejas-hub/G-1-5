import React, { useEffect, useMemo, useState } from "react";
import { getApplicabilityHistory, getApplicabilityLatest, overrideApplicability, runApplicability } from "../lib/api";
import { can } from "../lib/rbac";
import { useAppState, useVersionNode } from "../state";

const PERIODS = [
  { period_id: "FY2025", start_date: "2025-04-01", end_date: "2026-03-31" },
  { period_id: "FY2024", start_date: "2024-04-01", end_date: "2025-03-31" },
];

function Pill({ tone, children }: { tone: "good" | "warn" | "bad" | "neutral"; children: React.ReactNode }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "warn"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : tone === "bad"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-neutral-50 text-neutral-700 border-neutral-200";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>{children}</span>;
}

export function ApplicabilityPage() {
  const { role } = useAppState();
  const v = useVersionNode();
  const [periodId, setPeriodId] = useState(PERIODS[0].period_id);
  const period = useMemo(() => PERIODS.find((p) => p.period_id === periodId) || PERIODS[0], [periodId]);

  const [latest, setLatest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overrideStatus, setOverrideStatus] = useState<"APPLICABLE" | "NOT_APPLICABLE">("APPLICABLE");
  const [overrideReason, setOverrideReason] = useState("Policy clarification / corrected org profile");

  async function refresh() {
    if (!v) return;
    setError(null);
    try {
      const h = await getApplicabilityHistory(role, v.version_id, periodId);
      setHistory(h.decisions || []);
      const l = await getApplicabilityLatest(role, v.version_id, periodId);
      setLatest((l as any).latest || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load applicability");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v?.version_id, periodId, role]);

  async function onRun() {
    if (!v) return;
    setLoading(true);
    setError(null);
    try {
      await runApplicability(role, v.version_id, period);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Run failed");
    } finally {
      setLoading(false);
    }
  }

  async function onOverride() {
    if (!latest) return;
    setLoading(true);
    setError(null);
    try {
      await overrideApplicability(role, latest.decision_id, overrideStatus, overrideReason);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Override failed");
    } finally {
      setLoading(false);
    }
  }

  const statusTone =
    latest?.applicability_status === "APPLICABLE"
      ? "good"
      : latest?.applicability_status === "NOT_APPLICABLE"
      ? "neutral"
      : latest?.applicability_status === "INSUFFICIENT_DATA"
      ? "warn"
      : "neutral";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Applicability</h2>
          <p className="text-xs text-neutral-500">EPIC-2 — deterministic evaluation + override + decision history.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700">
            Version: <span className="font-medium">{v?.version_id || "—"}</span>
          </div>
          <select
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          >
            {PERIODS.map((p) => (
              <option key={p.period_id} value={p.period_id}>
                {p.period_id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: status + controls */}
        <div className="col-span-8 space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Applicability Status Snapshot</div>
              {latest ? <Pill tone={statusTone as any}>{latest.applicability_status}</Pill> : <Pill tone="neutral">No decision</Pill>}
            </div>

            <div className="mt-3 grid grid-cols-4 gap-3">
              <div className="rounded-lg border border-neutral-200 p-3">
                <div className="text-xs text-neutral-500">Ruleset</div>
                <div className="text-sm font-semibold">{latest?.ruleset_version || "v1"}</div>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <div className="text-xs text-neutral-500">Score</div>
                <div className="text-sm font-semibold">{latest ? latest.score : "—"}</div>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <div className="text-xs text-neutral-500">Computed By</div>
                <div className="text-sm font-semibold">{latest?.computed_by_role || "—"}</div>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <div className="text-xs text-neutral-500">Override</div>
                <div className="text-sm font-semibold">{latest ? (latest.override ? "Yes" : "No") : "—"}</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-neutral-500">
                Period: <span className="font-medium">{period.start_date}</span> → <span className="font-medium">{period.end_date}</span>
              </div>
              <button
                onClick={onRun}
                disabled={loading || !can(role, "applicability:run") || !v}
                className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Running…" : "Run Applicability"}
              </button>
            </div>

            {error ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-neutral-200 p-3">
                <div className="text-xs font-medium">Rule Hits</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(latest?.rule_hits || []).length ? (latest.rule_hits || []).map((x: string) => <Pill key={x} tone="good">{x}</Pill>) : <span className="text-xs text-neutral-500">—</span>}
                </div>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <div className="text-xs font-medium">Rule Misses / Missing Data</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(latest?.missing_profile_fields || []).map((x: string) => (
                    <Pill key={x} tone="warn">MISSING:{x}</Pill>
                  ))}
                  {(latest?.rule_misses || []).length
                    ? (latest.rule_misses || []).map((x: string) => <Pill key={x} tone="neutral">{x}</Pill>)
                    : (latest?.missing_profile_fields || []).length
                    ? null
                    : <span className="text-xs text-neutral-500">—</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Decision History</div>
              <div className="text-xs text-neutral-500">Audit-ready chain of decisions</div>
            </div>
            <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="px-3 py-2">Decision</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">By</th>
                    <th className="px-3 py-2">Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {history.length ? (
                    history
                      .slice()
                      .reverse()
                      .map((d: any) => (
                        <tr key={d.decision_id} className="bg-white">
                          <td className="px-3 py-2 font-mono">{d.decision_id}</td>
                          <td className="px-3 py-2">{d.applicability_status}</td>
                          <td className="px-3 py-2">{d.score}</td>
                          <td className="px-3 py-2">{d.computed_by_role}</td>
                          <td className="px-3 py-2">{d.override ? `Yes (base: ${d.base_decision_id})` : "No"}</td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td className="px-3 py-3 text-neutral-500" colSpan={5}>
                        No decisions yet. Click “Run Applicability”.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="col-span-4 space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="text-sm font-medium">Next Recommended Action</div>
            <div className="mt-2 text-xs text-neutral-500">
              One primary action at a time — run applicability, then optionally override (Data Steward / Owner), then proceed to obligations.
            </div>
            <button
              onClick={onRun}
              disabled={loading || !can(role, "applicability:run") || !v}
              className="mt-4 w-full rounded-md bg-black px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              ➜ Run Applicability
            </button>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Override (Governed)</div>
              {can(role, "applicability:override") ? <Pill tone="warn">Permitted</Pill> : <Pill tone="neutral">Read-only</Pill>}
            </div>
            <div className="mt-2 text-xs text-neutral-500">
              Overrides are logged to the immutable ledger with reason and base decision link.
            </div>

            <div className="mt-3 space-y-2">
              <select
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs"
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value as any)}
                disabled={!can(role, "applicability:override") || !latest}
              >
                <option value="APPLICABLE">APPLICABLE</option>
                <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
              </select>
              <textarea
                className="h-20 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                disabled={!can(role, "applicability:override") || !latest}
              />
              <button
                onClick={onOverride}
                disabled={loading || !can(role, "applicability:override") || !latest}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply Override
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
