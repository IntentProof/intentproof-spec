import { describe, expect, it } from "vitest";
import { analyzeExecutionEvent } from "../lib/semantics.js";

describe("ExecutionEvent semantics", () => {
  it("flags duration skew beyond 1ms", () => {
    const ev = {
      id: "1",
      intent: "Unit test: duration skew detection on synthetic timestamps.",
      action: "conformance.semantics.duration_skew",
      status: "ok",
      inputs: {},
      output: null,
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:00:01.000Z",
      durationMs: 5,
    };
    const issues = analyzeExecutionEvent(ev);
    expect(issues.some((i) => i.kind === "semantics")).toBe(true);
  });

  it("accepts aligned duration", () => {
    const ev = {
      id: "1",
      intent: "Unit test: durationMs should match completedAt minus startedAt.",
      action: "conformance.semantics.duration_aligned",
      status: "ok",
      inputs: {},
      output: null,
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:00:01.000Z",
      durationMs: 1000,
    };
    const issues = analyzeExecutionEvent(ev);
    expect(issues).toEqual([]);
  });

  it("rejects ok payload that includes forbidden error field (schema gate)", () => {
    const ev = {
      id: "1",
      intent: "Unit test: ok status must not carry an error object.",
      action: "conformance.schema.ok_with_error",
      status: "ok",
      inputs: {},
      output: 1,
      error: { name: "X", message: "y" },
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:00:00.000Z",
      durationMs: 0,
    };
    const issues = analyzeExecutionEvent(ev);
    expect(issues.length).toBeGreaterThan(0);
  });
});
