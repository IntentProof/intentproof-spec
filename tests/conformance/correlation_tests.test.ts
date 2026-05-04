import { describe, expect, it } from "vitest";
import { loadGoldenWrapBehaviorCases } from "../runners/sdk_test_harness.js";

describe("Correlation golden expectations", () => {
  it("inherits parent correlation when propagation is enabled", () => {
    const c = loadGoldenWrapBehaviorCases().find((x) => x.caseId === "nested-correlation-inherit");
    expect(c?.parent?.correlationId).toBeDefined();
    expect(c?.expect).toMatchObject({ correlationId: c?.parent?.correlationId });
  });

  it("uses explicit inner correlation when propagation is disabled", () => {
    const c = loadGoldenWrapBehaviorCases().find((x) => x.caseId === "nested-correlation-explicit-inner");
    expect(c?.effectiveOptions?.propagateCorrelation).toBe(false);
    expect(c?.expect).toMatchObject({
      correlationId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      source: "explicit_inner",
    });
  });

  it("documents trimming rule for SDK authors", () => {
    const id = "  \tbbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb \n";
    const trimmed = id.trim();
    expect(trimmed.length).toBeGreaterThan(0);
  });
});
