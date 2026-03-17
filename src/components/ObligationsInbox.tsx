import React, { useEffect, useMemo, useState } from "react";
import { assignObligation, deriveObligations, listObligations, Obligation } from "../lib/api";
import { ApiRole } from "../lib/api";
import { can } from "../lib/rbac";

type Props = {
  role: ApiRole;
  org_id: string;
  regulation_key: string;
  version_id: string;
  period_id: string;
};

export default function ObligationsInbox(props: Props) {
  const { role, org_id, regulation_key, version_id, period_id } = props;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Obligation[]>([]);
  const [selected, setSelected] = useState<Obligation | null>(null);
  const [assignRole, setAssignRole] = useState<string>("Operator");
  const [assignTo, setAssignTo] = useState<string>("");
  const [assignDue, setAssignDue] = useState<string>("");

  const summary = useMemo(() => {
    const blocking = items.filter((o) => o.severity === "blocking" || o.blocking_flag).length;
    const informational = items.length - blocking;
    const assigned = items.filter((o) => !!o.assigned_role).length;
    return { blocking, informational, assigned, total: items.length };
  }, [items]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await listObligations(role, { org_id, regulation_key, version_id, period_id });
      if (res.obligations?.length) {
        setItems(res.obligations);
      } else if (can(role, "obligations:derive")) {
        const d = await deriveObligations(role, { org_id, regulation_key, version_id, period_id });
        setItems(d.obligations || []);
      } else {
        setItems([]);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load obligations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, org_id, regulation_key, version_id, period_id]);

  async function doAssign() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await assignObligation(role, {
        org_id,
        regulation_key,
        version_id,
        period_id,
        obligation_id: selected.obligation_id,
        assigned_role: assignRole,
        assigned_to: assignTo || undefined,
        due_date: assignDue || undefined,
      });
      setSelected(res.obligation);
      // optimistic update
      setItems((prev) => prev.map((o) => (o.obligation_id === res.obligation.obligation_id ? res.obligation : o)));
    } catch (e: any) {
      setError(e?.message || "Failed to assign obligation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 18px",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Obligations Inbox (EPIC-3)</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            {summary.total} total • {summary.blocking} blocking • {summary.informational} informational • {summary.assigned} assigned
          </div>
        </div>
        <button
          style={{
            fontSize: 12,
            borderRadius: 14,
            border: "1px solid #e5e7eb",
            padding: "8px 10px",
            background: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
          }}
          onClick={refresh}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error ? <div style={{ padding: "10px 18px", fontSize: 12, color: "#be123c" }}>{error}</div> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 14,
          padding: 18,
        }}
      >
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {loading && items.length === 0 ? (
              <div style={{ fontSize: 12, color: "#64748b" }}>Loading…</div>
            ) : null}
            {items.map((o) => (
              <button
                key={o.obligation_id}
                onClick={() => {
                  setSelected(o);
                  setAssignRole(o.assigned_role || "Operator");
                  setAssignTo(o.assigned_to || "");
                  setAssignDue(o.due_date || "");
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: 18,
                  border: `1px solid ${selected?.obligation_id === o.obligation_id ? "#94a3b8" : "#e5e7eb"}`,
                  padding: "12px 14px",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{o.title}</div>
                  <div
                    style={{
                      fontSize: 11,
                      borderRadius: 999,
                      padding: "4px 8px",
                      border: `1px solid ${o.severity === "blocking" || o.blocking_flag ? "#fecdd3" : "#bbf7d0"}`,
                      color: o.severity === "blocking" || o.blocking_flag ? "#be123c" : "#047857",
                    }}
                  >
                    {o.severity}
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#475569" }}>{o.summary || "—"}</div>
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, color: "#475569" }}>
                  <span style={{ borderRadius: 999, border: "1px solid #e5e7eb", padding: "4px 8px" }}>{o.obligation_id}</span>
                  {o.due_date ? (
                    <span style={{ borderRadius: 999, border: "1px solid #e5e7eb", padding: "4px 8px" }}>Due {o.due_date}</span>
                  ) : null}
                  {o.assigned_role ? (
                    <span style={{ borderRadius: 999, border: "1px solid #e5e7eb", padding: "4px 8px" }}>
                      Assigned: {o.assigned_role}{o.assigned_to ? ` · ${o.assigned_to}` : ""}
                    </span>
                  ) : (
                    <span style={{ borderRadius: 999, border: "1px solid #e5e7eb", padding: "4px 8px" }}>Unassigned</span>
                  )}
                </div>
              </button>
            ))}
            {items.length === 0 && !loading ? <div style={{ fontSize: 12, color: "#64748b" }}>No obligations yet.</div> : null}
          </div>
        </div>

        <div style={{ borderRadius: 18, border: "1px solid #e5e7eb", padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Details & Assignment</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>Select an obligation to see details.</div>

          {selected ? (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Obligation</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{selected.title}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "#475569" }}>{selected.summary}</div>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, color: "#475569" }}>Assign to role</label>
                <select
                  style={{ borderRadius: 14, border: "1px solid #e5e7eb", padding: "8px 10px", fontSize: 13 }}
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value)}
                  disabled={!can(role, "obligations:assign")}
                >
                  {[
                    "Operator",
                    "Engineering",
                    "Facility Manager",
                    "Operations",
                    "Supplier",
                    "Employee",
                    "Data Steward",
                    "Sustainability Officer",
                    "Owner",
                    "Financial Officer",
                    "Auditor",
                  ].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, color: "#475569" }}>Assign to person (optional)</label>
                <input
                  style={{ borderRadius: 14, border: "1px solid #e5e7eb", padding: "8px 10px", fontSize: 13 }}
                  placeholder="e.g., arun@msme.com"
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value)}
                  disabled={!can(role, "obligations:assign")}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, color: "#475569" }}>Due date (optional)</label>
                <input
                  type="date"
                  style={{ borderRadius: 14, border: "1px solid #e5e7eb", padding: "8px 10px", fontSize: 13 }}
                  value={assignDue || ""}
                  onChange={(e) => setAssignDue(e.target.value)}
                  disabled={!can(role, "obligations:assign")}
                />
              </div>

              <button
                style={{
                  width: "100%",
                  borderRadius: 18,
                  padding: "10px 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  border: "1px solid #0f172a",
                  background: can(role, "obligations:assign") ? "#0f172a" : "#f1f5f9",
                  color: can(role, "obligations:assign") ? "#fff" : "#94a3b8",
                  cursor: can(role, "obligations:assign") ? "pointer" : "not-allowed",
                }}
                onClick={doAssign}
                disabled={loading || !can(role, "obligations:assign")}
              >
                Assign
              </button>

              <div style={{ paddingTop: 6 }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>Required variables</div>
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(selected.required_variables || []).map((v) => (
                    <span key={v} style={{ fontSize: 11, borderRadius: 999, border: "1px solid #e5e7eb", padding: "4px 8px", color: "#334155" }}>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>No selection.</div>
          )}
        </div>
      </div>
    </div>
  );
}
