#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";
import { sortJsonValue } from "../tests/lib/canonical-json.js";

function readJson(pathArg: string, label: string): unknown {
  if (!fs.existsSync(pathArg) || !fs.statSync(pathArg).isFile()) {
    console.error(`diff-events: not a file (${label}): ${pathArg}`);
    process.exit(2);
  }
  try {
    return JSON.parse(fs.readFileSync(pathArg, "utf8")) as unknown;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ error: "invalid_json", path: pathArg, label, message }, null, 2));
    process.exit(2);
  }
}

const a = process.argv[2];
const b = process.argv[3];
if (!a || !b || a === "--help" || a === "-h") {
  console.error("Usage: diff-events <left.json> <right.json>");
  process.exit(2);
}

const left = sortJsonValue(readJson(a, "left"));
const right = sortJsonValue(readJson(b, "right"));
const ls = JSON.stringify(left);
const rs = JSON.stringify(right);
if (ls === rs) {
  console.log("NO_DIFF");
  process.exit(0);
}
console.error("DIFF");
console.error({ left, right });
process.exit(1);
