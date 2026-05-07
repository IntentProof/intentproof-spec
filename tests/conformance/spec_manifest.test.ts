import { describe, expect, it } from "vitest";
import { assertManifestPathsExist, loadSpecManifest } from "../lib/spec-manifest.js";

describe("spec manifest (spec.json)", () => {
  it("resolves and exists on disk", () => {
    expect(() => assertManifestPathsExist()).not.toThrow();
  });

  it("declares schema and golden keys", () => {
    const m = loadSpecManifest();
    expect(m.version).toMatch(/^spec-v[0-9]+\./);
    expect(m.schemas.execution_event).toContain("execution_event");
    expect(m.schemas.conformance_report).toContain("conformance_report");
    expect(m.schemas.conformance_certificate).toContain("conformance_certificate");
    expect(m.goldens.execution_events).toContain("execution_event_cases");
    expect(m.goldens.canonicalization).toContain("canonicalization_cases");
    expect(m.tools?.spec_fingerprint).toContain("spec-fingerprint");
  });
});
