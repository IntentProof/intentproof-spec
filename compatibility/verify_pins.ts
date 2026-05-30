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
  coreDir?: string;
};

const SPEC_REF_FILE = 'SPEC_REF';
const OSS_FUZZ_PINS = path.join('contrib', 'oss-fuzz', 'intentproof', 'pins.env');

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

export function readOssFuzzPins(toolsDir: string): Record<string, string> {
  const filePath = path.join(toolsDir, OSS_FUZZ_PINS);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing OSS-Fuzz pins file: ${filePath}`);
  }
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const idx = trimmed.indexOf('=');
    if (idx <= 0) {
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    const value = normalizeSha(trimmed.slice(idx + 1));
    out[key] = value;
  }
  return out;
}

function entriesForKind(entries: PinEntry[], refKind: string): PinEntry[] {
  return entries.filter((entry) => entry.ref_kind === refKind);
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

  for (const entry of entriesForKind(pins.entries, 'spec_ref')) {
    if (entry.sha !== pins.spec_ref) {
      fail(`${entry.repo} spec_ref ${entry.sha} does not match manifest spec_ref ${pins.spec_ref}`);
    }
  }

  const ossSpec = pins.entries.find((entry) => entry.ref_kind === 'oss_fuzz_spec_ref');
  if (!ossSpec) {
    fail('Missing oss_fuzz_spec_ref entry');
  } else if (ossSpec.sha !== pins.spec_ref) {
    fail(`oss_fuzz_spec_ref ${ossSpec.sha} does not match manifest spec_ref ${pins.spec_ref}`);
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

    const oss = readOssFuzzPins(options.toolsDir);
    const expectedOss: Array<[string, string]> = [
      ['TOOLS_REF', 'oss_fuzz_tools_ref'],
      ['SPEC_REF', 'oss_fuzz_spec_ref'],
      ['CORE_REF', 'oss_fuzz_core_ref'],
    ];
    for (const [envKey, refKind] of expectedOss) {
      const manifestEntry = pins.entries.find((entry) => entry.ref_kind === refKind);
      const actual = oss[envKey];
      if (!manifestEntry) {
        fail(`Missing pins manifest entry for ${refKind}`);
        continue;
      }
      if (!actual) {
        fail(`Missing ${envKey} in OSS-Fuzz pins.env`);
        continue;
      }
      if (actual !== manifestEntry.sha) {
        fail(`OSS-Fuzz ${envKey} ${actual} does not match pins manifest ${manifestEntry.sha}`);
      } else {
        messages.push(`[PASS] OSS-Fuzz ${envKey} matches pins manifest`);
      }
    }
  }

  if (options.coreDir) {
    const coreSpec = readSpecRefFile(options.coreDir);
    const expected = pins.entries.find(
      (entry) => entry.repo === 'intentproof-core' && entry.ref_kind === 'spec_ref',
    );
    if (!expected) {
      fail('Missing intentproof-core spec_ref entry');
    } else if (coreSpec !== expected.sha) {
      fail(`intentproof-core SPEC_REF ${coreSpec} does not match pins manifest ${expected.sha}`);
    } else {
      messages.push('[PASS] intentproof-core SPEC_REF matches pins manifest');
    }
  }

  if (options.toolsDir && options.coreDir) {
    const toolsSpec = readSpecRefFile(options.toolsDir);
    const coreSpec = readSpecRefFile(options.coreDir);
    if (toolsSpec !== coreSpec) {
      fail(`SPEC_REF mismatch: tools=${toolsSpec} core=${coreSpec}`);
    } else {
      messages.push('[PASS] tools and core SPEC_REF values match');
    }
  }

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
  const coreDir = process.env.INTENTPROOF_CORE_DIR?.trim();
  runVerifyCompatibilityPinsCli({
    toolsDir: toolsDir || undefined,
    coreDir: coreDir || undefined,
  }).then((code) => process.exit(code));
}
/* v8 ignore stop */
