// src/state/lifecycleMachine.ts
/**
 * ESG / Compliance Lifecycle state machine used by the Circular Wheel UI.
 *
 * Design goals:
 * - Deterministic (no hidden transitions)
 * - UI-friendly (simple events, derived "canAdvance"/"blockedBy")
 * - Extensible (future EPIC-6+ can add states without breaking callers)
 *
 * NOTE: This is a UI orchestration machine. Backend remains the source of truth for
 * compliance-cycle status; the UI machine provides navigation + gating logic.
 */

export type LifecyclePhase =
  | "INVENTORY_READY"      // EPIC-1 complete + version READY
  | "SCOPE_DEFINED"        // EPIC-2 coverage scope accepted
  | "APPLICABILITY_CHECK"  // EPIC-2 applicability run + decision stored
  | "PLAN_WORK"            // EPIC-3 obligations inbox / assignment
  | "COLLECT_DATA"         // EPIC-4 evidence upload & candidate extraction
  | "VALIDATE_DATA"        // EPIC-4 confirm values / confidence
  | "READINESS_COMPUTE"    // EPIC-5 readiness recompute & dependencies
  | "APPROVALS"            // EPIC-5 governance approvals
  | "SUBMISSION"           // Snapshot/export/lock
  | "AUDIT_TRACE";         // EPIC-6 trace (future) – currently viewer-only

export type LifecycleEvent =
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "JUMP"; to: LifecyclePhase }
  | { type: "MARK_DONE"; phase: LifecyclePhase }
  | { type: "REOPEN"; phase: LifecyclePhase };

export type PhaseStatus = "LOCKED" | "AVAILABLE" | "DONE" | "BLOCKED";

export type LifecycleContext = {
  /** Optional: server-backed cycle id */
  compliance_cycle_id?: string | null;

  /** Completion flags (can be partially populated from backend) */
  done: Partial<Record<LifecyclePhase, boolean>>;

  /**
   * Block reasons keyed by phase. If present & non-empty, phase is BLOCKED.
   * Example: { PLAN_WORK: ["No obligations derived yet"] }
   */
  blockedBy: Partial<Record<LifecyclePhase, string[]>>;

  /**
   * Optional signals used for guards (future: wire to EPIC DTOs)
   */
  signals?: {
    has_regulation_version_ready?: boolean;
    scope_accepted?: boolean;
    applicability_decided?: boolean;
    obligations_derived?: boolean;
    variables_missing_count?: number;
    approvals_pending_count?: number;
    snapshot_locked?: boolean;
  };
};

export type LifecycleState = {
  active: LifecyclePhase;
  ctx: LifecycleContext;
};

export const PHASE_ORDER: LifecyclePhase[] = [
  "INVENTORY_READY",
  "SCOPE_DEFINED",
  "APPLICABILITY_CHECK",
  "PLAN_WORK",
  "COLLECT_DATA",
  "VALIDATE_DATA",
  "READINESS_COMPUTE",
  "APPROVALS",
  "SUBMISSION",
  "AUDIT_TRACE",
];

function idx(p: LifecyclePhase): number {
  const i = PHASE_ORDER.indexOf(p);
  return i < 0 ? 0 : i;
}

export function defaultLifecycleContext(): LifecycleContext {
  return {
    compliance_cycle_id: null,
    done: {},
    blockedBy: {},
    signals: {
      has_regulation_version_ready: false,
      scope_accepted: false,
      applicability_decided: false,
      obligations_derived: false,
      variables_missing_count: 0,
      approvals_pending_count: 0,
      snapshot_locked: false,
    },
  };
}

/**
 * Derive phase availability based on completion + guard signals.
 * Rules (simple & predictable):
 * - A phase is AVAILABLE when all previous phases are DONE.
 * - A phase is DONE when ctx.done[phase] === true.
 * - A phase is BLOCKED when ctx.blockedBy[phase] has entries.
 * - A phase is LOCKED when previous phases not done.
 *
 * IMPORTANT: This does NOT infer done-ness from signals; done flags are explicit.
 * Use `hydrateDoneFromSignals()` if you want.
 */
export function phaseStatus(state: LifecycleState, phase: LifecyclePhase): PhaseStatus {
  const done = !!state.ctx.done?.[phase];
  if (done) return "DONE";

  const blockers = state.ctx.blockedBy?.[phase];
  if (blockers && blockers.length > 0) return "BLOCKED";

  const requiredPrev = PHASE_ORDER.slice(0, idx(phase));
  const allPrevDone = requiredPrev.every((p) => !!state.ctx.done?.[p]);
  return allPrevDone ? "AVAILABLE" : "LOCKED";
}

export function canActivate(state: LifecycleState, phase: LifecyclePhase): boolean {
  const st = phaseStatus(state, phase);
  return st === "AVAILABLE" || st === "DONE" || (st === "BLOCKED" && idx(phase) <= idx(state.active));
}

