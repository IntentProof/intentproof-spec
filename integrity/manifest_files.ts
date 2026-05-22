import * as fs from 'fs';
import * as path from 'path';

const MANIFEST_SUBDIRS = ['schema', 'golden', 'compatibility'] as const;

const MANIFEST_EXTENSIONS = ['.json', '.jsonl', '.yaml', '.yml', '.bin'] as const;

function isManifestFile(name: string): boolean {
  return MANIFEST_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * Lists inventoried golden, schema, and compatibility files for integrity
 * manifest hashing (.json, .jsonl, .yaml, .yml, .bin).
 */
export function listManifestFiles(projectRoot: string): string[] {
  const files: string[] = [];

  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (isManifestFile(entry.name)) {
        files.push(full);
      }
    }
  }

  for (const sub of MANIFEST_SUBDIRS) {
    walk(path.join(projectRoot, sub));
  }

  return files.sort((a, b) => a.localeCompare(b));
}
