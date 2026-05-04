import { describe, expect, it } from "vitest";
import { canonicalJsonStringify, validateExecutionEvent } from "../runners/sdk_test_harness.js";

describe("sdk_test_harness", () => {
  it("validateExecutionEvent accepts minimal ok fixture", () => {
    const ev = {
      id: "h1",
      intent: "Harness smoke: minimal valid ok event.",
      action: "con.harness.ok_minimal",
      status: "ok",
      inputs: {},
      output: null,
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:00:00.000Z",
      durationMs: 0,
    };
    expect(validateExecutionEvent(ev)).toEqual({ ok: true });
  });

  it("exports canonical JSON helper for cross-SDK diffs", () => {
    expect(canonicalJsonStringify({ b: 1, a: 2 })).toContain('"a"');
  });
});
