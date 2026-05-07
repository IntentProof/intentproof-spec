/**
 * Classify JSON Schema changes (spec.json schemas.* only) vs merge-base.
 * Conservative: unknown tightening or removals default to BREAKING.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

export type SchemaClassification = "ADDITIVE" | "NON_BREAKING" | "BREAKING";

export type SchemaChangeReport = {
  path: string;
  classification: SchemaClassification;
  detail?: string;
};

export type CompatibilityReport = {
  manifestVersion: "1";
  baseRef: string;
  mergeBase: string;
  overall: SchemaClassification;
  schemas: SchemaChangeReport[];
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

function deepEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

function mergeRank(c: SchemaClassification): number {
  return c === "BREAKING" ? 2 : c === "ADDITIVE" ? 1 : 0;
}

function mergeClass(a: SchemaClassification, b: SchemaClassification): SchemaClassification {
  return mergeRank(a) >= mergeRank(b) ? a : b;
}

/** Compare JSON Schema subset used in this repo (objects, properties, required, type, enum, additionalProperties). */
export function classifySchemaChange(oldS: unknown, newS: unknown): SchemaClassification {
  if (deepEqual(oldS, newS)) {
    return "NON_BREAKING";
  }
  if (oldS === undefined || oldS === null) {
    return "ADDITIVE";
  }
  if (newS === undefined || newS === null) {
    return "BREAKING";
  }
  if (typeof oldS !== "object" || typeof newS !== "object") {
    return "BREAKING";
  }
  if (Array.isArray(oldS) || Array.isArray(newS)) {
    return deepEqual(oldS, newS) ? "NON_BREAKING" : "BREAKING";
  }

  const o = oldS as Record<string, unknown>;
  const n = newS as Record<string, unknown>;

  const metaOnly = (k: string) => k === "title" || k === "description" || k === "$comment" || k === "default";
  const oldKeys = new Set(Object.keys(o));
  const newKeys = new Set(Object.keys(n));
  for (const k of oldKeys) {
    if (!newKeys.has(k) && !metaOnly(k)) {
      return "BREAKING";
    }
  }

  let acc: SchemaClassification = "NON_BREAKING";

  if (o.type !== n.type && o.type !== undefined && n.type !== undefined) {
    return "BREAKING";
  }

  const oldReq = Array.isArray(o.required) ? (o.required as string[]) : [];
  const newReq = Array.isArray(n.required) ? (n.required as string[]) : [];
  for (const r of newReq) {
    if (!oldReq.includes(r)) {
      acc = mergeClass(acc, "BREAKING");
    }
  }

  const oldProps = (o.properties as Record<string, unknown> | undefined) ?? {};
  const newProps = (n.properties as Record<string, unknown> | undefined) ?? {};
  for (const pk of Object.keys(oldProps)) {
    if (!Object.prototype.hasOwnProperty.call(newProps, pk)) {
      return "BREAKING";
    }
  }
  for (const pk of Object.keys(newProps)) {
    if (!Object.prototype.hasOwnProperty.call(oldProps, pk)) {
      acc = mergeClass(acc, "ADDITIVE");
      continue;
    }
    acc = mergeClass(acc, classifySchemaChange(oldProps[pk], newProps[pk]));
  }

  if (o.enum !== undefined || n.enum !== undefined) {
    const oe = Array.isArray(o.enum) ? (o.enum as unknown[]) : null;
    const ne = Array.isArray(n.enum) ? (n.enum as unknown[]) : null;
    if (oe && ne) {
      const ns = new Set(ne.map((x) => stableStringify(x)));
      for (const x of oe) {
        if (!ns.has(stableStringify(x))) {
          return "BREAKING";
        }
      }
      if (ne.length > oe.length) {
        acc = mergeClass(acc, "ADDITIVE");
      }
    } else if (!deepEqual(o.enum, n.enum)) {
      return "BREAKING";
    }
  }

  if (o.additionalProperties !== n.additionalProperties) {
    if (n.additionalProperties === false && o.additionalProperties !== false) {
      acc = mergeClass(acc, "BREAKING");
    } else if (typeof o.additionalProperties === "object" && typeof n.additionalProperties === "object") {
      acc = mergeClass(acc, classifySchemaChange(o.additionalProperties, n.additionalProperties));
    } else if (n.additionalProperties !== o.additionalProperties) {
      acc = mergeClass(acc, "BREAKING");
    }
  }

  for (const k of newKeys) {
    if (oldKeys.has(k)) {
      continue;
    }
    if (metaOnly(k)) {
      continue;
    }
    if (k === "properties" || k === "required" || k === "type" || k === "enum" || k === "additionalProperties") {
      continue;
    }
    acc = mergeClass(acc, "ADDITIVE");
  }

  for (const k of oldKeys) {
    if (!newKeys.has(k) || metaOnly(k)) {
      continue;
    }
    if (["properties", "required", "type", "enum", "additionalProperties"].includes(k)) {
      continue;
    }
    if (!deepEqual(o[k], n[k])) {
      acc = mergeClass(acc, "BREAKING");
    }
  }

  return acc;
}

