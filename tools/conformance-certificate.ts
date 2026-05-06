#!/usr/bin/env node
/**
 * Reads conformance-report.json, emits conformance-certificate.json, validates
 * against schema/conformance_certificate.v1.schema.json.
 *
 * Preconditions: report must exist, validate as conformance_report.v1, and
 * satisfy issuance gates (all phases pass; replayParity not skip unless
 * INTENTPROOF_CERTIFICATE_ALLOW_REPLAY_SKIP=1).
 *
 * Report digest: SHA-256 of the exact UTF-8 bytes of conformance-report.json on disk.
 */
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsPlugin from "ajv-formats";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

function sha256Utf8(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

function gitHead(): string | undefined {
  try {
    const h = execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim().toLowerCase();
    return /^[a-f0-9]{40}$/.test(h) ? h : undefined;
  } catch {
    return undefined;
  }
}

type ConformanceReport = {
  specVersion: string;
  specFingerprint: string;
  sdk: { name: string; language: string; version: string };
  results: {
    schemaValidation: string;
    semanticValidation: string;
    goldenTests: string;
    replayParity: string;
  };
};

function issuanceAllowed(report: ConformanceReport): { ok: true } | { ok: false; reason: string } {
  const r = report.results;
  const phases = [r.schemaValidation, r.semanticValidation, r.goldenTests, r.replayParity];
  if (phases.some((p) => p === "fail")) {
    return { ok: false, reason: "conformance-certificate: report has failing phases" };
  }
  if (r.replayParity === "skip" && process.env.INTENTPROOF_CERTIFICATE_ALLOW_REPLAY_SKIP !== "1") {
    return {
      ok: false,
      reason:
        "conformance-certificate: replayParity is skip; set INTENTPROOF_REPLAY_VERIFY=1 or INTENTPROOF_CERTIFICATE_ALLOW_REPLAY_SKIP=1",
    };
  }
  if (phases.some((p) => p !== "pass")) {
    return { ok: false, reason: "conformance-certificate: all phases must be pass for certificate issuance" };
  }
  return { ok: true };
}

async function main(): Promise<number> {
  const reportPath = path.join(repoRoot, "conformance-report.json");
  if (!fs.existsSync(reportPath)) {
    console.error("conformance-certificate: missing conformance-report.json (emit report first)");
    return 1;
  }
  const reportBytes = fs.readFileSync(reportPath, "utf8");
  let report: ConformanceReport;
  try {
    report = JSON.parse(reportBytes) as ConformanceReport;
  } catch (e) {
    console.error("conformance-certificate: conformance-report.json is not valid JSON", e);
    return 1;
  }

  const reportSchema = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "schema/conformance_report.v1.schema.json"), "utf8"),
  ) as object;
  const certSchema = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "schema/conformance_certificate.v1.schema.json"), "utf8"),
  ) as object;

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  (addFormatsPlugin as unknown as (a: Ajv2020) => void)(ajv);
  const validateReport = ajv.compile(reportSchema);
  if (!validateReport(report)) {
    console.error(`conformance-certificate: invalid source report ${JSON.stringify(validateReport.errors, null, 2)}`);
    return 1;
  }

  const gate = issuanceAllowed(report);
  if (!gate.ok) {
    console.error(gate.reason);
    return 1;
  }

  const specCommit = gitHead();
  const spec: { specVersion: string; specFingerprint: string; specCommit?: string } = {
    specVersion: report.specVersion,
    specFingerprint: report.specFingerprint,
  };
  if (specCommit) spec.specCommit = specCommit;

  const certificate = {
    certificateVersion: process.env.INTENTPROOF_CERTIFICATE_VERSION ?? "cert-v0.1.0",
    issuer: process.env.INTENTPROOF_CERT_ISSUER ?? "intentproof-ci",
    issuedAt: new Date().toISOString(),
    subject: { ...report.sdk },
    spec,
    conformanceReportDigest: sha256Utf8(reportBytes),
    claims: {
      oracle: "intentproof-spec/run-conformance",
      allPhasesPass: true,
    },
  };

  const validateCert = ajv.compile(certSchema);
  if (!validateCert(certificate)) {
    console.error(`conformance-certificate: invalid certificate ${JSON.stringify(validateCert.errors, null, 2)}`);
    return 1;
  }

  const out = path.join(repoRoot, "conformance-certificate.json");
  fs.writeFileSync(out, `${JSON.stringify(certificate, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(certificate));
  return 0;
}

void main().then((code) => process.exit(code));
