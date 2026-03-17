import React from "react";
import { refScopeVocab } from "../ref/refScopeVocab";
import { shortHash } from "../lib/hash";
import { ScopeJson } from "../lib/scope";
import { useVersion } from "../state";

type PillProps = { label: string; tone?: "neutral" | "good" | "warn" | "bad" };
function Pill({ label, tone = "neutral" }: PillProps) {
  const bg =
    tone === "good"
      ? "#E8F7EE"
      : tone === "warn"
      ? "#FFF4E5"
      : tone === "bad"
      ? "#FDECEC"
      : "#F2F4F7";
  const border =
    tone === "good"
      ? "#BEE9CC"
      : tone === "warn"
      ? "#F8D9A9"
      : tone === "bad"
      ? "#F5B7B7"
      : "#E7EBF0";
  const color =
    tone === "good"
      ? "#176A3A"
      : tone === "warn"
      ? "#7A4A00"
      : tone === "bad"
      ? "#8A1F1F"
      : "#334155";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        background: bg,
        border: `1px solid ${border}`,
        color,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.2,
      }}
    >
      {label}
    </span>
  );
}

function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{title}</div>
      {right}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E6EAF0",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 1px 0 rgba(15,23,42,0.04)",
      }}
    >
      {children}
    </div>
  );
}

function Chip({ text, onRemove, disabled }: { text: string; onRemove?: () => void; disabled?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: "1px solid #E6EAF0",
        borderRadius: 999,
        padding: "6px 10px",
        background: "#F8FAFC",
        fontSize: 12,
        fontWeight: 700,
        color: "#0F172A",
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      {text}
      {onRemove && (
        <button
          disabled={disabled}
          onClick={onRemove}
          style={{
            cursor: disabled ? "not-allowed" : "pointer",
            border: "none",
            background: "transparent",
            fontSize: 14,
            lineHeight: 1,
            color: disabled ? "#94A3B8" : "#64748B",
          }}
          aria-label={`Remove ${text}`}
          title={disabled ? "Scope is accepted" : "Remove"}
        >
          ×
        </button>
      )}
    </span>
  );
}

function findLabel(id: string): string {
  const walk = (nodes: any[]): string | null => {
    for (const n of nodes) {
      if (n.id === id) return n.label;
      if (n.children) {
        const r = walk(n.children);
        if (r) return r;
      }
    }
    return null;
  };
  return (
    walk(refScopeVocab.geographies) ||
    walk(refScopeVocab.industries) ||
    walk(refScopeVocab.products) ||
    refScopeVocab.themes.find((t) => t.id === id)?.label ||
    id
  );
}

function ToggleRow({
  id,
  label,
  checked,
  disabled,
  onToggle,
  depth = 0,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: (id: string, next: boolean) => void;
  depth?: number;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 8px",
        borderRadius: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        marginLeft: depth * 14,
        userSelect: "none",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onToggle(id, e.target.checked)}
        style={{ width: 16, height: 16 }}
      />
      <div style={{ fontSize: 13, fontWeight: 700, color: disabled ? "#94A3B8" : "#0F172A" }}>{label}</div>
      <div style={{ marginLeft: "auto", fontSize: 11, color: "#94A3B8" }}>{id}</div>
    </label>
  );
}

function TreePicker({
  title,
  nodes,
  selected,
  disabled,
  onChange,
}: {
  title: string;
  nodes: { id: string; label: string; children?: { id: string; label: string }[] }[];
  selected: string[];
  disabled?: boolean;
  onChange: (next: string[]) => void;
}) {
  const toggle = (id: string, next: boolean) => {
    const set = new Set(selected);
    if (next) set.add(id);
    else set.delete(id);
    onChange(Array.from(set));
  };

  const render = (ns: any[], depth = 0) =>
    ns.map((n: any) => (
      <div key={n.id}>
        <ToggleRow id={n.id} label={n.label} checked={selected.includes(n.id)} disabled={disabled} onToggle={toggle} depth={depth} />
        {n.children ? <div style={{ marginTop: 2 }}>{render(n.children, depth + 1)}</div> : null}
      </div>
    ));

  return (
    <div>
      <SectionTitle title={title} />
      <div style={{ border: "1px solid #E6EAF0", borderRadius: 14, padding: 8, background: "#FBFCFE" }}>{render(nodes)}</div>
    </div>
  );
}

