import React from "react";
import { ScopeJson, ScopeStatus, validateAndHashScope } from "./lib/scope";
import type { ApiRole } from "./lib/api";
import {
  acceptScope as apiAcceptScope,
  getScope as apiGetScope,
  reopenScope as apiReopenScope,
} from "./lib/api";

export type Role =
  | "Operator"
  | "Data Steward"
  | "Sustainability Officer"
  | "Owner"
  | "Auditor"
  | "Regulator"
  | "Investor"
  | "Supplier"
  | "Engineering"
  | "Facility Manager"
  | "Financial Officer"
  | "Employee";

type ScopeState = {
  draft: ScopeJson;
  status: ScopeStatus;
  scope_hash: string;
  accepted?: {
    scope: ScopeJson;
    scope_hash: string;
    accepted_at: string;
    accepted_by: Role;
  };
  errors: string[];
  warnings: string[];
};

type VersionNode = {
  version_id: string;
  version_label: string; // e.g., "1.0"
  status: "READY" | "ACTIVE" | "SUPERSEDED" | "DRAFT";
  uploaded_at: string;
  structure_hash: string;
  scope_hash: string;
  sha256: string;
  notes?: string;
};

type VersionChainState = {
  nodes: VersionNode[]; // oldest -> newest
  selected_version_id: string;
};

type VersionState = {
  role: Role;
  setRole: (r: Role) => void;

  version_chain: VersionChainState;
  selectVersion: (version_id: string) => void;
  createDraftVersion: () => void;

  // Scope is tied to the currently selected version in Phase-1
  scope: ScopeState;
  setScopeDraft: (draft: ScopeJson) => Promise<void>;
  validateScope: () => Promise<void>;
  acceptScope: () => Promise<{ ok: boolean; reason?: string }>;
  reopenScope: () => Promise<void>;
};

const defaultDraft: ScopeJson = {
  geographies: ["GEO-IN"],
  industries: ["IND-AUTO"],
  products: ["PRD-AUTO-PARTS"],
  themes: ["TH-EMISSIONS"],
};

const LS_KEY = "grenomy_phase1_state_v1";

function nowIso() {
  return new Date().toISOString();
}

const defaultVersionChain: VersionChainState = {
  nodes: [
    {
      version_id: "VER-2026-0001",
      version_label: "1.0",
      status: "READY",
      uploaded_at: "2026-01-22T14:05:00.000Z",
      structure_hash: "sh_3f2a9d9d2d3c1b7a",
      scope_hash: "", // computed from accepted scope
      sha256: "sha256:9f21...a7b9",
      notes: "Seed demo version.",
    },
  ],
  selected_version_id: "VER-2026-0001",
};

function loadInitial(): { role: Role; scope: ScopeState; version_chain: VersionChainState } {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.scope?.draft && parsed?.version_chain?.nodes?.length) return parsed;
    }
  } catch {}
  return {
    role: "Operator",
    scope: {
      draft: defaultDraft,
      status: "DRAFT",
      scope_hash: "",
      errors: [],
      warnings: [],
    },
    version_chain: defaultVersionChain,
  };
}

function persist(state: { role: Role; scope: ScopeState; version_chain: VersionChainState }) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

export const VersionContext = React.createContext<VersionState | null>(null);

