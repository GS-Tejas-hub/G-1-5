import React from "react";
import { listAudit, verifyAudit } from "../lib/api";
import { useVersionApp } from "../state";

type Tone = "dark" | "mid" | "light";

function Panel({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 20,
        background: "#fff",
        boxShadow: "0 1px 0 rgba(17,24,39,0.02)",
      }}
    >
      <div
        style={{
          padding: "14px 14px 10px",
          borderBottom: "1px solid #f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>{title}</div>
        {right}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function Badge({ label, tone = "light" }: { label: string; tone?: Tone }) {
  const styleByTone: Record<Tone, React.CSSProperties> = {
    dark: { background: "#111827", color: "#f9fafb", border: "1px solid #111827" },
    mid: { background: "#f3f4f6", color: "#111827", border: "1px solid #e5e7eb" },
    light: { background: "#ffffff", color: "#111827", border: "1px solid #e5e7eb" },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 24,
        padding: "0 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.2,
        ...styleByTone[tone],
      }}
    >
      {label}
    </span>
  );
}

function CheckboxRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 10px",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        background: checked ? "#f9fafb" : "#ffffff",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 12, color: "#111827", fontWeight: 800 }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: "#111827" }}
      />
    </label>
  );
}

type AuditEvent = {
  event_id: string;
  at: string; // ISO
  event_type:
    | "REGULATION_UPLOADED"
    | "SCOPE_EDITED"
    | "SCOPE_HASH_COMPUTED"
    | "SCOPE_ACCEPTED"
    | "VERSION_LINKED"
    | "VERSION_SUPERSEDED"
    | "APPLICABILITY_EVALUATED";
  entity_type: "document" | "version" | "scope" | "cycle";
  entity_id: string;
  actor: string;
  severity: "info" | "control" | "risk";
  status: "ok" | "warning" | "blocked";
  request_id: string;
  details: Record<string, any>;
};

function seedEvents(): AuditEvent[] {
  return [
    {
      event_id: "EVT-0001",
      at: "2026-02-25T09:18:11Z",
      event_type: "REGULATION_UPLOADED",
      entity_type: "document",
      entity_id: "DOC-CBAM-2026",
      actor: "Operator: Joy",
      severity: "control",
      status: "ok",
      request_id: "REQ-9b8e",
      details: {
        jurisdiction: "EU",
        regulation_family: "CBAM",
        version_label: "2026 v1",
        file_id: "FILE-71af",
        sha256: "3c0b…a91d",
      },
    },
    {
      event_id: "EVT-0002",
      at: "2026-02-25T09:21:34Z",
      event_type: "SCOPE_EDITED",
      entity_type: "scope",
      entity_id: "SCOPE-DOC-CBAM-2026",
      actor: "Data Steward: Priya",
      severity: "control",
      status: "warning",
      request_id: "REQ-9b90",
      details: {
        changed_fields: ["products", "geography"],
        note: "Added product categories + EU geographies",
      },
    },
    {
      event_id: "EVT-0003",
      at: "2026-02-25T09:22:01Z",
      event_type: "SCOPE_HASH_COMPUTED",
      entity_type: "scope",
      entity_id: "SCOPE-DOC-CBAM-2026",
      actor: "System",
      severity: "control",
      status: "ok",
      request_id: "REQ-9b91",
      details: {
        scope_hash: "scope:sha256:9b7c…e2a1",
        schema_ok: true,
      },
    },
    {
      event_id: "EVT-0004",
      at: "2026-02-25T09:23:10Z",
      event_type: "SCOPE_ACCEPTED",
      entity_type: "scope",
      entity_id: "SCOPE-DOC-CBAM-2026",
      actor: "Data Steward: Priya",
      severity: "control",
      status: "ok",
      request_id: "REQ-9b92",
      details: {
        accepted: true,
        accepted_at: "2026-02-25T09:23:10Z",
        accepted_by: "USR-DS-11",
        scope_hash: "scope:sha256:9b7c…e2a1",
      },
    },
    {
      event_id: "EVT-0005",
      at: "2026-02-25T09:26:54Z",
      event_type: "APPLICABILITY_EVALUATED",
      entity_type: "cycle",
      entity_id: "APP-ORG45-CBAM-2026Q1",
      actor: "Operator: Joy",
      severity: "risk",
      status: "blocked",
      request_id: "REQ-9b9a",
      details: {
        applicability_status: "INSUFFICIENT_DATA",
        missing_profile_fields: ["export_geographies", "industry_code"],
        ruleset_version: "v1.3",
      },
    },
    {
      event_id: "EVT-0006",
      at: "2026-02-25T09:32:48Z",
      event_type: "VERSION_LINKED",
      entity_type: "version",
      entity_id: "VER-CBAM-2026-v1",
      actor: "System",
      severity: "control",
      status: "ok",
      request_id: "REQ-9ba4",
      details: {
        parent_version_id: "VER-CBAM-2025-v3",
        version_label: "2026 v1",
        structure_hash: "struct:sha256:77a1…1d0c",
      },
    },
  ];
}

