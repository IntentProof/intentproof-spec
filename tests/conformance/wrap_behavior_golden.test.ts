import { describe, expect, it } from "vitest";
import { loadGoldenWrapBehaviorCases } from "../runners/sdk_test_harness.js";

describe("Golden wrap behavior oracle (structural)", () => {
  const cases = loadGoldenWrapBehaviorCases();

  it("loads non-empty case set", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it.each(cases.map((c) => [c.caseId, c] as const))("case %s has coherent shape", (_id, c) => {
    expect(c.caseId).toMatch(/^[a-z0-9-]+$/);
    if (c.expect?.status === "ok") {
      expect(c.expect.hasError).toBe(false);
    }
    if (c.expect?.status === "error") {
      expect(c.expect.hasError).toBe(true);
      expect(c.expect.error).toEqual(expect.objectContaining({ name: expect.any(String), message: expect.any(String) }));
    }
    if (c.exporters) {
      expect(Array.isArray(c.exporters)).toBe(true);
      expect(c.expect?.invocationOrder).toEqual(c.exporters);
    }
  });
});
