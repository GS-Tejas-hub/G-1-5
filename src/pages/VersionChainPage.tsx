import React from "react";
import { useVersion } from "../state";
import { validateAndHashScope } from "../lib/scope";
import { getUiRegulations, getUiVersions, UiRegulation, UiVersion } from "../lib/api";

function Badge({ label, tone }: { label: string; tone: "dark" | "mid" | "light" }) {
  const bg =
    tone === "dark" ? "#111827" : tone === "mid" ? "#374151" : "#e5e7eb";
  const fg = tone === "light" ? "#111827" : "#f9fafb";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        background: bg,
        color: fg,
        fontSize: 12,
        fontWeight: 600,
        border: "1px solid #d1d5db",
      }}
    >
      {label}
    </span>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid #d1d5db",
        background: "#f3f4f6",
        fontSize: 12,
        color: "#111827",
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        background: "#ffffff",
        padding: 14,
        boxShadow: "0 1px 0 rgba(17,24,39,0.03)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: "1px solid #f3f4f6" }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{k}</div>
      <div style={{ fontSize: 12, color: "#111827", fontWeight: 600, textAlign: "right" }}>{v}</div>
    </div>
  );
}

export default function VersionChainPage() {
  const { role, version_chain, selectVersion, createDraftVersion, scope } = useVersion();

  const [uiVersions, setUiVersions] = React.useState<UiVersion[]>([]);
  const [uiRegs, setUiRegs] = React.useState<UiRegulation[]>([]);
  const [regFilter, setRegFilter] = React.useState<string>("ALL");

  // Fetch regulations + versions so we can filter the Version list by regulation.
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [vr, rr] = await Promise.all([
          getUiVersions(role as any),
          getUiRegulations(role as any),
        ]);
        if (!alive) return;
        setUiVersions(vr.items || []);
        setUiRegs(rr.items || []);
      } catch {
        // If backend is unreachable, keep local-only list.
      }
    })();
    return () => {
      alive = false;
    };
  }, [role]);

  const versionMetaById = React.useMemo(() => {
    const m = new Map<string, UiVersion>();
    for (const v of uiVersions) m.set(v.version_id, v);
    return m;
  }, [uiVersions]);

  const regsForLocalNodes = React.useMemo(() => {
    const keys = new Set<string>();
    for (const n of version_chain.nodes) {
      const meta = versionMetaById.get(n.version_id);
      if (meta?.regulation_key) keys.add(meta.regulation_key);
    }
    // Prefer titles from /ui/regulations; fallback to key-as-title.
    const titleByKey = new Map<string, string>();
    for (const r of uiRegs) titleByKey.set(r.regulation_key, r.title || r.regulation_key);
    return Array.from(keys)
      .sort()
      .map((k) => ({ regulation_key: k, title: titleByKey.get(k) || k }));
  }, [version_chain.nodes, versionMetaById, uiRegs]);

  const filteredNodes = React.useMemo(() => {
    if (regFilter === "ALL") return version_chain.nodes;
    return version_chain.nodes.filter((n) => versionMetaById.get(n.version_id)?.regulation_key === regFilter);
  }, [version_chain.nodes, versionMetaById, regFilter]);

  const timelineNodes = filteredNodes;

  const selected = version_chain.nodes.find((n) => n.version_id === version_chain.selected_version_id) || version_chain.nodes[version_chain.nodes.length - 1];

  const [scopeCheck, setScopeCheck] = React.useState<{ ok: boolean; scope_hash: string; errors: string[]; warnings: string[] } | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const v = await validateAndHashScope(scope.draft);
      if (!alive) return;
      const acceptedHash = scope.accepted?.scope_hash || "";
      const ok = !!acceptedHash && acceptedHash === v.scope_hash && scope.status === "ACCEPTED";
      setScopeCheck({ ok, scope_hash: v.scope_hash, errors: v.errors, warnings: v.warnings });
    })();
    return () => {
      alive = false;
    };
  }, [scope.draft, scope.accepted?.scope_hash, scope.status]);

  const statusTone = (s: string) => (s === "ACTIVE" ? "dark" : s === "DRAFT" ? "mid" : "light") as "dark" | "mid" | "light";

  const leftW = 300;
  const rightW = 320;

  return (
    <div style={{ display: "grid", gridTemplateColumns: `${leftW}px 1fr ${rightW}px`, gap: 16 }}>
      {/* LEFT FILTERS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ padding: 6 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: -0.2 }}>Version Chain</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            Trace-ready version history, integrity, and roll-forward controls.
          </div>
        </div>

        <Panel title="Filters">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>Region</div>
                <select style={{ width: "100%", padding: "10px 10px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}>
                  <option>All</option>
                  <option>EU</option>
                  <option>India</option>
                  <option>US</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>Industry</div>
                <select style={{ width: "100%", padding: "10px 10px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}>
                  <option>All</option>
                  <option>Auto parts</option>
                  <option>Machine tools</option>
                  <option>Electronics</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>Regulation</div>
                <select
                  value={regFilter}
                  onChange={(e) => setRegFilter(e.target.value)}
                  style={{ width: "100%", padding: "10px 10px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}
                >
                  <option value="ALL">All</option>
                  {regsForLocalNodes.map((r) => (
                    <option key={r.regulation_key} value={r.regulation_key}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ fontSize: 11, color: "#6b7280" }}>Version</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredNodes.slice().reverse().map((n) => {
                const active = n.version_id === version_chain.selected_version_id;
                const meta = versionMetaById.get(n.version_id);
                return (
                  <button
                    key={n.version_id}
                    onClick={() => selectVersion(n.version_id)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: active ? "1px solid #111827" : "1px solid #e5e7eb",
                      background: active ? "#111827" : "#ffffff",
                      color: active ? "#f9fafb" : "#111827",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>v{n.version_label}</div>
                      <div style={{ fontSize: 11, opacity: 0.75 }}>
                        {meta?.regulation_key ? `${meta.regulation_key} • ` : ""}
                        {n.uploaded_at.slice(0, 10)}
                      </div>
                    </div>
                    <Badge label={n.status} tone={active ? "mid" : statusTone(n.status)} />
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel
          title="Selected Version"
          right={<Pill>{role}</Pill>}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#111827", letterSpacing: -0.2 }}>v{selected?.version_label}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{selected?.version_id}</div>
            </div>
            <Badge label={selected?.status || "—"} tone={statusTone(selected?.status || "DRAFT")} />
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: "#111827", fontWeight: 650, marginBottom: 6 }}>Notes</div>
            <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>
              {selected?.notes || "—"}
            </div>
          </div>
        </Panel>
      </div>

      {/* MIDDLE TIMELINE */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Panel
          title="Timeline"
          right={
            <button
              onClick={createDraftVersion}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: "#111827",
                color: "#f9fafb",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + New Version
            </button>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "22px 1fr", columnGap: 12, rowGap: 14, paddingTop: 6 }}>
            {timelineNodes.map((n, idx) => {
              const isSelected = n.version_id === version_chain.selected_version_id;
              const isLast = idx === timelineNodes.length - 1;
              return (
                <React.Fragment key={n.version_id}>
                  <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        border: isSelected ? "3px solid #111827" : "2px solid #9ca3af",
                        background: isSelected ? "#111827" : "#ffffff",
                        marginTop: 8,
                        zIndex: 2,
                      }}
                    />
                    {!isLast && (
                      <div
                        style={{
                          position: "absolute",
                          top: 20,
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: 2,
                          height: 80,
                          backgroundImage: "linear-gradient(#d1d5db 30%, rgba(0,0,0,0) 0%)",
                          backgroundPosition: "center",
                          backgroundSize: "2px 10px",
                          backgroundRepeat: "repeat-y",
                        }}
                      />
                    )}
                  </div>

                  <div
                    style={{
                      border: isSelected ? "1px solid #111827" : "1px solid #e5e7eb",
                      borderRadius: 16,
                      padding: 14,
                      background: isSelected ? "#f9fafb" : "#ffffff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: "#111827" }}>Version v{n.version_label}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                          Uploaded: <span style={{ color: "#111827", fontWeight: 700 }}>{n.uploaded_at.slice(0, 10)}</span>
                        </div>
                      </div>
                      <Badge label={n.status} tone={statusTone(n.status)} />
                    </div>

                    <div style={{ marginTop: 12, borderTop: "1px solid #f3f4f6" }}>
                      <Row k="SHA-256" v={<span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{n.sha256}</span>} />
                      <Row k="Structure hash" v={<span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{n.structure_hash}</span>} />
                      <Row
                        k="Scope hash"
                        v={
                          n.scope_hash ? (
                            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{n.scope_hash}</span>
                          ) : (
                            <span style={{ color: "#6b7280", fontWeight: 600 }}>—</span>
                          )
                        }
                      />
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                      <button
                        onClick={() => selectVersion(n.version_id)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: "#ffffff",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => navigator.clipboard?.writeText(n.version_id)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: "#ffffff",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Copy ID
                      </button>
                      <button
                        onClick={() => alert("Download evidence (mock)")}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: "#ffffff",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Download Evidence
                      </button>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </Panel>

        <Panel title="Notes">
          <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.45 }}>
            Tip: In Phase‑1, version chain is the audit backbone. In Phase‑2 (collaboration), this timeline also shows who
            approved which changes and which stakeholder feedback impacted scope/materiality.
          </div>
        </Panel>
      </div>

      {/* RIGHT INTEGRITY */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Panel title="Integrity Report">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12, color: "#111827", fontWeight: 700 }}>Scope validation</div>
              {scopeCheck?.ok ? <Badge label="VALID" tone="dark" /> : <Badge label="INVALID" tone="mid" />}
            </div>

            <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.45 }}>
              Scope is valid only when the Data Steward has accepted it and the stored scope_hash matches the canonical hash.
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "#f9fafb" }}>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Current computed scope_hash</div>
              <div style={{ fontSize: 12, marginTop: 6, color: "#111827", fontWeight: 800, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                {scopeCheck?.scope_hash || "—"}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  onClick={() => navigator.clipboard?.writeText(scopeCheck?.scope_hash || "")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  Copy hash
                </button>
                <button
                  onClick={() => alert("Run full integrity check (mock)")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid #111827",
                    background: "#111827",
                    color: "#f9fafb",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  Re-check
                </button>
              </div>
            </div>

            {!!scopeCheck?.errors?.length && (
              <div style={{ border: "1px solid #fee2e2", borderRadius: 14, padding: 12, background: "#fff1f2" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#111827" }}>Errors</div>
                <ul style={{ margin: "8px 0 0 18px", color: "#6b7280", fontSize: 12 }}>
                  {scopeCheck.errors.slice(0, 5).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Quick Links">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => alert("Open Audit tab (mock)")}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              → Audit Trail
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginTop: 4 }}>View immutable evidence + version diffs.</div>
            </button>

            <button
              onClick={() => alert("Open Change Impact tab (mock)")}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              → Change Impact
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginTop: 4 }}>See ripple effects on obligations + variables.</div>
            </button>

            <button
              onClick={() => alert("Download Version Chain report (mock)")}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              → Export Chain Report
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginTop: 4 }}>CSV/PDF for auditor/investor packs.</div>
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
