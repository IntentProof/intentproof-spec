#!/usr/bin/env node
/**
 * Fail-closed checks for conformance-certificate.json after a conformance run:
 * JSON Schema (conformance_certificate.<v1|v2>), digest and binding vs conformance-report.json,
 * all report phases pass.
 */
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsPlugin from "ajv-formats";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { canonicalJsonStringify } from "./canonical/canonical-json.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

function certificateSchemaVersion(): "v1" | "v2" {
  const raw = (process.env.INTENTPROOF_CERTIFICATE_SCHEMA_VERSION ?? "v2").toLowerCase();
  if (raw === "v1" || raw === "v2") return raw;
  console.error(
    `validate-conformance-certificate: unsupported INTENTPROOF_CERTIFICATE_SCHEMA_VERSION=${raw} (expected v1 or v2)`,
  );
  process.exit(2);
}

function sha256Utf8(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

type Report = {
  specVersion: string;
  specFingerprint: string;
  sdk: { name: string; language: string; version: string };
  results: Record<string, string>;
};

function readPublicKey(): crypto.KeyObject | undefined {
  const publicKeyPem = process.env.INTENTPROOF_CERTIFICATE_PUBLIC_KEY_PEM;
  if (publicKeyPem) {
    return crypto.createPublicKey(publicKeyPem);
  }
  return undefined;
}

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

  const certSchemaVersion = certificateSchemaVersion();
  const certSchema = JSON.parse(
    fs.readFileSync(path.join(repoRoot, `schema/conformance_certificate.${certSchemaVersion}.schema.json`), "utf8"),
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
    signature?: { alg: string; keyId: string; value: string };
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

  const requireSignature = process.env.INTENTPROOF_CERTIFICATE_REQUIRE_SIGNATURE === "1";
  if (!cert.signature) {
    if (requireSignature) {
      console.error("validate-conformance-certificate: signature is required but missing");
      return 1;
    }
    console.log("OK");
    return 0;
  }

  if (cert.signature.alg !== "ed25519") {
    console.error(`validate-conformance-certificate: unsupported signature algorithm ${cert.signature.alg}`);
    return 1;
  }

  const publicKey = readPublicKey();
  if (!publicKey) {
    console.error(
      "validate-conformance-certificate: certificate contains signature but INTENTPROOF_CERTIFICATE_PUBLIC_KEY_PEM is unset",
    );
    return 1;
  }

  const unsigned = { ...certData };
  delete (unsigned as { signature?: unknown }).signature;
  const payload = canonicalJsonStringify(unsigned);
  const sig = Buffer.from(cert.signature.value, "base64");
  const ok = crypto.verify(null, Buffer.from(payload, "utf8"), publicKey, sig);
  if (!ok) {
    console.error("validate-conformance-certificate: signature verification failed");
    return 1;
  }

  console.log("OK");
  return 0;
}

process.exit(main());