function gitShow(specRoot: string, rev: string, file: string): string | null {
  try {
    return execFileSync("git", ["show", `${rev}:${file}`], {
      cwd: specRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

function loadSpecSchemas(specRoot: string, rev: "HEAD" | string): Record<string, string> {
  if (rev === "HEAD") {
    const spec = JSON.parse(fs.readFileSync(path.join(specRoot, "spec.json"), "utf8")) as {
      schemas: Record<string, string>;
    };
    return spec.schemas;
  }
  const raw = gitShow(specRoot, rev, "spec.json");
  if (!raw) {
    throw new Error(`schema-compatibility: could not read spec.json at ${rev}`);
  }
  return (JSON.parse(raw) as { schemas: Record<string, string> }).schemas;
}

export function classifyAgainstBase(specRoot: string, baseRef: string): CompatibilityReport {
  const mb = execFileSync("git", ["merge-base", "HEAD", baseRef], {
    cwd: specRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const headSchemas = loadSpecSchemas(specRoot, "HEAD");
  let baseSchemas: Record<string, string>;
  try {
    baseSchemas = loadSpecSchemas(specRoot, mb);
  } catch {
    baseSchemas = {};
  }

  const paths = new Set<string>([...Object.values(headSchemas), ...Object.values(baseSchemas)]);
  const sorted = [...paths].sort((a, b) => a.localeCompare(b));
  const schemas: SchemaChangeReport[] = [];
  let overall: SchemaClassification = "NON_BREAKING";

  for (const rel of sorted) {
    const headPath = path.join(specRoot, rel);
    const headRaw = fs.existsSync(headPath) ? fs.readFileSync(headPath, "utf8") : null;
    const baseRaw = gitShow(specRoot, mb, rel);
    if (!headRaw && !baseRaw) {
      continue;
    }
    if (!headRaw && baseRaw) {
      schemas.push({ path: rel, classification: "BREAKING", detail: "schema file removed" });
      overall = mergeClass(overall, "BREAKING");
      continue;
    }
    if (headRaw && !baseRaw) {
      schemas.push({ path: rel, classification: "ADDITIVE", detail: "new schema file" });
      overall = mergeClass(overall, "ADDITIVE");
      continue;
    }
    let headJson: unknown;
    let baseJson: unknown;
    try {
      headJson = JSON.parse(headRaw!);
      baseJson = JSON.parse(baseRaw!);
    } catch {
      schemas.push({ path: rel, classification: "BREAKING", detail: "invalid JSON in base or head" });
      overall = mergeClass(overall, "BREAKING");
      continue;
    }
    const c = classifySchemaChange(baseJson, headJson);
    schemas.push({ path: rel, classification: c });
    overall = mergeClass(overall, c);
  }

  return {
    manifestVersion: "1",
    baseRef,
    mergeBase: mb,
    overall,
    schemas,
  };
}

async function main(): Promise<void> {
  const specRoot = process.env.INTENTPROOF_SPEC_ROOT ? path.resolve(process.env.INTENTPROOF_SPEC_ROOT) : root;
  const argv = process.argv.slice(2);
  let baseRef = "origin/main";
  let jsonOut: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base" && argv[i + 1]) {
      baseRef = argv[i + 1]!;
      i++;
    }
    if (argv[i] === "--json-out" && argv[i + 1]) {
      jsonOut = argv[i + 1]!;
      i++;
    }
  }
  let report: CompatibilityReport;
  try {
    report = classifyAgainstBase(specRoot, baseRef);
  } catch (error) {
    console.error(`schema-compatibility: invalid --base ref '${baseRef}'`);
    process.exit(2);
  }
  const line = `schema-compatibility: merge-base=${report.mergeBase} overall=${report.overall}`;
  console.error(line);
  for (const s of report.schemas) {
    if (s.classification !== "NON_BREAKING") {
      console.error(`  ${s.classification}\t${s.path}${s.detail ? `\t(${s.detail})` : ""}`);
    }
  }
  const j = `${stableStringify(report)}\n`;
  if (jsonOut) {
    fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true });
    fs.writeFileSync(jsonOut, j, "utf8");
    console.error(`schema-compatibility: wrote ${jsonOut}`);
  }
  console.log(j.trimEnd());
}

void main();