export function VersionProvider({ children }: { children: React.ReactNode }) {
  const initial = typeof window !== "undefined" ? loadInitial() : { role: "Operator" as Role, scope: { draft: defaultDraft, status: "DRAFT" as ScopeStatus, scope_hash: "", errors: [], warnings: [] } };
  const [role, setRoleState] = React.useState<Role>(initial.role);
  const [scope, setScope] = React.useState<ScopeState>(initial.scope);
  const [versionChain, setVersionChain] = React.useState<VersionChainState>(initial.version_chain);

  const selectedNode =
    versionChain.nodes.find((n) => n.version_id === versionChain.selected_version_id) || versionChain.nodes[0];

  // API integration: hydrate scope from backend (if backend is running).
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGetScope(role as ApiRole, selectedNode.version_id);
        if (cancelled) return;
        setScope((prev) => ({
          ...prev,
          draft: (res.scope_json as ScopeJson) ?? prev.draft,
          status: res.state === "ACCEPTED" ? "ACCEPTED" : "DRAFT",
        }));
      } catch {
        // Backend not reachable; keep local state.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, selectedNode.version_id]);

  const setRole = (r: Role) => {
    setRoleState(r);
    persist({ role: r, scope, version_chain: versionChain });
  };

  const compute = async (draft: ScopeJson, keepAccepted = true) => {
    const v = await validateAndHashScope(draft);
    setScope((prev) => {
      const next: ScopeState = {
        ...prev,
        draft,
        status: v.status,
        scope_hash: v.scope_hash,
        errors: v.errors,
        warnings: v.warnings,
        accepted: keepAccepted ? prev.accepted : undefined,
      };
      persist({ role, scope: next, version_chain: versionChain });
      return next;
    });
  };

  React.useEffect(() => {
    // Ensure initial hash/validation is computed at least once.
    if (!scope.scope_hash) compute(scope.draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setScopeDraft = async (draft: ScopeJson) => compute(draft, true);

  const validateScope = async () => compute(scope.draft, true);

  
const acceptScope = async () => {
  const v = await validateAndHashScope(scope.draft);
  if (role !== "Data Steward") return { ok: false, reason: "Only Data Steward can accept scope." };
  if (v.errors.length) return { ok: false, reason: "Fix validation errors before accepting." };

  // Backend (real ledger + hash chain). If unreachable, UI falls back to local simulation.
  try {
    const res = await apiAcceptScope(role as ApiRole, versionChain.selected_version_id);
    setScope((prev) => ({
      ...prev,
      status: res.state === "ACCEPTED" ? "ACCEPTED" : "DRAFT",
      draft: (res.scope_json as ScopeJson) ?? prev.draft,
    }));
  } catch {
    // ignore
  }

  const nextScope: ScopeState = {
    ...scope,
    status: "ACCEPTED",
    scope_hash: v.scope_hash,
    errors: v.errors,
    warnings: v.warnings,
    accepted: {
      scope: v.canonical_scope,
      scope_hash: v.scope_hash,
      accepted_at: nowIso(),
      accepted_by: role,
    },
  };

  const nextChain: VersionChainState = {
    ...versionChain,
    nodes: versionChain.nodes.map((n) =>
      n.version_id === versionChain.selected_version_id ? { ...n, scope_hash: v.scope_hash } : n
    ),
  };

  setScope(nextScope);
  setVersionChain(nextChain);
  persist({ role, scope: nextScope, version_chain: nextChain });

  return { ok: true };
};

  const reopenScope = async () => {
    // Backend reopen (writes ledger event). If unreachable, fallback to local.
    try {
      const res = await apiReopenScope(role as ApiRole, versionChain.selected_version_id);
      setScope((prev) => ({
        ...prev,
        status: res.state === "ACCEPTED" ? "ACCEPTED" : "DRAFT",
        draft: (res.scope_json as ScopeJson) ?? prev.draft,
      }));
    } catch {
      // Reopen creates a new draft, keeps accepted snapshot but allows editing.
      setScope((prev) => {
        const next: ScopeState = {
          ...prev,
          status: "DRAFT",
        };
        persist({ role, scope: next, version_chain: versionChain });
        return next;
      });
    }
    await compute(scope.draft, true);
  };



const selectVersion = (version_id: string) => {
  setVersionChain((prev) => {
    const exists = prev.nodes.some((n) => n.version_id === version_id);
    const next: VersionChainState = exists ? { ...prev, selected_version_id: version_id } : prev;
    // Persist with current scope snapshot; scope is Phase-1 global for now.
    persist({ role, scope, version_chain: next });
    return next;
  });
};

const createDraftVersion = () => {
  setVersionChain((prev) => {
    const last = prev.nodes[prev.nodes.length - 1];
    const parts = (last?.version_label || "1.0").split(".").map((p) => parseInt(p, 10));
    const major = Number.isFinite(parts[0]) ? parts[0] : 1;
    const minor = Number.isFinite(parts[1]) ? parts[1] + 1 : 1;
    const label = `${major}.${minor}`;
    const version_id = `VER-${new Date().getFullYear()}-${label}-${Math.random().toString(16).slice(2, 8)}`;
    const node: VersionNode = {
      version_id,
      version_label: label,
      status: "DRAFT",
      uploaded_at: nowIso(),
      structure_hash: "st_pending",
      scope_hash: scope.scope_hash || "",
      sha256: "sha256:pending",
      notes: "Draft created — upload amended regulation document to finalize.",
    };
    const next: VersionChainState = { nodes: [...prev.nodes, node], selected_version_id: version_id };
    persist({ role, scope, version_chain: next });
    return next;
  });
};

  const value: VersionState = {
    role,
    setRole,

    version_chain: versionChain,
    selectVersion,
    createDraftVersion,

    scope,
    setScopeDraft,
    validateScope,
    acceptScope,
    reopenScope,
  };

  return <VersionContext.Provider value={value}>{children}</VersionContext.Provider>;
}

export function useVersion() {
  const ctx = React.useContext(VersionContext);
  if (!ctx) throw new Error("useVersion must be used within VersionProvider");
  return ctx;
}


// Backwards-compatible alias used by App.tsx
export const useVersionApp = useVersion;

// Alias for screens that expect useAppState()
export const useAppState = useVersion;


export function useVersionNode() {
  const app = useVersion();
  const selected =
    app.version_chain.nodes.find((n) => n.version_id === app.version_chain.selected_version_id) ||
    app.version_chain.nodes[0];
  return selected;
}
