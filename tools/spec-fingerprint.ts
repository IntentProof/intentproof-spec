#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { loadSpecManifest, resolveSpecPath } from "../tests/lib/spec-manifest.js";

type Fingerprint = {
  specVersion: string;
  generatedAt: string;
  algorithm: "sha256";
  files: Record<string, string>;
  aggregate: string;
};

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

function buildFingerprint(): Fingerprint {
  const manifest = loadSpecManifest();
  const schemaEntries = Object.entries(manifest.schemas).sort(([a], [b]) => a.localeCompare(b));
  const files: Record<string, string> = {};
  const aggregateLines: string[] = [];
  for (const [, rel] of schemaEntries) {
    const abs = resolveSpecPath(rel);
    const normalizedRel = rel.split(path.sep).join("/");
    const raw = fs.readFileSync(abs, "utf8");
    const digest = sha256(raw);
    files[normalizedRel] = digest;
    aggregateLines.push(`${normalizedRel}:${digest}`);
  }
  return {
    specVersion: manifest.version,
    generatedAt: new Date().toISOString(),
    algorithm: "sha256",
    files,
    aggregate: sha256(aggregateLines.join("\n")),
  };
}

const fp = buildFingerprint();
process.stdout.write(`${JSON.stringify(fp, null, 2)}\n`);
