#!/usr/bin/env node
/**
 * Machine-readable conformance record for CI aggregation and external verification.
 * Emitted when INTENTPROOF_CONFORMANCE_JSON=1 from scripts/run-conformance.sh.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

function gitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function specVersion(): string {
  const specPath = path.join(repoRoot, "spec.json");
  const raw = fs.readFileSync(specPath, "utf8");
  return (JSON.parse(raw) as { version: string }).version;
}

const exitCode = Number(process.argv[2] ?? "0");
const ok = exitCode === 0;
const sdk = process.env.INTENTPROOF_SDK_ID ?? "spec";

const report = {
  specVersion: specVersion(),
  sdk,
  result: ok ? "pass" : "fail",
  commit: gitSha(),
  timestamp: new Date().toISOString(),
};

console.log(JSON.stringify(report));
process.exit(0);
