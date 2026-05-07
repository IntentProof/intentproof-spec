/**
 * Deterministic schema integrity manifest (spec.json schemas.* only), Ed25519 sign/verify.
 *
 * Usage:
 *   tsx tools/spec-integrity.ts generate   # write artifacts/spec-integrity.v1.json
 *   tsx tools/spec-integrity.ts sign --private-key /secure/path/spec-integrity.key.pem
 *   tsx tools/spec-integrity.ts verify
 */
import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MANIFEST_VERSION = "1";
const MANIFEST_BASENAME = "spec-integrity.v1.json";
const SIG_BASENAME = "spec-integrity.v1.json.sig";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

export type IntegrityManifestV1 = {
  manifestVersion: typeof MANIFEST_VERSION;
  specVersion: string;
  specCommit: string;
  files: { path: string; sha256: string }[];
  aggregateSha256: string;
};

function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((x) => stableStringify(x)).join(",")}]`;
  }
  const o = obj as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(",")}}`;
}

function sha256File(abs: string): string {
  const h = createHash("sha256");
  h.update(fs.readFileSync(abs));
  return h.digest("hex");
}

export function gitHead(specRoot: string): string {
  return execSync("git rev-parse HEAD", { cwd: specRoot, encoding: "utf8" }).trim();
}

export function buildManifest(specRoot: string): IntegrityManifestV1 {
  const specPath = path.join(specRoot, "spec.json");
  const spec = JSON.parse(fs.readFileSync(specPath, "utf8")) as { version: string; schemas: Record<string, string> };
  const rels = Object.values(spec.schemas).sort((a, b) => a.localeCompare(b));
  const files: { path: string; sha256: string }[] = [];
  for (const rel of rels) {
    const abs = path.join(specRoot, rel);
    if (!fs.existsSync(abs)) {
      throw new Error(`spec-integrity: missing schema file: ${rel}`);
    }
    files.push({ path: rel.replace(/\\/g, "/"), sha256: sha256File(abs) });
  }
  const aggLines = files.map((f) => `${f.sha256}\t${f.path}\n`).join("");
  const aggregateSha256 = createHash("sha256").update(aggLines, "utf8").digest("hex");
  return {
    manifestVersion: MANIFEST_VERSION,
    specVersion: spec.version,
    specCommit: gitHead(specRoot),
    files,
    aggregateSha256,
  };
}

function manifestPath(specRoot: string): string {
  return path.join(specRoot, "artifacts", MANIFEST_BASENAME);
}

function sigPath(specRoot: string): string {
  return path.join(specRoot, "artifacts", SIG_BASENAME);
}

function publicKeyPath(specRoot: string): string {
  return path.join(specRoot, "signing", "spec-integrity.public.pem");
}

function readVerifyPublicKey(specRoot: string): Buffer | undefined {
  const pem = process.env.INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PEM;
  if (pem && pem.trim().length > 0) {
    return Buffer.from(pem, "utf8");
  }
  const keyPathEnv = process.env.INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PATH;
  if (keyPathEnv && keyPathEnv.trim().length > 0) {
    const abs = path.resolve(keyPathEnv);
    if (!fs.existsSync(abs)) {
      console.error(`spec-integrity verify: missing public key path from INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PATH: ${abs}`);
      process.exit(1);
    }
    return fs.readFileSync(abs);
  }
  const legacyPath = publicKeyPath(specRoot);
  if (fs.existsSync(legacyPath)) {
    console.error(
      "spec-integrity verify: signing/spec-integrity.public.pem is deprecated; set INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PEM or INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PATH",
    );
    process.exit(1);
  }
  return undefined;
}

function cmdGenerate(specRoot: string): void {
  const m = buildManifest(specRoot);
  const outDir = path.join(specRoot, "artifacts");
  fs.mkdirSync(outDir, { recursive: true });
  const json = `${stableStringify(m)}\n`;
  fs.writeFileSync(manifestPath(specRoot), json, "utf8");
  console.error(`spec-integrity: wrote ${path.relative(specRoot, manifestPath(specRoot))}`);
}

