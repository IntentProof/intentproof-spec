/**
 * Cross-SDK conformance harness. Node SDKs import this module directly; Python/Java
 * SHOULD execute equivalent logic by loading the same golden files and schemas.
 *
 * Canonical spec repo: https://github.com/intentproof/intentproof-spec
 */
import fs from "node:fs";
import path from "node:path";
import { canonicalJsonStringify, sortJsonValue } from "../lib/canonical-json.js";
import { analyzeExecutionEvent, type SemanticsIssue } from "../lib/semantics.js";
import { REPO_ROOT, readUtf8 } from "../lib/paths.js";
import { formatAjvErrors, getExecutionEventValidator } from "../lib/validator.js";

export { canonicalJsonStringify, sortJsonValue };

export const SPEC_PATHS = {
  executionEventSchema: path.join(REPO_ROOT, "schema/execution_event.v1.schema.json"),
  wrapOptionsSchema: path.join(REPO_ROOT, "schema/wrap_options.v1.schema.json"),
  intentproofConfigSchema: path.join(REPO_ROOT, "schema/intentproof_config.v1.schema.json"),
  goldenExecutionEvents: path.join(REPO_ROOT, "golden/execution_event_cases.jsonl"),
  goldenWrapBehavior: path.join(REPO_ROOT, "golden/wrap_behavior_cases.jsonl"),
} as const;

export type GoldenExecutionEventCase = {
  caseId: string;
  shouldValidate: boolean;
  event: unknown;
};

export function loadGoldenExecutionEventCases(): GoldenExecutionEventCase[] {
  const raw = readUtf8("golden/execution_event_cases.jsonl").trim().split("\n");
  return raw.filter(Boolean).map((line) => JSON.parse(line) as GoldenExecutionEventCase);
}

export type HarnessResult =
  | { ok: true }
  | { ok: false; caseId: string; issues: SemanticsIssue[]; rawErrors?: string[] };

/** Full gate used by SDK CI: schema + semantics for a single event payload. */
export function validateExecutionEvent(value: unknown): HarnessResult {
  const issues = analyzeExecutionEvent(value);
  if (!issues.length) return { ok: true };
  const schemaErrors = issues.filter((i) => i.kind === "schema").flatMap((i) => ("errors" in i ? i.errors : []));
  return {
    ok: false,
    caseId: "<adhoc>",
    issues,
    rawErrors: schemaErrors.length ? schemaErrors : issues.map((i) => ("message" in i ? i.message : "")),
  };
}

/** Assert golden oracle: each line must match expected validation outcome. */
export function assertGoldenExecutionEventOracle(): void {
  const cases = loadGoldenExecutionEventCases();
  const validate = getExecutionEventValidator();
  for (const c of cases) {
    const schemaOk = Boolean(validate(c.event));
    const schemaErrors = formatAjvErrors(validate.errors);
    const semanticsIssues = schemaOk ? analyzeExecutionEvent(c.event).filter((i) => i.kind === "semantics") : [];
    const actuallyOk = schemaOk && semanticsIssues.length === 0;
    if (actuallyOk !== c.shouldValidate) {
      throw new Error(
        `Golden mismatch for ${c.caseId}: shouldValidate=${c.shouldValidate} but got schemaOk=${schemaOk} semantics=${semanticsIssues
          .map((s) => s.message)
          .join(" | ")} ajv=${schemaErrors.join("; ")}`,
      );
    }
  }
}

export type WrapBehaviorCase = {
  caseId: string;
  effectiveOptions?: Record<string, unknown>;
  parent?: { correlationId?: string };
  expect?: Record<string, unknown>;
  exporters?: string[];
  call?: Record<string, unknown>;
};

export function loadGoldenWrapBehaviorCases(): WrapBehaviorCase[] {
  const raw = fs.readFileSync(SPEC_PATHS.goldenWrapBehavior, "utf8").trim().split("\n");
  return raw.filter(Boolean).map((line) => JSON.parse(line) as WrapBehaviorCase);
}
