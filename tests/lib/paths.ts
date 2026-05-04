import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Repository root (parent of `tests/`). */
export const REPO_ROOT = path.resolve(here, "../..");

export function readUtf8(...segments: string[]): string {
  return fs.readFileSync(path.join(REPO_ROOT, ...segments), "utf8");
}
