import * as fs from 'fs';
import * as path from 'path';

const MANIFEST_SUBDIRS = ['schema', 'golden', 'compatibility'] as const;

/**
 * Lists all .json / .jsonl files under schema/, golden/ (recursive), and
 * compatibility/ for integrity manifest hashing.
 */
export function listManifestFiles(projectRoot: string): string[] {
  const files: string[] = [];

  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.json') || entry.name.endsWith('.jsonl')) {
        files.push(full);
      }
    }
  }

  for (const sub of MANIFEST_SUBDIRS) {
    walk(path.join(projectRoot, sub));
  }

  return files.sort((a, b) => a.localeCompare(b));
}
