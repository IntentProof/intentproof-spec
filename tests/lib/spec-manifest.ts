import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./paths.js";

export type SpecManifest = {
  version: string;
  schemas: Record<string, string>;
  goldens: Record<string, string>;
  semantics: Record<string, string>;
  tools?: Record<string, string>;
};

let cached: SpecManifest | null = null;

export function loadSpecManifest(): SpecManifest {
  if (cached) return cached;
  const raw = fs.readFileSync(path.join(REPO_ROOT, "spec.json"), "utf8");
  cached = JSON.parse(raw) as SpecManifest;
  return cached;
}

export function resolveSpecPath(relativePath: string): string {
  return path.join(REPO_ROOT, relativePath);
}

export function assertManifestPathsExist(): void {
  const m = loadSpecManifest();
  const all = [
    ...Object.values(m.schemas),
    ...Object.values(m.goldens),
    ...Object.values(m.semantics),
    ...(m.tools ? Object.values(m.tools) : []),
    "spec.json",
  ];
  for (const rel of all) {
    const p = resolveSpecPath(rel);
    if (!fs.existsSync(p)) {
      throw new Error(`spec manifest references missing path: ${rel}`);
    }
  }
}
