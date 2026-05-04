import { formatAjvErrors, getExecutionEventValidator } from "./validator.js";

export type SemanticsIssue = { kind: "semantics"; message: string } | { kind: "schema"; errors: string[] };

/** Post-schema semantic checks required for conformance (mirror in Python/Java). */
export function analyzeExecutionEvent(value: unknown): SemanticsIssue[] {
  const validate = getExecutionEventValidator();
  if (!validate(value)) {
    return [{ kind: "schema", errors: formatAjvErrors(validate.errors) }];
  }
  const ev = value as Record<string, unknown>;
  const issues: SemanticsIssue[] = [];

  const startedAt = Date.parse(String(ev.startedAt));
  const completedAt = Date.parse(String(ev.completedAt));
  if (Number.isNaN(startedAt) || Number.isNaN(completedAt)) {
    issues.push({ kind: "semantics", message: "startedAt and completedAt MUST parse as Date.parse-compatible timestamps" });
    return issues;
  }
  if (startedAt > completedAt) {
    issues.push({ kind: "semantics", message: "startedAt MUST be <= completedAt" });
  }

  const durationMs = Number(ev.durationMs);
  const expected = Math.max(0, Math.round(completedAt - startedAt));
  if (!Number.isFinite(durationMs)) {
    issues.push({ kind: "semantics", message: "durationMs MUST be a finite number" });
  } else if (Math.abs(durationMs - expected) > 1) {
    issues.push({
      kind: "semantics",
      message: `durationMs (${durationMs}) MUST match completedAt-startedAt within 1ms (expected ${expected})`,
    });
  }

  if (typeof ev.correlationId === "string" && ev.correlationId.trim().length === 0) {
    issues.push({ kind: "semantics", message: "correlationId MUST be trimmed non-empty when present" });
  }

  if (ev.status === "ok" && "error" in ev) {
    issues.push({ kind: "semantics", message: "status=ok MUST NOT include an error field" });
  }

  if (ev.attributes && typeof ev.attributes === "object" && ev.attributes !== null) {
    for (const [k, v] of Object.entries(ev.attributes as Record<string, unknown>)) {
      const t = typeof v;
      if (v !== null && t !== "string" && t !== "number" && t !== "boolean") {
        issues.push({
          kind: "semantics",
          message: `attributes.${k} MUST be string|number|boolean|null (got ${t})`,
        });
      }
    }
  }

  if (ev.error && typeof ev.error === "object" && ev.error !== null) {
    const err = ev.error as Record<string, unknown>;
    if (err.cause !== undefined && err.cause !== null) {
      const c = err.cause as Record<string, unknown>;
      if (typeof c.name !== "string" || typeof c.message !== "string") {
        issues.push({ kind: "semantics", message: "error.cause MUST be a nested ExecutionError with name and message strings" });
      }
    }
  }

  return issues;
}