function Wheel() {
  // Minimal, clean SVG "lifecycle wheel" to mirror the center visual.
  const labels = ["Understand", "Scope", "Apply", "Collect", "Review", "Decide"];
  return (
    <div
      style={{
        border: "1px solid #E6EAF0",
        borderRadius: 16,
        padding: 14,
        background: "linear-gradient(180deg, #FFFFFF 0%, #FBFCFE 100%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>Scope Lifecycle</div>
        <Pill label="Phase 1" />
      </div>
      <svg viewBox="0 0 420 220" width="100%" height="220" role="img" aria-label="Lifecycle wheel">
        <defs>
          <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
        </defs>
        <ellipse cx="210" cy="110" rx="170" ry="80" fill="url(#g)" stroke="#E6EAF0" strokeWidth="2" />
        {/* hub */}
        <circle cx="210" cy="110" r="34" fill="#fff" stroke="#E6EAF0" strokeWidth="2" />
        <text x="210" y="114" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0F172A">
          Scope
        </text>

        {/* spokes */}
        {labels.map((l, i) => {
          const angle = (-60 + i * (120 / (labels.length - 1))) * (Math.PI / 180);
          const x = 210 + Math.cos(angle) * 150;
          const y = 110 + Math.sin(angle) * 70;
          return (
            <g key={l}>
              <line x1="210" y1="110" x2={x} y2={y} stroke="#E6EAF0" strokeWidth="2" />
              <circle cx={x} cy={y} r="18" fill="#fff" stroke="#E6EAF0" strokeWidth="2" />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="800" fill="#334155">
                {l}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.4 }}>
        Keep scope decisions <b>deterministic</b>, <b>auditable</b>, and <b>Data Steward–controlled</b>. This snapshot feeds EPIC‑2 applicability and EPIC‑3 obligations.
      </div>
    </div>
  );
}

export default function ScopePage() {
  const { role, setRole, scope, setScopeDraft, validateScope, acceptScope, reopenScope } = useVersion();
  const [search, setSearch] = React.useState("");
  const editingLocked = scope.status === "ACCEPTED";

  const setField = (field: keyof ScopeJson, next: string[]) => {
    setScopeDraft({ ...scope.draft, [field]: next });
  };

  const remove = (field: keyof ScopeJson, id: string) => {
    const next = (scope.draft[field] as string[]).filter((x) => x !== id);
    setField(field, next);
  };

  const allSelected = [
    ...scope.draft.geographies,
    ...scope.draft.industries,
    ...scope.draft.products,
    ...scope.draft.themes,
  ].filter((id) => (search ? findLabel(id).toLowerCase().includes(search.toLowerCase()) || id.toLowerCase().includes(search.toLowerCase()) : true));

  const statusTone = scope.status === "ACCEPTED" ? "good" : scope.errors.length ? "bad" : scope.warnings.length ? "warn" : "good";
  const statusLabel =
    scope.status === "ACCEPTED" ? "ACCEPTED" : scope.errors.length ? "INVALID" : scope.warnings.length ? "VALID (with notes)" : "VALID";

  const canAccept = role === "Data Steward" && !scope.errors.length;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(scope.draft, null, 2));
      alert("scope_json copied");
    } catch {
      alert("Copy failed");
    }
  };

  const onAccept = async () => {
    const res = await acceptScope();
    if (!res.ok) alert(res.reason || "Cannot accept");
  };

  const onReopen = async () => {
    if (!confirm("Reopen scope for editing? Accepted snapshot will remain for audit.")) return;
    await reopenScope();
  };

  return (
    <div style={{ padding: 18 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#0F172A" }}>Scope</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748B" }}>
            Build and validate <b>scope_json</b> for the selected regulation version (Data Steward controlled).
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Pill label={`Role: ${role}`} />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid #E6EAF0",
              background: "#fff",
              color: "#0F172A",
              fontSize: 12,
              fontWeight: 800,
            }}
            aria-label="Role switcher"
          >
            <option>Operator</option>
            <option>Data Steward</option>
            <option>Sustainability Officer</option>
            <option>Owner</option>
            <option>Auditor</option>
            <option>Regulator</option>
            <option>Investor</option>
            <option>Financial Officer</option>
            <option>Engineering</option>
            <option>Facility Manager</option>
            <option>Supplier</option>
            <option>Employee</option>
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.4fr 0.75fr", gap: 14, alignItems: "start" }}>
        {/* Left: builder */}
        <Panel>
          <SectionTitle
            title="Scope Builder"
            right={
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search selected…"
                style={{
                  width: 160,
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid #E6EAF0",
                  background: "#fff",
                  fontSize: 12,
                }}
              />
            }
          />

          <div style={{ display: "grid", gap: 12 }}>
            <TreePicker title="Geographic Regions" nodes={refScopeVocab.geographies} selected={scope.draft.geographies} disabled={editingLocked} onChange={(n) => setField("geographies", n)} />
            <TreePicker title="Industries" nodes={refScopeVocab.industries} selected={scope.draft.industries} disabled={editingLocked} onChange={(n) => setField("industries", n)} />
            <TreePicker title="Product Categories" nodes={refScopeVocab.products} selected={scope.draft.products} disabled={editingLocked} onChange={(n) => setField("products", n)} />
            <div>
              <SectionTitle title="Themes" />
              <div style={{ border: "1px solid #E6EAF0", borderRadius: 14, padding: 8, background: "#FBFCFE" }}>
                {refScopeVocab.themes.map((t) => (
                  <ToggleRow key={t.id} id={t.id} label={t.label} checked={scope.draft.themes.includes(t.id)} disabled={editingLocked} onToggle={(id, next) => {
                    const set = new Set(scope.draft.themes);
                    if (next) set.add(id); else set.delete(id);
                    setField("themes", Array.from(set));
                  }} />
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button
              onClick={() => validateScope()}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #E6EAF0",
                background: "#fff",
                fontWeight: 900,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Validate
            </button>
            <button
              onClick={onCopy}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #E6EAF0",
                background: "#F8FAFC",
                fontWeight: 900,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Copy JSON
            </button>
          </div>
          {editingLocked ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "#64748B" }}>
              Scope editing is locked because scope is accepted. Data Steward can reopen draft if needed.
            </div>
          ) : null}
        </Panel>

        {/* Center: wheel + selected + json */}
        <div style={{ display: "grid", gap: 14 }}>
          <Wheel />

          <Panel>
            <SectionTitle
              title="Selected Scope"
              right={
                <div style={{ display: "flex", gap: 8 }}>
                  <Pill label={statusLabel} tone={statusTone as any} />
                  <Pill label={`Hash: ${shortHash(scope.scope_hash)}`} />
                </div>
              }
            />
            <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 8 }}>
              {allSelected.length === 0 ? (
                <div style={{ fontSize: 12, color: "#64748B" }}>No selected items match your filter.</div>
              ) : (
                allSelected.map((id) => {
                  const label = findLabel(id);
                  const field: keyof ScopeJson =
                    scope.draft.geographies.includes(id)
                      ? "geographies"
                      : scope.draft.industries.includes(id)
                      ? "industries"
                      : scope.draft.products.includes(id)
                      ? "products"
                      : "themes";
                  return <Chip key={id} text={label} onRemove={() => remove(field, id)} disabled={editingLocked} />;
                })
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
              <div
                style={{
                  border: "1px solid #E6EAF0",
                  background: "#0B1220",
                  borderRadius: 14,
                  padding: 12,
                  color: "#E2E8F0",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                  fontSize: 12,
                  lineHeight: 1.4,
                  overflow: "auto",
                  maxHeight: 260,
                  whiteSpace: "pre",
                }}
              >
{JSON.stringify(scope.draft, null, 2)}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#64748B" }}>
                  {scope.accepted ? (
                    <>
                      Accepted at <b>{new Date(scope.accepted.accepted_at).toLocaleString()}</b> by <b>{scope.accepted.accepted_by}</b>
                    </>
                  ) : (
                    <>Not accepted yet.</>
                  )}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {scope.status === "ACCEPTED" ? (
                    <button
                      onClick={onReopen}
                      disabled={role !== "Data Steward"}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid #E6EAF0",
                        background: "#fff",
                        fontWeight: 900,
                        fontSize: 12,
                        cursor: role === "Data Steward" ? "pointer" : "not-allowed",
                        opacity: role === "Data Steward" ? 1 : 0.55,
                      }}
                    >
                      Reopen Draft
                    </button>
                  ) : (
                    <button
                      onClick={onAccept}
                      disabled={!canAccept}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid #0F172A",
                        background: canAccept ? "#0F172A" : "#CBD5E1",
                        color: "#fff",
                        fontWeight: 900,
                        fontSize: 12,
                        cursor: canAccept ? "pointer" : "not-allowed",
                      }}
                    >
                      Accept Scope
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right rail */}
        <div style={{ display: "grid", gap: 14 }}>
          <Panel>
            <SectionTitle title="Validation" right={<Pill label={statusLabel} tone={statusTone as any} />} />
            {scope.errors.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {scope.errors.map((e, idx) => (
                  <div key={idx} style={{ fontSize: 12, color: "#8A1F1F", background: "#FDECEC", border: "1px solid #F5B7B7", padding: 10, borderRadius: 12 }}>
                    {e}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#176A3A", background: "#E8F7EE", border: "1px solid #BEE9CC", padding: 10, borderRadius: 12 }}>
                No blocking validation errors.
              </div>
            )}

            {scope.warnings.length ? (
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {scope.warnings.map((w, idx) => (
                  <div key={idx} style={{ fontSize: 12, color: "#7A4A00", background: "#FFF4E5", border: "1px solid #F8D9A9", padding: 10, borderRadius: 12 }}>
                    {w}
                  </div>
                ))}
              </div>
            ) : null}

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                Scope Hash
                <div style={{ marginTop: 4, fontSize: 12, fontWeight: 900, color: "#0F172A" }}>{scope.scope_hash || "…"}</div>
              </div>

              <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
                <button
                  onClick={() => validateScope()}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #E6EAF0",
                    background: "#fff",
                    fontWeight: 900,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Re-Validate
                </button>

                <button
                  onClick={onAccept}
                  disabled={!canAccept || scope.status === "ACCEPTED"}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #0F172A",
                    background: canAccept && scope.status !== "ACCEPTED" ? "#0F172A" : "#CBD5E1",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: 12,
                    cursor: canAccept && scope.status !== "ACCEPTED" ? "pointer" : "not-allowed",
                  }}
                >
                  Data Steward: Accept Scope
                </button>
              </div>

              <div style={{ fontSize: 12, color: "#64748B", marginTop: 8 }}>
                Accepting scope locks the scope snapshot for audit and triggers EPIC‑2 applicability.
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Next Recommended Action" />
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ padding: 12, border: "1px dashed #E6EAF0", borderRadius: 14, background: "#FBFCFE" }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#0F172A" }}>1) Validate scope</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "#64748B" }}>Ensure only ref_scope_vocab values are used.</div>
              </div>
              <div style={{ padding: 12, border: "1px dashed #E6EAF0", borderRadius: 14, background: "#FBFCFE" }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#0F172A" }}>2) Data Steward accepts scope</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "#64748B" }}>Locks scope_hash and creates an auditable record.</div>
              </div>
              <div style={{ padding: 12, border: "1px dashed #E6EAF0", borderRadius: 14, background: "#FBFCFE" }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#0F172A" }}>3) Run applicability (EPIC‑2)</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "#64748B" }}>Use scope snapshot + org profile to decide applicability.</div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
