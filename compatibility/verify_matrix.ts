import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

type Component = {
  repo: string;
  version: string;
  source_ref: string;
  release_url?: string;
};

type MatrixEntry = {
  release_status: 'source-verified' | 'released';
  spec_version: Component;
  tools_version: Component;
  core_version: Component;
  sdk_node_version: Component;
  sdk_python_version: Component;
  dashboard_version: Component;
};

type Matrix = {
  schema: string;
  entries: MatrixEntry[];
};

const componentKeys = [
  'spec_version',
  'tools_version',
  'core_version',
  'sdk_node_version',
  'sdk_python_version',
  'dashboard_version',
] as const;

function readJSON(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function githubReleaseExists(repo: string, tag: string): Promise<boolean> {
  const url = `https://api.github.com/repos/IntentProof/${repo}/releases/tags/${encodeURIComponent(tag)}`;
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'intentproof-compatibility-matrix-verify',
          Accept: 'application/vnd.github+json',
        },
      },
      (res) => {
        res.resume();
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(true);
          } else if (res.statusCode === 404) {
            resolve(false);
          } else {
            reject(new Error(`GitHub release lookup failed for ${repo}@${tag}: HTTP ${res.statusCode}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error(`GitHub release lookup timed out for ${repo}@${tag}`));
    });
  });
}

async function main() {
  const root = path.join(__dirname, '..');
  const schemaPath = path.join(__dirname, 'matrix.v1.schema.json');
  const matrixPath = path.join(__dirname, 'matrix.v1.json');
  const schema = readJSON(schemaPath);
  const matrix = readJSON(matrixPath) as Matrix;

  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema as object);
  if (!validate(matrix)) {
    console.error('[FAIL] Compatibility matrix schema validation failed');
    for (const err of validate.errors ?? []) {
      console.error(`  ${err.instancePath || '/'} ${err.message}`);
    }
    process.exit(1);
  }
  console.log('[PASS] Compatibility matrix schema validated');

  const manifestPath = path.join(root, 'integrity', 'manifest.v1.json');
  const manifest = readJSON(manifestPath) as { files?: Record<string, string> };
  for (const rel of ['compatibility/matrix.v1.json', 'compatibility/matrix.v1.schema.json']) {
    if (!manifest.files?.[rel]) {
      console.error(`[FAIL] Integrity manifest does not cover ${rel}`);
      process.exit(1);
    }
  }
  console.log('[PASS] Integrity manifest covers compatibility files');

  for (const [entryIndex, entry] of matrix.entries.entries()) {
    if (entry.release_status !== 'released') {
      console.log(`[SKIP] Entry ${entryIndex} is ${entry.release_status}; release existence check deferred`);
      continue;
    }
    for (const key of componentKeys) {
      const component = entry[key];
      const exists = await githubReleaseExists(component.repo, component.version);
      if (!exists) {
        console.error(`[FAIL] Missing GitHub Release: IntentProof/${component.repo}@${component.version}`);
        process.exit(1);
      }
      console.log(`[PASS] GitHub Release exists: IntentProof/${component.repo}@${component.version}`);
    }
  }
}

main().catch((err) => {
  console.error('[FAIL]', err instanceof Error ? err.message : err);
  process.exit(1);
});
