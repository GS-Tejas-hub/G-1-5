import { useEffect, useMemo, useState } from "react";
import {
  ApiRole,
  VariableRow,
  VariableState,
  confirmVariableValue,
  evidenceDownloadUrl,
  listVariables,
  provideVariableValue,
  uploadEvidence,
} from "../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  role: ApiRole;
  cycleId: string;
};

function Badge({ state }: { state: VariableState }) {
  const cls =
    state === "MISSING"
      ? "bg-red-50 text-red-700 border-red-200"
      : state === "ESTIMATED"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-emerald-50 text-emerald-800 border-emerald-200";
  return <span className={`text-xs px-2 py-1 rounded border ${cls}`}>{state}</span>;
}

export default function VariablesDrawer({ open, onClose, role, cycleId }: Props) {
  const [rows, setRows] = useState<VariableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<VariableState | "ALL">("ALL");
  const [active, setActive] = useState<VariableRow | null>(null);
  const [val, setVal] = useState<string>("");
  const [unit, setUnit] = useState<string>("");
  const [confidence, setConfidence] = useState<string>("0.6");
  const [note, setNote] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canProvide = ["Operator", "Engineering", "Facility Manager", "Supplier", "Employee", "Data Steward"] as ApiRole[];
  const canConfirm = role === "Operator";

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listVariables(role, cycleId);
      setRows(data);
      if (active) {
        const upd = data.find((r) => r.var_id === active.var_id);
        if (upd) setActive(upd);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load variables");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const base = [...rows].sort((a, b) => b.updated_at_ms - a.updated_at_ms);
    return filter === "ALL" ? base : base.filter((r) => r.state === filter);
  }, [rows, filter]);

  async function onSubmitValue() {
    if (!active) return;
    setErr(null);
    try {
      const parsed = Number(val);
      if (!Number.isFinite(parsed)) throw new Error("Enter a valid number");
      await provideVariableValue(role, cycleId, active.var_id, {
        value: parsed,
        unit: unit || active.unit || undefined,
        confidence: Math.min(1, Math.max(0, Number(confidence) || 0)),
        method: "MANUAL",
        note: note || undefined,
      });
      setVal("");
      setNote("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to submit value");
    }
  }

  async function onConfirm() {
    if (!active) return;
    setErr(null);
    try {
      await confirmVariableValue(role, cycleId, active.var_id, { note: note || undefined });
      setNote("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to confirm");
    }
  }

  async function onUpload() {
    if (!active || !file) return;
    setErr(null);
    try {
      await uploadEvidence(role, cycleId, active.var_id, file, note || undefined);
      setFile(null);
      setNote("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-xl border-l">
        <div className="h-full flex flex-col">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Variables & Evidence</div>
              <div className="text-xs text-slate-500">Cycle: {cycleId}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="text-sm px-3 py-2 rounded border hover:bg-slate-50"
                onClick={refresh}
                disabled={loading}
              >
                Refresh
              </button>
              <button className="text-sm px-3 py-2 rounded bg-slate-900 text-white" onClick={onClose}>
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
            {/* left list */}
            <div className="col-span-5 border-r overflow-auto">
              <div className="p-4 border-b">
                <div className="flex gap-2">
                  {(["ALL", "MISSING", "ESTIMATED", "VERIFIED"] as const).map((k) => (
                    <button
                      key={k}
                      className={`text-xs px-3 py-2 rounded border ${
                        filter === k ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50"
                      }`}
                      onClick={() => setFilter(k)}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3 space-y-2">
                {err && <div className="text-xs text-red-700 bg-red-50 border border-red-200 p-2 rounded">{err}</div>}
                {filtered.map((r) => (
                  <button
                    key={r.var_id}
                    onClick={() => {
                      setActive(r);
                      setUnit(r.unit || "");
                    }}
                    className={`w-full text-left p-3 rounded border hover:bg-slate-50 ${
                      active?.var_id === r.var_id ? "border-slate-900" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{r.name}</div>
                        <div className="text-xs text-slate-500">{r.var_id}</div>
                      </div>
                      <Badge state={r.state} />
                    </div>
                    <div className="mt-2 text-xs text-slate-700 flex items-center justify-between">
                      <span>
                        {r.value == null ? "—" : r.value} {r.unit || ""}
                      </span>
                      <span className="text-slate-500">conf {Math.round(r.confidence * 100)}%</span>
                    </div>
                  </button>
                ))}
                {!loading && filtered.length === 0 && (
                  <div className="text-sm text-slate-500 p-3">No variables in this filter.</div>
                )}
              </div>
            </div>

            {/* right detail */}
            <div className="col-span-7 overflow-auto">
              {!active ? (
                <div className="p-6 text-slate-500">Select a variable to view details and take action.</div>
              ) : (
                <div className="p-6 space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xl font-semibold">{active.name}</div>
                      <div className="text-xs text-slate-500">{active.var_id}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge state={active.state} />
                      <span className="text-xs text-slate-500">{Math.round(active.confidence * 100)}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded border">
                      <div className="text-xs text-slate-500">Current value</div>
                      <div className="text-lg font-semibold">
                        {active.value == null ? "—" : active.value} {active.unit || ""}
                      </div>
                      <div className="text-xs text-slate-500">Method: {active.method}</div>
                    </div>
                    <div className="p-4 rounded border">
                      <div className="text-xs text-slate-500">Evidence</div>
                      <div className="text-lg font-semibold">{active.evidence_ids.length}</div>
                      <div className="text-xs text-slate-500">Linked files</div>
                    </div>
                  </div>

                  <div className="p-4 rounded border space-y-3">
                    <div className="text-sm font-semibold">Provide / update value</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1">
                        <div className="text-xs text-slate-500 mb-1">Value</div>
                        <input
                          className="w-full px-3 py-2 rounded border"
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                          placeholder="e.g., 1250"
                        />
                      </div>
                      <div className="col-span-1">
                        <div className="text-xs text-slate-500 mb-1">Unit</div>
                        <input
                          className="w-full px-3 py-2 rounded border"
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          placeholder={active.unit || "unit"}
                        />
                      </div>
                      <div className="col-span-1">
                        <div className="text-xs text-slate-500 mb-1">Confidence</div>
                        <input
                          className="w-full px-3 py-2 rounded border"
                          value={confidence}
                          onChange={(e) => setConfidence(e.target.value)}
                          placeholder="0.6"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Note (optional)</div>
                      <input
                        className="w-full px-3 py-2 rounded border"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Source / comment"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className={`px-4 py-2 rounded text-sm ${
                          canProvide.includes(role)
                            ? "bg-slate-900 text-white"
                            : "bg-slate-200 text-slate-500 cursor-not-allowed"
                        }`}
                        onClick={onSubmitValue}
                        disabled={!canProvide.includes(role)}
                      >
                        Submit value
                      </button>
                      {canConfirm && (
                        <button className="px-4 py-2 rounded text-sm border" onClick={onConfirm}>
                          Confirm as VERIFIED
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded border space-y-3">
                    <div className="text-sm font-semibold">Upload evidence</div>
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="block text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        className={`px-4 py-2 rounded text-sm ${
                          canProvide.includes(role)
                            ? "bg-slate-900 text-white"
                            : "bg-slate-200 text-slate-500 cursor-not-allowed"
                        }`}
                        onClick={onUpload}
                        disabled={!file || !canProvide.includes(role)}
                      >
                        Upload & link
                      </button>
                      {file && <span className="text-xs text-slate-500">{file.name}</span>}
                    </div>

                    {active.evidence_ids.length > 0 && (
                      <div className="pt-2">
                        <div className="text-xs text-slate-500 mb-2">Linked evidence</div>
                        <div className="space-y-2">
                          {active.evidence_ids.map((evi) => (
                            <a
                              key={evi}
                              className="block text-sm px-3 py-2 rounded border hover:bg-slate-50"
                              href={evidenceDownloadUrl(evi)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {evi}
                              <span className="text-xs text-slate-500"> — download</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
