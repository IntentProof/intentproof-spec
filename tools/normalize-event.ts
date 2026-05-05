#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";
import { canonicalJsonStringify } from "./canonical/canonical-json.js";

const target = process.argv[2];
if (!target || target === "--help" || target === "-h") {
  console.error("Usage: normalize-event <path-to-json>");
  process.exit(2);
}

if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
  console.error(`normalize-event: not a file: ${target}`);
  process.exit(2);
}

let data: unknown;
try {
  data = JSON.parse(fs.readFileSync(target, "utf8")) as unknown;
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ error: "invalid_json", path: target, message }, null, 2));
  process.exit(2);
}

process.stdout.write(canonicalJsonStringify(data));
