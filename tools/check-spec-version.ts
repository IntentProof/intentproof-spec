#!/usr/bin/env node
/** Enforces package.json intentproofSpecVersion === spec.json version (spec repo and SDK CI). */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const spec = JSON.parse(fs.readFileSync(path.join(root, "spec.json"), "utf8")) as { version: string };
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
  intentproofSpecVersion?: string;
};

if (!pkg.intentproofSpecVersion) {
  console.error("check-spec-version: package.json must declare intentproofSpecVersion (must match spec.json version).");
  process.exit(1);
}
if (pkg.intentproofSpecVersion !== spec.version) {
  console.error(
    `check-spec-version: intentproofSpecVersion ${pkg.intentproofSpecVersion} !== spec.json version ${spec.version}`,
  );
  process.exit(1);
}
console.log(`spec version OK: ${spec.version}`);
