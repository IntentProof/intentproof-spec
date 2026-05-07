import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { classifyAgainstBase } from "../../tools/schema-compatibility-classify.js";
import { REPO_ROOT } from "../lib/paths.js";

describe("schema-compatibility tool security", () => {
  test("does not execute shell fragments from --base", () => {
    const marker = path.join(os.tmpdir(), "intentproof-schema-compat-marker");
    if (fs.existsSync(marker)) {
      fs.unlinkSync(marker);
    }

    const injectedBaseRef = `origin/main"; touch ${marker}; #`;
    expect(() => classifyAgainstBase(REPO_ROOT, injectedBaseRef)).toThrow();
    expect(fs.existsSync(marker)).toBe(false);
  });
});
