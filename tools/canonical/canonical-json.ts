/**
 * Normative canonical JSON for cross-language ExecutionEvent byte equality.
 * Spec: semantics/serialization_rules.md — behaviors referenced by spec.json.
 */

/** Deterministic key order for stable diffs and golden comparisons across SDKs. */
export function sortJsonValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortJsonValue);
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    out[k] = sortJsonValue(obj[k]);
  }
  return out;
}

/** UTF-8 string used for conformance: sorted keys recursively, then JSON.stringify, then one trailing LF. */
export function canonicalJsonStringify(value: unknown): string {
  return `${JSON.stringify(sortJsonValue(value))}\n`;
}
