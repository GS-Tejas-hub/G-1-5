export type ApiRole =
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

const DEFAULT_BASE = import.meta.env.VITE_DEFAULT_BASE || "http://localhost:8787";

async function apiFetch<T>(
  path: string,
  opts: RequestInit & { role: ApiRole }
): Promise<T> {
  const res = await fetch(`${DEFAULT_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-Role": opts.role,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export type ScopeResponse = {
  version_id: string;
  state: "DRAFT" | "ACCEPTED";
  scope_json: Record<string, unknown>;
  accepted_by_role?: string | null;
  accepted_at_ms?: number | null;
};

export type AuditEvent = {
  event_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_role: string;
  at_ms: number;
  prev_event_hash: string;
  event_hash: string;
  details: Record<string, unknown>;
};

export async function getScope(role: ApiRole, versionId: string) {
  return apiFetch<ScopeResponse>(`/api/v1/epic1/versions/${versionId}/scope`, {
    method: "GET",
    role,
  });
}

export async function acceptScope(role: ApiRole, versionId: string) {
  return apiFetch<ScopeResponse>(`/api/v1/epic1/versions/${versionId}/scope/accept`, {
    method: "POST",
    role,
    body: JSON.stringify({}),
  });
}

export async function reopenScope(role: ApiRole, versionId: string) {
  return apiFetch<ScopeResponse>(`/api/v1/epic1/versions/${versionId}/scope/reopen`, {
    method: "POST",
    role,
    body: JSON.stringify({}),
  });
}

export async function listAudit(role: ApiRole, entityType: string, entityId: string) {
  const qs = new URLSearchParams({ entity_type: entityType, entity_id: entityId });
  return apiFetch<AuditEvent[]>(`/api/v1/epic1/audit?${qs.toString()}`, {
    method: "GET",
    role,
  });
}

export async function verifyAudit(role: ApiRole, entityType: string, entityId: string) {
  const qs = new URLSearchParams({ entity_type: entityType, entity_id: entityId });
  return apiFetch<{ ok: boolean; count: number; head?: string }>(
    `/api/v1/epic1/audit/verify?${qs.toString()}`,
    {
      method: "GET",
      role,
    }
  );
}

// ---------------- EPIC-2 (Applicability) ----------------

export type ReportingPeriod = {
  period_id: string;
  start_date: string;
  end_date: string;
};

export type OrgProfile = {
  org_id: string;
  operating_geographies: string[];
  export_geographies: string[];
  product_categories: string[];
  industry_code?: string | null;
  revenue?: number | null;
  export_dependency_ratio?: number | null;
};

export type ApplicabilityDecision = {
  decision_id: string;
  org_id: string;
  version_id: string;
  period_id: string;
  applicability_status: "APPLICABLE" | "NOT_APPLICABLE" | "INSUFFICIENT_DATA";
  score: number;
  rule_hits: string[];
  rule_misses: string[];
  missing_profile_fields: string[];
  ruleset_version: string;
  computed_at_ms: number;
  computed_by_role: string;
  override: boolean;
  override_reason?: string | null;
  base_decision_id?: string | null;
};

export type ApplicabilityHistoryResponse = {
  org_id: string;
  version_id: string;
  period_id: string;
  decisions: ApplicabilityDecision[];
};

export async function runApplicability(
  role: ApiRole,
  versionId: string,
  reportingPeriod: ReportingPeriod,
  orgProfile?: Partial<OrgProfile>
) {
  return apiFetch<ApplicabilityDecision>(`/api/v1/epic2/applicability/run`, {
    method: "POST",
    role,
    headers: {
      "X-Org-Id": orgProfile?.org_id || "ORG-1",
    },
    body: JSON.stringify({
      version_id: versionId,
      reporting_period: reportingPeriod,
      org_profile: orgProfile || null,
      ruleset_version: "v1",
      mode: "MANUAL",
    }),
  });
}

export async function overrideApplicability(
  role: ApiRole,
  decisionId: string,
  newStatus: "APPLICABLE" | "NOT_APPLICABLE",
  reason: string
) {
  return apiFetch<ApplicabilityDecision>(`/api/v1/epic2/applicability/override`, {
    method: "POST",
    role,
    body: JSON.stringify({
      decision_id: decisionId,
      new_status: newStatus,
      reason,
      ruleset_version: "v1",
    }),
  });
}

export async function getApplicabilityHistory(
  role: ApiRole,
  versionId: string,
  periodId: string,
  orgId = "ORG-1"
) {
  const qs = new URLSearchParams({ version_id: versionId, period_id: periodId });
  return apiFetch<ApplicabilityHistoryResponse>(
    `/api/v1/epic2/applicability/history?${qs.toString()}`,
    {
      method: "GET",
      role,
      headers: { "X-Org-Id": orgId },
    }
  );
}

export async function getApplicabilityLatest(
  role: ApiRole,
  versionId: string,
  periodId: string,
  orgId = "ORG-1"
) {
  const qs = new URLSearchParams({ version_id: versionId, period_id: periodId });
  return apiFetch<{ latest: ApplicabilityDecision | null }>(
    `/api/v1/epic2/applicability/latest?${qs.toString()}`,
    {
      method: "GET",
      role,
      headers: { "X-Org-Id": orgId },
    }
  );
}

// ---------------- EPIC-3 (Obligations) ----------------

export type Obligation = {
  obligation_id: string;
  compliance_cycle_id: string;
  title: string;
  summary?: string | null;
  citation_anchor?: string | null;
  severity: "blocking" | "informational";
  blocking_flag: boolean;
  due_date?: string | null;
  required_variables: string[];
  assigned_role?: string | null;
  assigned_to?: string | null;
  status: "open" | "in_progress" | "done";
  created_at: string;
  updated_at: string;
};

export async function deriveObligations(
  role: ApiRole,
  params: {
    org_id: string;
    regulation_key: string;
    version_id: string;
    period_id: string;
  }
) {
  return apiFetch<{ compliance_cycle_id: string; obligations: Obligation[] }>(
    `/api/v1/epic3/obligations/derive`,
    {
      method: "POST",
      role,
      body: JSON.stringify(params),
    }
  );
}

export async function listObligations(
  role: ApiRole,
  params: {
    org_id: string;
    regulation_key: string;
    version_id: string;
    period_id: string;
  }
) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<{ compliance_cycle_id: string; obligations: Obligation[] }>(
    `/api/v1/epic3/obligations?${qs}`,
    {
      method: "GET",
      role,
    }
  );
}

// -----------------
// EPIC-4 Variables
// -----------------

export type VariableState = "MISSING" | "ESTIMATED" | "VERIFIED";

export type VariableRow = {
  var_id: string;
  name: string;
  state: VariableState;
  unit?: string | null;
  value?: number | null;
  confidence: number;
  method: string;
  evidence_ids: string[];
  updated_at_ms: number;
};

export type VariableSummary = {
  cycle_id: string;
  missing: number;
  estimated: number;
  verified: number;
};

export async function listVariables(role: ApiRole, cycle_id: string) {
  return apiFetch<VariableRow[]>(
    `/api/v1/epic4/cycles/${encodeURIComponent(cycle_id)}/variables`,
    { method: "GET", role }
  );
}

export async function getVariablesSummary(role: ApiRole, cycle_id: string) {
  return apiFetch<VariableSummary>(
    `/api/v1/epic4/cycles/${encodeURIComponent(cycle_id)}/variables/summary`,
    { method: "GET", role }
  );
}

export async function provideVariableValue(
  role: ApiRole,
  cycle_id: string,
  var_id: string,
  body: { value: number; unit?: string; method?: string; confidence?: number; note?: string }
) {
  return apiFetch<VariableRow>(
    `/api/v1/epic4/cycles/${encodeURIComponent(cycle_id)}/variables/${encodeURIComponent(var_id)}/value`,
    {
      method: "POST",
      role,
      body: JSON.stringify(body),
    }
  );
}

export async function confirmVariableValue(
  role: ApiRole,
  cycle_id: string,
  var_id: string,
  body: { note?: string } = {}
) {
  return apiFetch<VariableRow>(
    `/api/v1/epic4/cycles/${encodeURIComponent(cycle_id)}/variables/${encodeURIComponent(var_id)}/confirm`,
    {
      method: "POST",
      role,
      body: JSON.stringify(body),
    }
  );
}

export async function uploadEvidence(
  role: ApiRole,
  cycle_id: string,
  var_id: string,
  file: File,
  note?: string
) {
  const fd = new FormData();
  fd.append("file", file);
  if (note) fd.append("note", note);
  const res = await fetch(
    `${DEFAULT_BASE}/api/v1/epic4/cycles/${encodeURIComponent(cycle_id)}/variables/${encodeURIComponent(var_id)}/evidence`,
    {
      method: "POST",
      headers: {
        "X-Role": role,
      },
      body: fd,
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { evidence_id: string; filename: string };
}

export function evidenceDownloadUrl(evidence_id: string) {
  return `${DEFAULT_BASE}/api/v1/epic4/evidence/${encodeURIComponent(evidence_id)}`;
}

export async function assignObligation(
  role: ApiRole,
  params: {
    org_id: string;
    regulation_key: string;
    version_id: string;
    period_id: string;
    obligation_id: string;
    assigned_role: string;
    assigned_to?: string;
    due_date?: string;
  }
) {
  const { obligation_id, ...rest } = params;
  const qs = new URLSearchParams({
    org_id: rest.org_id,
    regulation_key: rest.regulation_key,
    version_id: rest.version_id,
    period_id: rest.period_id,
  }).toString();
  return apiFetch<{ obligation: Obligation }>(
    `/api/v1/epic3/obligations/${encodeURIComponent(obligation_id)}/assign?${qs}`,
    {
      method: "POST",
      role,
      body: JSON.stringify({
        assigned_role: rest.assigned_role,
        assigned_to: rest.assigned_to,
        due_date: rest.due_date,
      }),
    }
  );
}

// EPIC-5 (Readiness/Risk/Financial Exposure)
async function fetchJson(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${DEFAULT_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  return res.json();
}

export function fetchReadiness(params: { cycle_id: string }) {
  return fetchJson(`/api/v1/epic5/readiness/${params.cycle_id}`);
}

export function fetchRisk(params: { cycle_id: string }) {
  return fetchJson(`/api/v1/epic5/risk/${params.cycle_id}`);
}

export function fetchFinancial(params: { cycle_id: string }) {
  return fetchJson(`/api/v1/epic5/financial/${params.cycle_id}`);
}

export function fetchBlockingSummary(params: { cycle_id: string }) {
  return fetchJson(`/api/v1/epic5/blocking-summary/${params.cycle_id}`);
}

export function recomputeEpic5(params: { cycle_id: string }) {
  return fetchJson(`/api/v1/epic5/recompute/${params.cycle_id}`, { method: "POST" });
}


export type WheelSignals = {
  cycle: any;
  version: any;
  scope: any;
  applicability_latest: any;
  counts: {
    obligations_total: number;
    obligations_open: number;
    obligations_blocking_open: number;
    variables_total: number;
    variables_missing: number;
    variables_estimated: number;
    variables_verified: number;
    variables_required_missing: number;
  };
  epic5: {
    readiness: any;
    blocking_summary: any;
    snapshot_present: boolean;
  };
  phase_done: Record<string, boolean>;
};

export async function getWheelSignals(role: ApiRole, cycleId: string) {
  return apiFetch<WheelSignals>(`/api/v1/ui/wheel/signals/${cycleId}`, {
    method: "GET",
    role,
  });
}


export type UiCycle = {
  cycle_id: string;
  regulation_key: string;
  version_id: string;
  reporting_period: string;
  status: string;
  created_at_ms?: number;
};




export type UiRegulation = {
  regulation_key: string;
  title: string;
};

export async function getUiRegulations(role: ApiRole) {
  return apiFetch<{ items: UiRegulation[] }>(`/api/v1/ui/regulations`, {
    method: "GET",
    role,
  });
}


export type UiVersion = {
  version_id: string;
  regulation_key?: string;
  title?: string;
  status?: string;
  structure_hash?: string;
};

export async function getUiVersions(role: ApiRole) {
  return apiFetch<{ items: UiVersion[] }>(`/api/v1/ui/versions`, {
    method: "GET",
    role,
  });
}
export async function getUiCycles(role: ApiRole) {
  return apiFetch<{ items: UiCycle[] }>(`/api/v1/ui/cycles`, {
    method: "GET",
    role,
  });
}


export type CreateCycleRequest = {
  org_id?: string;
  version_id: string;
  reporting_period: string;
};

export async function createUiCycle(role: ApiRole, req: CreateCycleRequest) {
  return apiFetch<{ cycle: UiCycle }>(`/api/v1/ui/cycles`, {
    method: "POST",
    role,
    body: JSON.stringify(req),
  });
}
