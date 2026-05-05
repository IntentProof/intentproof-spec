#!/usr/bin/env node
/**
 * Cross-SDK replay equivalence: each JSONL line is one logical JSON value (typically one ExecutionEvent).
 * Values are canonicalized per semantics/serialization_rules.md and tools/canonical/canonical-json.ts;
 * all streams must agree byte-for-byte on every line index.
 */
import fs from "node:fs";
import process from "node:process";
import { canonicalJsonStringify } from "../canonical/canonical-json.js";

const files = process.argv.slice(2).filter((a) => !a.startsWith("-"));
if (files.length < 2 || process.argv.includes("--help") || process.argv.includes("-h")) {
  console.error("Usage: compare-streams <a.jsonl> <b.jsonl> [c.jsonl ...]");
  process.exit(2);
}

const streams = files.map((f) => {
  if (!fs.existsSync(f)) {
    console.error(`compare-streams: missing file: ${f}`);
    process.exit(2);
  }
  const text = fs.readFileSync(f, "utf8").trim();
  return text ? text.split("\n") : [];
});

const n = streams[0]!.length;
for (let i = 1; i < streams.length; i++) {
  if (streams[i]!.length !== n) {
    console.error(
      JSON.stringify({
        error: "line_count_mismatch",
        files,
        lengths: streams.map((s) => s.length),
      }),
    );
    process.exit(1);
  }
}

for (let lineIdx = 0; lineIdx < n; lineIdx++) {
  const canonicals = streams.map((s, fileIdx) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(s[lineIdx]!);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        JSON.stringify({
          error: "invalid_jsonl",
          file: files[fileIdx],
          line: lineIdx + 1,
          message: msg,
        }),
      );
      process.exit(2);
    }
    return canonicalJsonStringify(parsed);
  });
  const first = canonicals[0]!;
  for (let i = 1; i < canonicals.length; i++) {
    if (canonicals[i] !== first) {
      console.error(
        JSON.stringify({
          error: "canonical_mismatch",
          line: lineIdx + 1,
          files,
          left: first,
          right: canonicals[i],
        }),
      );
      process.exit(1);
    }
  }
}

console.log(JSON.stringify({ ok: true, linesCompared: n, files }));
