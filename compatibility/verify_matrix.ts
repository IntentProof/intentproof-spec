import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

type HttpsGet = typeof https.get;

let httpsGetImpl: HttpsGet = https.get;

/** Test hook for mocking GitHub release lookups without stubbing https.get. */
export function setHttpsGetForTests(getImpl: HttpsGet | null): void {
  httpsGetImpl = getImpl ?? https.get;
}

type Component = {
  repo: string;
  version: string;
  source_ref: string;
  release_url?: string;
};

type MatrixEntry = {
  release_status: 'source-verified' | 'released';
  current?: boolean;
  tuple_id?: string;
  spec_version: Component;
  tools_version: Component;
  core_version: Component;
  sdk_node_version: Component;
  sdk_python_version: Component;
  sdk_go_version: Component;
  dashboard_version: Component;
};

type Matrix = {
  schema: string;
  entries: MatrixEntry[];
};

export const MATRIX_COMPONENT_KEYS = [
  'spec_version',
  'tools_version',
  'core_version',
  'sdk_node_version',
  'sdk_python_version',
  'sdk_go_version',
  'dashboard_version',
] as const;

function readJSON(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function githubReleaseExistsViaHttps(repo: string, tag: string): Promise<boolean> {
  const url = `https://api.github.com/repos/IntentProof/${repo}/releases/tags/${encodeURIComponent(tag)}`;
  return new Promise((resolve, reject) => {
    const req = httpsGetImpl(
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

export type VerifyMatrixOptions = {
  root?: string;
  releaseExists?: (repo: string, tag: string) => Promise<boolean>;
};

export async function verifyCompatibilityMatrix(
  options: VerifyMatrixOptions = {},
): Promise<{ ok: boolean; messages: string[] }> {
  const messages: string[] = [];
  const root = options.root ?? path.join(__dirname, '..');
  const releaseExists = options.releaseExists ?? githubReleaseExistsViaHttps;
  const schemaPath = path.join(root, 'compatibility', 'matrix.v1.schema.json');
  const matrixPath = path.join(root, 'compatibility', 'matrix.v1.json');
  const schema = readJSON(schemaPath);
  const matrix = readJSON(matrixPath) as Matrix;

  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema as object);
  if (!validate(matrix)) {
    messages.push('[FAIL] Compatibility matrix schema validation failed');
    for (const err of validate.errors ?? []) {
      messages.push(`  ${err.instancePath || '/'} ${err.message}`);
    }
    return { ok: false, messages };
  }
  messages.push('[PASS] Compatibility matrix schema validated');

  const manifestPath = path.join(root, 'integrity', 'manifest.v1.json');
  const manifest = readJSON(manifestPath) as { files?: Record<string, string> };
  for (const rel of ['compatibility/matrix.v1.json', 'compatibility/matrix.v1.schema.json']) {
    if (!manifest.files?.[rel]) {
      messages.push(`[FAIL] Integrity manifest does not cover ${rel}`);
      return { ok: false, messages };
    }
  }
  messages.push('[PASS] Integrity manifest covers compatibility files');

  const currentEntries = matrix.entries.filter((entry) => entry.current === true);
  if (currentEntries.length > 1) {
    messages.push('[FAIL] More than one matrix entry is marked current');
    return { ok: false, messages };
  }
  if (currentEntries.length === 1) {
    messages.push('[PASS] Exactly one current matrix entry');
  }

  for (const [entryIndex, entry] of matrix.entries.entries()) {
    if (entry.release_status !== 'released') {
      messages.push(`[SKIP] Entry ${entryIndex} is ${entry.release_status}; release existence check deferred`);
      continue;
    }
    for (const key of MATRIX_COMPONENT_KEYS) {
      const component = entry[key];
      const exists = await releaseExists(component.repo, component.version);
      if (!exists) {
        messages.push(`[FAIL] Missing GitHub Release: IntentProof/${component.repo}@${component.version}`);
        return { ok: false, messages };
      }
      messages.push(`[PASS] GitHub Release exists: IntentProof/${component.repo}@${component.version}`);
    }
  }

  return { ok: true, messages };
}

export async function runVerifyCompatibilityMatrixCli(
  options?: VerifyMatrixOptions,
): Promise<number> {
  try {
    const result = await verifyCompatibilityMatrix(options);
    for (const msg of result.messages) {
      console.log(msg);
    }
    return result.ok ? 0 : 1;
  } catch (err) {
    console.error('[FAIL]', err instanceof Error ? err.message : err);
    return 1;
  }
}

/* v8 ignore start */
if (require.main === module) {
  runVerifyCompatibilityMatrixCli().then((code) => process.exit(code));
}
/* v8 ignore stop */
