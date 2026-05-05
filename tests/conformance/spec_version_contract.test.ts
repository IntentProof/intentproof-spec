import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../lib/paths.js";
import { loadSpecManifest } from "../lib/spec-manifest.js";

describe("spec version pinning contract", () => {
  it("package.json intentproofSpecVersion matches spec.json", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8")) as {
      intentproofSpecVersion?: string;
    };
    const spec = loadSpecManifest();
    expect(pkg.intentproofSpecVersion).toBe(spec.version);
  });
});
