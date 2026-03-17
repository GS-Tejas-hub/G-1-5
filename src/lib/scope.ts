import { refScopeVocab } from "../ref/refScopeVocab";
import { canonicalizeJson, sha256Hex } from "./hash";

export type ScopeJson = {
  geographies: string[];
  industries: string[];
  products: string[];
  themes: string[];
  // Room for future extensions without breaking UI:
  thresholds?: any[];
  conditions?: any[];
  exemptions?: any[];
  required_disclosures?: any[];
};

export type ScopeStatus = "DRAFT" | "VALID" | "INVALID" | "ACCEPTED";

export type ScopeValidation = {
  status: ScopeStatus;
  errors: string[];
  warnings: string[];
  canonical_scope: ScopeJson;
  canonical_string: string;
  scope_hash: string;
};

function flattenIds(tree: any[]): Set<string> {
  const ids = new Set<string>();
  const walk = (n: any) => {
    if (!n) return;
    if (n.id) ids.add(n.id);
    if (Array.isArray(n.children)) n.children.forEach(walk);
  };
  tree.forEach(walk);
  return ids;
}

const allowed = {
  geographies: flattenIds(refScopeVocab.geographies),
  industries: flattenIds(refScopeVocab.industries),
  products: flattenIds(refScopeVocab.products),
  themes: new Set(refScopeVocab.themes.map((t) => t.id)),
};

function uniqSorted(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort();
}

export async function validateAndHashScope(scope: ScopeJson): Promise<ScopeValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const canonical_scope: ScopeJson = {
    geographies: uniqSorted(scope.geographies || []),
    industries: uniqSorted(scope.industries || []),
    products: uniqSorted(scope.products || []),
    themes: uniqSorted(scope.themes || []),
    thresholds: scope.thresholds || [],
    conditions: scope.conditions || [],
    exemptions: scope.exemptions || [],
    required_disclosures: scope.required_disclosures || [],
  };

  // Basic completeness rules (tune later per regulation family)
  if (canonical_scope.geographies.length === 0) errors.push("Select at least one geography.");
  if (canonical_scope.industries.length === 0) errors.push("Select at least one industry.");
  if (canonical_scope.products.length === 0) warnings.push("No product category selected (OK for some regulations).");

  const check = (field: keyof typeof allowed) => {
    const bad = (canonical_scope[field] || []).filter((id) => !allowed[field].has(id));
    if (bad.length) errors.push(`Invalid ${field} id(s): ${bad.join(", ")}`);
  };

  check("geographies");
  check("industries");
  check("products");
  check("themes");

  const canonical_string = canonicalizeJson(canonical_scope);
  const scope_hash = await sha256Hex(canonical_string);

  let status: ScopeStatus = "DRAFT";
  if (errors.length) status = "INVALID";
  else status = warnings.length ? "VALID" : "VALID";

  return { status, errors, warnings, canonical_scope, canonical_string, scope_hash };
}
