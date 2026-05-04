import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { ValidateFunction } from "ajv/dist/2020.js";
import {
  formatAjvErrors,
  getExecutionEventValidator,
  getIntentProofConfigValidator,
  getWrapOptionsValidator,
} from "../lib/validator.js";
import { REPO_ROOT } from "../lib/paths.js";

function assertSchemaOk(label: string, validate: ValidateFunction, data: unknown): void {
  if (!validate(data)) {
    expect.fail(`${label}:\n${formatAjvErrors(validate.errors).join("\n")}`);
  }
}

describe("JSON Schema packs", () => {
  it("validates reference examples", () => {
    const validateEvent = getExecutionEventValidator();
    const ok = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, "examples/success_event.json"), "utf8"),
    );
    const err = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, "examples/error_event.json"), "utf8"),
    );
    assertSchemaOk("examples/success_event.json", validateEvent, ok);
    assertSchemaOk("examples/error_event.json", validateEvent, err);
  });

  it("validates wrap options fixture", () => {
    const validate = getWrapOptionsValidator();
    const opts = {
      intent: "Run the wrapped handler with default capture flags for smoke testing.",
      action: "conformance.wrap_options.validate",
      captureInputs: true,
      captureOutput: false,
      captureError: true,
      captureStack: true,
      propagateCorrelation: true,
      attributes: { a: 1, b: "x", c: null, d: false },
    };
    assertSchemaOk("wrap options fixture", validate, opts);
  });

  it("rejects unknown wrap option keys", () => {
    const validate = getWrapOptionsValidator();
    const bad = { unknownFlag: true };
    expect(validate(bad)).toBe(false);
  });

  it("validates intentproof config fixture", () => {
    const validate = getIntentProofConfigValidator();
    const cfg = {
      version: 1,
      defaultWrapOptions: {
        intent: "Apply organization-wide defaults when intent is omitted at the call site.",
        action: "app.request.handle",
      },
      exporters: [{ type: "console", failOpen: true }],
      correlation: { headerName: "x-intentproof-correlation-id", generateOnMissing: true },
      serialization: { maxDepth: 8, maxStringLength: 1024, redactKeys: ["authorization"] },
    };
    assertSchemaOk("intentproof config fixture", validate, cfg);
  });

  it("validates each step in multi_step_correlation example", () => {
    const validateEvent = getExecutionEventValidator();
    const bundle = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, "examples/multi_step_correlation.json"), "utf8"),
    ) as { steps: unknown[] };
    for (let i = 0; i < bundle.steps.length; i++) {
      assertSchemaOk(`multi_step_correlation.json steps[${i}]`, validateEvent, bundle.steps[i]);
    }
  });
});