/**
 * Optional convenience: infer "done" flags from known signals.
 * Safe defaults: only promote done flags when signals strongly imply completion.
 */
export function hydrateDoneFromSignals(
  state: LifecycleState,
  phaseDone?: Record<string, boolean>,
): LifecycleState {
  const ctx = state.ctx;
  const s = ctx.signals || {};
  const done: Partial<Record<LifecyclePhase, boolean>> = { ...(ctx.done || {}) };

  // Apply backend phase_done signals if provided
  if (phaseDone) {
    for (const [key, val] of Object.entries(phaseDone)) {
      if (val && key in done === false) {
        (done as any)[key] = val;
      }
    }
  }

  if (s.has_regulation_version_ready) done.INVENTORY_READY = true;
  if (s.scope_accepted) done.SCOPE_DEFINED = true;
  if (s.applicability_decided) done.APPLICABILITY_CHECK = true;
  if (s.obligations_derived) done.PLAN_WORK = true;
  if ((s.variables_missing_count ?? 0) === 0) done.VALIDATE_DATA = done.VALIDATE_DATA ?? false;
  if (s.snapshot_locked) done.SUBMISSION = true;

  return { ...state, ctx: { ...ctx, done } };
}

export function transition(state: LifecycleState, ev: LifecycleEvent): LifecycleState {
  const currentIndex = idx(state.active);

  if (ev.type === "MARK_DONE") {
    return {
      ...state,
      ctx: {
        ...state.ctx,
        done: { ...(state.ctx.done || {}), [ev.phase]: true },
      },
    };
  }

  if (ev.type === "REOPEN") {
    const done = { ...(state.ctx.done || {}) };
    delete (done as any)[ev.phase];
    // Reopening a phase reopens all downstream phases too.
    for (const p of PHASE_ORDER.slice(idx(ev.phase) + 1)) delete (done as any)[p];
    return { ...state, active: ev.phase, ctx: { ...state.ctx, done } };
  }

  if (ev.type === "JUMP") {
    if (!canActivate(state, ev.to)) return state;
    return { ...state, active: ev.to };
  }

  if (ev.type === "BACK") {
    const prev = PHASE_ORDER[Math.max(0, currentIndex - 1)];
    if (!canActivate(state, prev)) return state;
    return { ...state, active: prev };
  }

  if (ev.type === "NEXT") {
    const next = PHASE_ORDER[Math.min(PHASE_ORDER.length - 1, currentIndex + 1)];
    if (!canActivate(state, next)) return state;
    return { ...state, active: next };
  }

  return state;
}

export function initialLifecycleState(partial?: Partial<LifecycleState>): LifecycleState {
  const base: LifecycleState = { active: "INVENTORY_READY", ctx: defaultLifecycleContext() };
  const merged: LifecycleState = {
    active: partial?.active ?? base.active,
    ctx: { ...base.ctx, ...(partial?.ctx || {}) },
  };
  return merged;
}

export function phaseLabel(p: LifecyclePhase): string {
  switch (p) {
    case "INVENTORY_READY":
      return "Inventory Ready";
    case "SCOPE_DEFINED":
      return "Define Scope";
    case "APPLICABILITY_CHECK":
      return "Assess Applicability";
    case "PLAN_WORK":
      return "Plan Work";
    case "COLLECT_DATA":
      return "Collect Data";
    case "VALIDATE_DATA":
      return "Validate Data";
    case "READINESS_COMPUTE":
      return "Compute Readiness";
    case "APPROVALS":
      return "Approvals";
    case "SUBMISSION":
      return "Submission";
    case "AUDIT_TRACE":
      return "Audit Trace";
    default:
      return p;
  }
}

export function phaseSummary(p: LifecyclePhase): string {
  switch (p) {
    case "INVENTORY_READY":
      return "Regulation exists, version READY, structure hash frozen (EPIC‑1/2).";
    case "SCOPE_DEFINED":
      return "Coverage scope captured and accepted; exported geos & boundaries set (EPIC‑2).";
    case "APPLICABILITY_CHECK":
      return "Applicability evaluated with deterministic rules + recorded decision (EPIC‑2).";
    case "PLAN_WORK":
      return "Obligations inbox reviewed; severity, due dates, owners, tasks assigned (EPIC‑3).";
    case "COLLECT_DATA":
      return "Evidence uploaded and linked to variables; candidates extracted (EPIC‑4).";
    case "VALIDATE_DATA":
      return "Values confirmed (manual/estimate/supplier), confidence tracked (EPIC‑4).";
    case "READINESS_COMPUTE":
      return "Readiness recomputed; missing blockers & dependency graph updated (EPIC‑5).";
    case "APPROVALS":
      return "Owner approvals / governance checks before submission (EPIC‑5).";
    case "SUBMISSION":
      return "Snapshot locked; export package generated; submission recorded (EPIC‑5/6).";
    case "AUDIT_TRACE":
      return "Proof trace: show evidence links, hashes, and decisions (EPIC‑6, planned).";
    default:
      return "";
  }
}
