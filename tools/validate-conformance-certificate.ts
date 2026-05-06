#!/usr/bin/env node
/**
 * Fail-closed checks for conformance-certificate.json after a conformance run:
 * JSON Schema (conformance_certificate.v1), digest and binding vs conformance-report.json,
 * all report phases pass.
 */
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsPlugin from "ajv-formats";
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

type Report = {
  specVersion: string;
  specFingerprint: string;
  sdk: { name: string; language: string; version: string };
  results: Record<string, string>;
};

function main(): number {
  const certPath = path.join(repoRoot, "conformance-certificate.json");
  const reportPath = path.join(repoRoot, "conformance-report.json");
  for (const p of [certPath, reportPath]) {
    if (!fs.existsSync(p)) {
      console.error(`validate-conformance-certificate: missing ${path.basename(p)}`);
      return 1;
    }
  }

  const certRaw = fs.readFileSync(certPath, "utf8");
  const reportRaw = fs.readFileSync(reportPath, "utf8");
  let certData: Record<string, unknown>;
  let report: Report;
  try {
    certData = JSON.parse(certRaw) as Record<string, unknown>;
    report = JSON.parse(reportRaw) as Report;
  } catch (e) {
    console.error("validate-conformance-certificate: invalid JSON", e);
    return 1;
  }

  const certSchema = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "schema/conformance_certificate.v1.schema.json"), "utf8"),
  ) as object;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  (addFormatsPlugin as unknown as (a: Ajv2020) => void)(ajv);
  const validate = ajv.compile(certSchema);
  if (!validate(certData)) {
    console.error(`validate-conformance-certificate: schema errors ${JSON.stringify(validate.errors, null, 2)}`);
    return 1;
  }

  const cert = certData as unknown as {
    subject: { name: string; language: string; version: string };
    spec: { specVersion: string; specFingerprint: string };
    conformanceReportDigest: string;
    claims: { allPhasesPass: boolean };
  };

  const expectedDigest = sha256Utf8(reportRaw);
  if (cert.conformanceReportDigest !== expectedDigest) {
    console.error(
      `validate-conformance-certificate: digest mismatch (expected ${expectedDigest}, got ${cert.conformanceReportDigest})`,
    );
    return 1;
  }

  if (cert.spec.specVersion !== report.specVersion || cert.spec.specFingerprint !== report.specFingerprint) {
    console.error("validate-conformance-certificate: certificate spec fields do not match report");
    return 1;
  }

  const sdk = report.sdk;
  const sub = cert.subject;
  if (sub.name !== sdk.name || sub.language !== sdk.language || sub.version !== sdk.version) {
    console.error("validate-conformance-certificate: certificate subject does not match report sdk");
    return 1;
  }

  if (!cert.claims.allPhasesPass) {
    console.error("validate-conformance-certificate: claims.allPhasesPass must be true");
    return 1;
  }

  for (const [k, v] of Object.entries(report.results)) {
    if (v !== "pass") {
      console.error(`validate-conformance-certificate: report.results.${k} must be pass (got ${v})`);
      return 1;
    }
  }

  console.log("OK");
  return 0;
}

process.exit(main());
