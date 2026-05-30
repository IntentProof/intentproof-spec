import * as fs from 'fs';
import * as path from 'path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

export type PinEntry = {
  repo: string;
  ref_kind: string;
  sha: string;
};

export type PinsDocument = {
  schema: string;
  generated_at: string;
  spec_ref: string;
  entries: PinEntry[];
};

export type VerifyPinsOptions = {
  root?: string;
  toolsDir?: string;
};

const SPEC_REF_FILE = 'SPEC_REF';

function readJSON(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function normalizeSha(value: string): string {
  return value.trim().toLowerCase();
}

export function readSpecRefFile(repoDir: string): string {
  const filePath = path.join(repoDir, SPEC_REF_FILE);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${SPEC_REF_FILE} in ${repoDir}`);
  }
  const sha = normalizeSha(fs.readFileSync(filePath, 'utf-8'));
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error(`Invalid ${SPEC_REF_FILE} in ${repoDir}: ${sha}`);
  }
  return sha;
}

type MatrixComponent = {
  repo: string;
  version: string;
  source_ref: string;
};

type CurrentMatrixEntry = {
  current?: boolean;
  spec_version: MatrixComponent;
  tools_version: MatrixComponent;
};

export function verifyCurrentMatrixPinAlignment(
  root: string,
  pins: PinsDocument,
  fail: (msg: string) => void,
  messages: string[],
): void {
  const matrixPath = path.join(root, 'compatibility', 'matrix.v1.json');
  if (!fs.existsSync(matrixPath)) {
    fail('Missing compatibility/matrix.v1.json for matrix pin alignment');
    return;
  }
  const matrix = readJSON(matrixPath) as { entries: CurrentMatrixEntry[] };
  const current = matrix.entries.find((entry) => entry.current === true);
  if (!current) {
    fail('No current matrix entry to check against pins manifest');
    return;
  }
  messages.push('[PASS] Found current matrix entry');

  const toolsPin = pins.entries.find(
    (entry) => entry.repo === 'intentproof-tools' && entry.ref_kind === 'spec_ref',
  );

  const checks: Array<{ key: keyof CurrentMatrixEntry; label: string; expected?: string }> = [
    { key: 'spec_version', label: 'spec_version', expected: pins.spec_ref },
    {
      key: 'tools_version',
      label: 'tools_version',
      expected: toolsPin?.sha,
    },
  ];

  for (const check of checks) {
    const component = current[check.key];
    if (!component || typeof component !== 'object' || !('source_ref' in component)) {
      fail(`Matrix entry missing ${check.label}`);
      continue;
    }
    if (!check.expected) {
      fail(`Missing pins manifest entry for ${check.label}`);
      continue;
    }
    if (component.source_ref !== check.expected) {
      fail(
        `Matrix ${check.label} source_ref ${component.source_ref} does not match pins manifest ${check.expected}`,
      );
    } else {
      messages.push(`[PASS] Matrix ${check.label} matches pins manifest`);
    }
  }
}

export function verifyCompatibilityPins(options: VerifyPinsOptions = {}): {
  ok: boolean;
  messages: string[];
} {
  const messages: string[] = [];
  let hasError = false;
  const fail = (msg: string): void => {
    messages.push(`[FAIL] ${msg}`);
    hasError = true;
  };

  const root = options.root ?? path.join(__dirname, '..');
  const schemaPath = path.join(root, 'compatibility', 'pins.v1.schema.json');
  const pinsPath = path.join(root, 'compatibility', 'pins.v1.json');
  const schema = readJSON(schemaPath);
  const pins = readJSON(pinsPath) as PinsDocument;

  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema as object);
  if (!validate(pins)) {
    fail('Pins document schema validation failed');
    for (const err of validate.errors ?? []) {
      messages.push(`  ${err.instancePath || '/'} ${err.message}`);
    }
    return { ok: false, messages };
  }
  messages.push('[PASS] Pins document schema validated');

  const manifestPath = path.join(root, 'integrity', 'manifest.v1.json');
  const manifest = readJSON(manifestPath) as { files?: Record<string, string> };
  for (const rel of ['compatibility/pins.v1.json', 'compatibility/pins.v1.schema.json']) {
    if (!manifest.files?.[rel]) {
      fail(`Integrity manifest does not cover ${rel}`);
    }
  }
  if (!hasError) {
    messages.push('[PASS] Integrity manifest covers pins files');
  }

  for (const entry of pins.entries) {
    if (entry.ref_kind === 'spec_ref' && entry.sha !== pins.spec_ref) {
      fail(`${entry.repo} spec_ref ${entry.sha} does not match manifest spec_ref ${pins.spec_ref}`);
    }
  }

  if (options.toolsDir) {
    const toolsSpec = readSpecRefFile(options.toolsDir);
    const expected = pins.entries.find(
      (entry) => entry.repo === 'intentproof-tools' && entry.ref_kind === 'spec_ref',
    );
    if (!expected) {
      fail('Missing intentproof-tools spec_ref entry');
    } else if (toolsSpec !== expected.sha) {
      fail(
        `intentproof-tools SPEC_REF ${toolsSpec} does not match pins manifest ${expected.sha}`,
      );
    } else {
      messages.push('[PASS] intentproof-tools SPEC_REF matches pins manifest');
    }
  }

  verifyCurrentMatrixPinAlignment(root, pins, fail, messages);

  return { ok: !hasError, messages };
}

export async function runVerifyCompatibilityPinsCli(
  options?: VerifyPinsOptions,
): Promise<number> {
  try {
    const result = verifyCompatibilityPins(options);
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
  const toolsDir = process.env.INTENTPROOF_TOOLS_DIR?.trim();
  runVerifyCompatibilityPinsCli({
    toolsDir: toolsDir || undefined,
  }).then((code) => process.exit(code));
}
/* v8 ignore stop */
