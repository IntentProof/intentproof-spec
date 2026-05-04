import { describe, expect, it } from "vitest";
import { assertGoldenExecutionEventOracle, loadGoldenExecutionEventCases } from "../runners/sdk_test_harness.js";

describe("Golden execution event oracle", () => {
  it("loads cases", () => {
    const cases = loadGoldenExecutionEventCases();
    expect(cases.length).toBeGreaterThan(0);
  });

  it("matches schema + semantics expectations", () => {
    expect(() => assertGoldenExecutionEventOracle()).not.toThrow();
  });
});
