import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { canonicalJsonStringify } from "../../tools/canonical/canonical-json.js";
import { loadSpecManifest, resolveSpecPath } from "../lib/spec-manifest.js";

type Case = { caseId: string; input: unknown; canonical: string };

describe("canonicalization goldens", () => {
  it("INPUT → CANONICAL matches golden/canonicalization_cases.jsonl byte-for-byte", () => {
    const m = loadSpecManifest();
    const p = resolveSpecPath(m.goldens.canonicalization);
    const lines = fs.readFileSync(p, "utf8").trim().split("\n").filter(Boolean);
    for (const line of lines) {
      const c = JSON.parse(line) as Case;
      expect(canonicalJsonStringify(c.input), c.caseId).toBe(c.canonical);
    }
  });
});
