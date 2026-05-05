/**
 * Cross-SDK conformance harness. Node SDKs import this module directly; Python/Java
 * SHOULD execute equivalent logic by loading the same golden files and schemas.
 *
 * IntentProof specification (canonical repo): https://github.com/IntentProof/intentproof-spec
 * Entrypoint paths: spec.json
 */
import fs from "node:fs";
import { canonicalJsonStringify, sortJsonValue } from "../../tools/canonical/canonical-json.js";
import { analyzeExecutionEvent, type SemanticsIssue } from "../lib/semantics.js";
import { loadSpecManifest, resolveSpecPath } from "../lib/spec-manifest.js";
import { readUtf8 } from "../lib/paths.js";
import { formatAjvErrors, getExecutionEventValidator } from "../lib/validator.js";

export { canonicalJsonStringify, sortJsonValue };

const manifest = loadSpecManifest();

/** Resolved paths from spec.json — single entrypoint for SDK vendoring. */
export const SPEC_PATHS = {
  executionEventSchema: resolveSpecPath(manifest.schemas.execution_event),
  wrapOptionsSchema: resolveSpecPath(manifest.schemas.wrap_options),
  intentproofConfigSchema: resolveSpecPath(manifest.schemas.intentproof_config),
  goldenExecutionEvents: resolveSpecPath(manifest.goldens.execution_events),
  goldenWrapBehavior: resolveSpecPath(manifest.goldens.wrap_behavior),
  goldenCanonicalization: resolveSpecPath(manifest.goldens.canonicalization),
  specVersion: manifest.version,
} as const;

export type GoldenExecutionEventCase = {
  caseId: string;
  shouldValidate: boolean;
  event: unknown;
};

export function loadGoldenExecutionEventCases(): GoldenExecutionEventCase[] {
  const raw = readUtf8(manifest.goldens.execution_events).trim().split("\n");
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