function short(hash: string): string {
  return hash.length > 12 ? hash.slice(0, 6) + "…" + hash.slice(-4) : hash;
}

function statusTone(s: AuditEvent["status"]): Tone {
  if (s === "ok") return "dark";
  if (s === "warning") return "mid";
  return "light";
}

function formatTs(iso: string) {
  return iso.replace("T", " ").replace("Z", " UTC");
}

export default function AuditPage() {
  const { role, versionChain } = useVersionApp();
  const versionId = versionChain.selected_version_id;

  const [events, setEvents] = React.useState<AuditEvent[]>(seedEvents());
  const [selectedId, setSelectedId] = React.useState<string | undefined>(undefined);
  const selected = events.find((e) => e.event_id === selectedId) || events[0];

  const [chainStatus, setChainStatus] = React.useState<{ ok: boolean; count: number; head?: string } | null>(null);
  const [backendWarn, setBackendWarn] = React.useState<string>("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setBackendWarn("");
      try {
        const rows = await listAudit(role as any, "version", versionId);
        if (cancelled) return;
        const mapped: AuditEvent[] = rows.map((r) => ({
          event_id: r.event_id,
          event_type: r.action as AuditEvent["event_type"],
          status: "ok" as const,
          severity: "info" as const,
          entity_type: r.entity_type as AuditEvent["entity_type"],
          entity_id: r.entity_id,
          at: new Date(r.at_ms).toISOString(),
          actor: r.actor_role,
          request_id: r.event_id,
          details: r.details || {},
        }));
        setEvents(mapped.length ? mapped : []);
        setSelectedId(mapped[0]?.event_id);
      } catch (e: any) {
        if (cancelled) return;
        setBackendWarn(e?.message || "Backend not reachable. Showing seeded demo events.");
        const seeded = seedEvents();
        setEvents(seeded);
        setSelectedId(seeded[0]?.event_id);
      }

      try {
        const v = await verifyAudit(role as any, "version", versionId);
        if (cancelled) return;
        setChainStatus(v);
      } catch {
        if (cancelled) return;
        setChainStatus(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, versionId]);

  const [q, setQ] = React.useState("");
  const [types, setTypes] = React.useState<Record<string, boolean>>({});
  const [actors, setActors] = React.useState<Record<string, boolean>>({});
  const [entity, setEntity] = React.useState<Record<string, boolean>>({});

  // Initialize filter toggles from events (so the panel always matches backend reality)
  React.useEffect(() => {
    const t = Object.fromEntries(Array.from(new Set(events.map((e) => e.event_type))).map((k) => [k, true]));
    const a = Object.fromEntries(Array.from(new Set(events.map((e) => e.actor))).map((k) => [k, true]));
    const en = Object.fromEntries(Array.from(new Set(events.map((e) => e.entity_type))).map((k) => [k, true]));
    setTypes((prev) => (Object.keys(prev).length ? prev : (t as any)));
    setActors((prev) => (Object.keys(prev).length ? prev : (a as any)));
    setEntity((prev) => (Object.keys(prev).length ? prev : (en as any)));
  }, [events]);

  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    return events
      .filter((e) => !!types[e.event_type])
      .filter((e) => !!actors[e.actor])
      .filter((e) => !!entity[e.entity_type])
      .filter((e) => {
        if (!qq) return true;
        const blob = [e.event_id, e.event_type, e.entity_type, e.entity_id, e.actor, JSON.stringify(e.details)].join(" ").toLowerCase();
        return blob.includes(qq);
      });
  }, [events, types, actors, entity, q]);

  return (
    <div className="page">
      {chainStatus && (
        <div
          style={{
            marginBottom: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: "10px 12px",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div>
            <b>Ledger chain</b> for <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{versionId}</span>
            : {chainStatus.ok ? " OK" : " BROKEN"} ({chainStatus.count} events)
            {chainStatus.head ? <span className="muted"> · head {short(chainStatus.head)}</span> : null}
          </div>
        </div>
      )}
      {backendWarn && (
        <div
          style={{
            marginBottom: 12,
            border: "1px solid rgba(255,180,80,0.35)",
            background: "rgba(255,180,80,0.10)",
            borderRadius: 12,
            padding: "10px 12px",
          }}
        >
          {backendWarn}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr 420px",
          gap: 14,
          alignItems: "start",
        }}
      >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Panel
          title="Filters"
          right={
            <button
              onClick={() => {
                setQ("");
                setTypes(Object.fromEntries(Object.keys(types).map((k) => [k, true])));
                setActors(Object.fromEntries(Object.keys(actors).map((k) => [k, true])));
                setEntity(Object.fromEntries(Object.keys(entity).map((k) => [k, true])));
              }}
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#111827" }}>Search</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search events, IDs, actors, fields…"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#111827" }}>Event type</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.keys(types).map((t) => (
                  <CheckboxRow
                    key={t}
                    label={t.replaceAll("_", " ")}
                    checked={!!types[t]}
                    onChange={(v) => setTypes((p) => ({ ...p, [t]: v }))}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#111827" }}>Entity type</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.keys(entity).map((t) => (
                  <CheckboxRow
                    key={t}
                    label={t}
                    checked={!!entity[t]}
                    onChange={(v) => setEntity((p) => ({ ...p, [t]: v }))}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#111827" }}>Actor</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.keys(actors).map((a) => (
                  <CheckboxRow
                    key={a}
                    label={a}
                    checked={!!actors[a]}
                    onChange={(v) => setActors((p) => ({ ...p, [a]: v }))}
                  />
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Audit Guarantees">
          <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.45 }}>
            Every record here is append‑only. In production, each event also stores a payload hash and optional hash‑chain pointer for tamper evidence.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <Badge label="APPEND‑ONLY" tone="mid" />
            <Badge label="HASHED" tone="mid" />
            <Badge label="TRACEABLE" tone="mid" />
          </div>
        </Panel>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Panel title="Audit Trail" right={<Badge label={`${filtered.length} events`} tone="mid" />}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 18, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "170px 180px 1fr 170px 90px",
                background: "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
                padding: "10px 12px",
                fontSize: 11,
                color: "#6b7280",
                fontWeight: 900,
                letterSpacing: 0.2,
              }}
            >
              <div>Timestamp</div>
              <div>Event</div>
              <div>Entity</div>
              <div>Actor</div>
              <div style={{ textAlign: "right" }}>Status</div>
            </div>

            <div style={{ maxHeight: 560, overflow: "auto" }}>
              {filtered.map((e) => {
                const isSel = e.event_id === selectedId;
                return (
                  <button
                    key={e.event_id}
                    onClick={() => setSelectedId(e.event_id)}
                    style={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "170px 180px 1fr 170px 90px",
                      padding: "12px 12px",
                      border: "none",
                      borderBottom: "1px solid #f3f4f6",
                      background: isSel ? "#f9fafb" : "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#111827", fontWeight: 800 }}>{formatTs(e.at)}</div>
                    <div style={{ fontSize: 12, color: "#111827", fontWeight: 900 }}>{e.event_type.replaceAll("_", " ")}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 12, color: "#111827", fontWeight: 800 }}>{e.entity_id}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700 }}>{e.entity_type}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#111827", fontWeight: 800 }}>{e.actor}</div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <Badge label={e.status.toUpperCase()} tone={statusTone(e.status)} />
                    </div>
                  </button>
                );
              })}
              {!filtered.length && (
                <div style={{ padding: 16, color: "#6b7280", fontSize: 12, fontWeight: 700 }}>No events match your filters.</div>
              )}
            </div>
          </div>
        </Panel>

        <Panel title="Export">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => alert("Export CSV (mock)")}
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Export CSV
            </button>
            <button
              onClick={() => alert("Export PDF (mock)")}
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Export PDF
            </button>
            <button
              onClick={() => alert("Copy audit summary (mock)")}
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid #111827",
                background: "#111827",
                color: "#f9fafb",
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Copy Summary
            </button>
          </div>
        </Panel>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Panel
          title="Event Details"
          right={
            <button
              onClick={() => navigator.clipboard?.writeText(JSON.stringify(selected, null, 2))}
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Copy JSON
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Badge label={selected.event_id} tone="mid" />
              <Badge label={selected.event_type.replaceAll("_", " ")} tone="dark" />
              <Badge label={selected.entity_type} tone="mid" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 8 }}>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 900 }}>Timestamp</div>
              <div style={{ fontSize: 12, color: "#111827", fontWeight: 800 }}>{formatTs(selected.at)}</div>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 900 }}>Actor</div>
              <div style={{ fontSize: 12, color: "#111827", fontWeight: 800 }}>{selected.actor}</div>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 900 }}>Entity</div>
              <div style={{ fontSize: 12, color: "#111827", fontWeight: 800 }}>{selected.entity_id}</div>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 900 }}>Request</div>
              <div
                style={{
                  fontSize: 12,
                  color: "#111827",
                  fontWeight: 800,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                }}
              >
                {selected.request_id}
              </div>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 18, background: "#f9fafb", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 900 }}>Details</div>
              <pre
                style={{
                  marginTop: 10,
                  marginBottom: 0,
                  fontSize: 12,
                  color: "#111827",
                  fontWeight: 700,
                  lineHeight: 1.4,
                  whiteSpace: "pre-wrap",
                }}
              >
                {JSON.stringify(selected.details, null, 2)}
              </pre>
            </div>
          </div>
        </Panel>

        <Panel title="Related Actions">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => alert("Open related document/version (mock)")}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              → Open entity
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, marginTop: 4 }}>
                Jump to the Version Chain / Scope record referenced by this event.
              </div>
            </button>
            <button
              onClick={() => alert("Verify hash chain (mock)")}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 16,
                border: "1px solid #111827",
                background: "#111827",
                color: "#f9fafb",
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              Verify immutability
              <div style={{ fontSize: 11, color: "#e5e7eb", fontWeight: 700, marginTop: 4 }}>
                Run payload hash check + chain verification for auditor readiness.
              </div>
            </button>
          </div>
        </Panel>
      </div>
      </div>
    </div>
  );
}