function cmdSign(specRoot: string, keyPath: string): void {
  const manifestFile = manifestPath(specRoot);
  if (!fs.existsSync(manifestFile)) {
    console.error("spec-integrity: run generate first");
    process.exit(1);
  }
  const resolvedKeyPath = path.resolve(keyPath);
  const relFromRoot = path.relative(specRoot, resolvedKeyPath);
  const keyUnderRepo =
    relFromRoot !== "" &&
    !relFromRoot.startsWith("..") &&
    !path.isAbsolute(relFromRoot);
  if (keyUnderRepo && process.env.INTENTPROOF_ALLOW_INSECURE_LOCAL_SIGNING_KEY !== "1") {
    console.error(
      "spec-integrity: refusing private key inside repository checkout; use an external secure path or set INTENTPROOF_ALLOW_INSECURE_LOCAL_SIGNING_KEY=1 explicitly",
    );
    process.exit(2);
  }
  const payload = fs.readFileSync(manifestFile);
  const key = createPrivateKey(fs.readFileSync(resolvedKeyPath));
  const sig = sign(null, payload, key);
  fs.writeFileSync(sigPath(specRoot), sig.toString("base64") + "\n", "utf8");
  console.error(`spec-integrity: wrote ${path.relative(specRoot, sigPath(specRoot))}`);
}

export function verifyManifest(specRoot: string): void {
  const manifestFile = manifestPath(specRoot);
  const sigFile = sigPath(specRoot);
  for (const [label, p] of [
    ["manifest", manifestFile],
    ["signature", sigFile],
  ]) {
    if (!fs.existsSync(p)) {
      console.error(`spec-integrity verify: missing ${label}: ${p}`);
      process.exit(1);
    }
  }
  const diskManifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")) as IntegrityManifestV1;
  if (diskManifest.manifestVersion !== MANIFEST_VERSION) {
    console.error(`spec-integrity verify: unsupported manifestVersion`);
    process.exit(1);
  }
  const liveSpec = JSON.parse(fs.readFileSync(path.join(specRoot, "spec.json"), "utf8")) as {
    version: string;
    schemas: Record<string, string>;
  };
  if (diskManifest.specVersion !== liveSpec.version) {
    console.error(
      `spec-integrity verify: manifest specVersion ${diskManifest.specVersion} !== spec.json ${liveSpec.version}`,
    );
    process.exit(1);
  }
  const expectedPaths = Object.values(liveSpec.schemas).sort((a, b) => a.localeCompare(b));
  const gotPaths = diskManifest.files.map((f) => f.path).sort((a, b) => a.localeCompare(b));
  if (expectedPaths.length !== gotPaths.length || expectedPaths.some((p, i) => p !== gotPaths[i])) {
    console.error("spec-integrity verify: manifest file list does not match spec.json schemas.*");
    process.exit(1);
  }
  for (const f of diskManifest.files) {
    const abs = path.join(specRoot, f.path);
    const h = sha256File(abs);
    if (h !== f.sha256) {
      console.error(`spec-integrity verify: hash mismatch for ${f.path}`);
      process.exit(1);
    }
  }
  const aggLines = diskManifest.files.map((x) => `${x.sha256}\t${x.path}\n`).join("");
  const agg = createHash("sha256").update(aggLines, "utf8").digest("hex");
  if (agg !== diskManifest.aggregateSha256) {
    console.error("spec-integrity verify: aggregateSha256 mismatch");
    process.exit(1);
  }
  const canonical = `${stableStringify(diskManifest)}\n`;
  const onDisk = fs.readFileSync(manifestFile, "utf8");
  if (canonical !== onDisk) {
    console.error("spec-integrity verify: manifest JSON is not canonical (regenerate with generate)");
    process.exit(1);
  }
  const payload = fs.readFileSync(manifestFile);
  const pubPem = readVerifyPublicKey(specRoot);
  if (!pubPem) {
    console.error(
      "spec-integrity verify: missing public key; set INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PEM or INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PATH",
    );
    process.exit(1);
  }
  const pub = createPublicKey(pubPem);
  const sig = Buffer.from(fs.readFileSync(sigFile, "utf8").trim(), "base64");
  const ok = verify(null, payload, pub, sig);
  if (!ok) {
    console.error("spec-integrity verify: Ed25519 signature invalid");
    process.exit(1);
  }
  console.error("spec-integrity: verify OK");
}

function main(): void {
  const specRoot = process.env.INTENTPROOF_SPEC_ROOT ? path.resolve(process.env.INTENTPROOF_SPEC_ROOT) : root;
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  if (cmd === "generate") {
    cmdGenerate(specRoot);
    return;
  }
  if (cmd === "sign") {
    const idx = argv.indexOf("--private-key");
    if (idx === -1 || !argv[idx + 1]) {
      console.error("usage: tsx tools/spec-integrity.ts sign --private-key /path/to.pem");
      process.exit(2);
    }
    cmdSign(specRoot, path.resolve(argv[idx + 1]!));
    return;
  }
  if (cmd === "verify") {
    verifyManifest(specRoot);
    return;
  }
  console.error("usage: tsx tools/spec-integrity.ts <generate|sign|verify>");
  process.exit(2);
}

main();
