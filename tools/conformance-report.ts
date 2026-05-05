#!/usr/bin/env node
/**
 * Emits conformance-report.json and validates it against
 * schema/conformance_report.v1.schema.json.
 */
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsPlugin from "ajv-formats";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { canonicalJsonStringify } from "./canonical/canonical-json.js";

type Manifest = {
  version: string;
  schemas: Record<string, string>;
  goldens: Record<string, string>;
  semantics: Record<string, string>;
};

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

function sha256Utf8(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

function computeSpecFingerprint(manifest: Manifest): string {
  const refs = [
    ...Object.values(manifest.schemas),
    ...Object.values(manifest.goldens),
    ...Object.values(manifest.semantics),
  ].sort();
  const lines: string[] = [];
  for (const rel of refs) {
    const raw = fs.readFileSync(path.join(repoRoot, rel), "utf8");
    lines.push(`${rel}:${sha256Utf8(raw)}`);
  }
  return sha256Utf8(lines.join("\n"));
}

function replayHashes(): { canonicalHash: string; streamHashes: Record<string, string> } {
  const streamsRaw = process.env.INTENTPROOF_REPLAY_STREAMS?.trim();
  const streamIdsRaw = process.env.INTENTPROOF_REPLAY_STREAM_IDS?.trim();
  const defaultStream = path.join(repoRoot, "golden/canonicalization_cases.jsonl");
  const streamPaths = streamsRaw ? streamsRaw.split(":").filter(Boolean) : [defaultStream, defaultStream];
  const streamIds = streamIdsRaw
    ? streamIdsRaw.split(":").filter(Boolean)
    : streamPaths.map((_, idx) => `stream${idx + 1}`);
  const streamHashes: Record<string, string> = {};
  let canonicalHash = "";
  for (let i = 0; i < streamPaths.length; i++) {
    const id = streamIds[i] ?? `stream${i + 1}`;
    const text = fs.readFileSync(streamPaths[i]!, "utf8").trim();
    const lines = text ? text.split("\n") : [];
    const canonicalLines = lines.map((ln) => canonicalJsonStringify(JSON.parse(ln)));
    const joined = canonicalLines.join("\n");
    const h = sha256Utf8(joined);
    streamHashes[id] = h;
    if (i === 0) canonicalHash = h;
  }
  if (!canonicalHash) canonicalHash = sha256Utf8("");
  return { canonicalHash, streamHashes };
}

async function main(): Promise<number> {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "spec.json"), "utf8")) as Manifest;
  const reportSchema = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "schema/conformance_report.v1.schema.json"), "utf8"),
  ) as object;
  const sdkName = process.env.INTENTPROOF_SDK_NAME ?? process.env.INTENTPROOF_SDK_ID ?? "intentproof-spec";
  const sdkLanguage = process.env.INTENTPROOF_SDK_LANGUAGE ?? process.env.INTENTPROOF_SDK_ID ?? "spec";
  const sdkVersion = process.env.INTENTPROOF_SDK_VERSION ?? "unknown";
  const status = (s: string | undefined): "pass" | "fail" | "skip" =>
    s === "pass" || s === "fail" || s === "skip" ? s : "fail";
  const report = {
    specVersion: manifest.version,
    specFingerprint: computeSpecFingerprint(manifest),
    sdk: {
      name: sdkName,
      language: sdkLanguage,
      version: sdkVersion,
    },
    environment: {
      runtime: `node ${process.version}`,
      os: `${os.platform()} ${os.release()}`,
    },
    results: {
      schemaValidation: status(process.env.INTENTPROOF_RESULT_SCHEMA_VALIDATION),
      semanticValidation: status(process.env.INTENTPROOF_RESULT_SEMANTIC_VALIDATION),
      goldenTests: status(process.env.INTENTPROOF_RESULT_GOLDEN_TESTS),
      replayParity: status(process.env.INTENTPROOF_RESULT_REPLAY_PARITY),
    },
    replay: replayHashes(),
    generatedAt: new Date().toISOString(),
  };

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  (addFormatsPlugin as unknown as (a: Ajv2020) => void)(ajv);
  const validate = ajv.compile(reportSchema);
  if (!validate(report)) {
    console.error(
      `conformance-report: invalid report ${JSON.stringify(validate.errors ?? [], null, 2)}`,
    );
    return 1;
  }
  const out = path.join(repoRoot, "conformance-report.json");
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report));

  if (process.env.INTENTPROOF_ENFORCE_REPORT_PASS === "1") {
    const results = Object.values(report.results);
    if (results.some((r) => r !== "pass")) {
      console.error(`conformance-report: non-pass results ${JSON.stringify(report.results)}`);
      return 1;
    }
  }
  return 0;
}

void main().then((code) => process.exit(code));
