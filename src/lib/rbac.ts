import type { ApiRole } from "./api";

export type Permission =
  | "tab:overview"
  | "tab:scope"
  | "tab:applicability"
  | "tab:version_chain"
  | "tab:audit"
  | "tab:change_impact"
  | "tab:lifecycle_wheel"
  | "scope:accept"
  | "scope:reopen"
  | "applicability:run"
  | "applicability:read"
  | "applicability:override"
  | "obligations:read"
  | "obligations:derive"
  | "obligations:assign";

export const PERMS: Record<ApiRole, Set<Permission>> = {
  Operator: new Set([
    "tab:overview",
    "tab:lifecycle_wheel",
    "tab:scope",
    "tab:applicability",
    "tab:version_chain",
    "tab:audit",
    "tab:change_impact",
    "applicability:run",
    "applicability:read",
    "obligations:read",
    "obligations:derive",
    "obligations:assign",
  ]),
  "Data Steward": new Set([
    "tab:overview",
    "tab:lifecycle_wheel",
    "tab:scope",
    "tab:applicability",
    "tab:version_chain",
    "tab:audit",
    "tab:change_impact",
    "scope:accept",
    "scope:reopen",
    "applicability:run",
    "applicability:read",
    "applicability:override",
    "obligations:read",
    "obligations:derive",
  ]),
  "Sustainability Officer": new Set([
    "tab:overview",
    "tab:lifecycle_wheel",
    "tab:scope",
    "tab:applicability",
    "tab:version_chain",
    "tab:audit",
    "tab:change_impact",
    "applicability:read",
    "obligations:read",
  ]),
  Owner: new Set([
    "tab:overview",
    "tab:lifecycle_wheel",
    "tab:scope",
    "tab:applicability",
    "tab:version_chain",
    "tab:audit",
    "tab:change_impact",
    "applicability:read",
    "applicability:override",
    "obligations:read",
  ]),
  Auditor: new Set([
    "tab:overview",
    "tab:lifecycle_wheel",
    "tab:scope",
    "tab:applicability",
    "tab:version_chain",
    "tab:audit",
    "tab:change_impact",
    "applicability:read",
    "obligations:read",
  ]),
  Regulator: new Set([
    "tab:overview",
    "tab:lifecycle_wheel",
    "tab:scope",
    "tab:applicability",
    "tab:audit",
    "applicability:read",
    "obligations:read",
  ]),
  Investor: new Set([
    "tab:overview",
    "tab:lifecycle_wheel",
    "tab:scope",
    "tab:applicability",
    "tab:audit",
    "applicability:read",
    "obligations:read",
  ]),
  Supplier: new Set(["tab:overview"]),
  Engineering: new Set(["tab:overview"]),
  "Facility Manager": new Set(["tab:overview"]),
  "Financial Officer": new Set(["tab:overview"]),
  Employee: new Set(["tab:overview"]),
};

export function can(role: ApiRole, perm: Permission): boolean {
  return PERMS[role]?.has(perm) ?? false;
}
