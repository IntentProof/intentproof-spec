import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import { validateReasons } from './semantics/validate_reasons';
import { validateProvenanceClasses } from './semantics/validate_provenance_classes';
import { verifyManifest } from './integrity/verify_manifest';
import { generateManifest, runGenerateManifestCli } from './integrity/generate_manifest';
import { runConformance } from './conformance/runner';

function tmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

describe('validateReasons additional branches', () => {
  it('covers demo blocker, severity, and optional field validation', () => {
    const dir = tmpDir('ip-rsn-');
    writeJson(path.join(dir, 'reasons.json'), {
      reasons: [
        {
          code: 'fail.required.demo_blocker',
          category: 'required',
          description: 'demo',
        },
        {
          code: 'fail.required.bad_severity',
          category: 'required',
          description: 'x',
          severity_hint: 'urgent',
        },
        {
          code: 'fail.required.bad_optional',
          category: 'required',
          description: 'x',
          typical_causes: [],
        },
      ],
      demo_blocker_reasons: ['fail.required.demo_blocker'],
    });
    writeJson(path.join(dir, 'finding.v1.schema.json'), {
      type: 'object',
      properties: {
        reason: { enum: ['fail.required.demo_blocker', 'fail.required.bad_severity', 'fail.required.bad_optional'] },
        rule_category: { enum: ['required'] },
      },
    });
    fs.mkdirSync(path.join(dir, 'golden'));
    const result = validateReasons({
      reasonsPath: path.join(dir, 'reasons.json'),
      goldenDir: path.join(dir, 'golden'),
      findingSchemaPath: path.join(dir, 'finding.v1.schema.json'),
    });
    expect(result.ok).toBe(false);
    expect(result.summary).toMatch(/failed/);
  });

  it('requires reasons array and valid categories list', () => {
    const dir = tmpDir('ip-rsn2-');
    writeJson(path.join(dir, 'reasons.json'), {
      categories: ['bogus'],
    });
    const result = validateReasons({ reasonsPath: path.join(dir, 'reasons.json') });
    expect(result.ok).toBe(false);
  });

  it('validates finding schema read and shape errors', () => {
    const dir = tmpDir('ip-rsn3-');
    writeJson(path.join(dir, 'reasons.json'), {
      reasons: [{ code: 'fail.required.x', category: 'required', description: 'd' }],
    });
    const missing = validateReasons({
      reasonsPath: path.join(dir, 'reasons.json'),
      findingSchemaPath: path.join(dir, 'missing.schema.json'),
    });
    expect(missing.ok).toBe(false);

    writeJson(path.join(dir, 'bad.schema.json'), '{');
    const badJson = validateReasons({
      reasonsPath: path.join(dir, 'reasons.json'),
      findingSchemaPath: path.join(dir, 'bad.schema.json'),
    });
    expect(badJson.ok).toBe(false);

    writeJson(path.join(dir, 'shape.schema.json'), []);
    const badShape = validateReasons({
      reasonsPath: path.join(dir, 'reasons.json'),
      findingSchemaPath: path.join(dir, 'shape.schema.json'),
    });
    expect(badShape.ok).toBe(false);
  });

  it('flags golden reason codes missing from vocabulary', () => {
    const dir = tmpDir('ip-rsn4-');
    writeJson(path.join(dir, 'reasons.json'), {
      reasons: [{ code: 'fail.required.x', category: 'required', description: 'd' }],
    });
    fs.mkdirSync(path.join(dir, 'golden'));
    fs.writeFileSync(
      path.join(dir, 'golden/run_cases.jsonl'),
      '{"run":{"findings":[{"reason":"fail.required.ghost"}]}}',
    );
    writeJson(path.join(dir, 'finding.v1.schema.json'), {
      type: 'object',
      properties: {
        reason: { enum: ['fail.required.x'] },
        rule_category: { enum: ['required'] },
      },
    });
    const result = validateReasons({
      reasonsPath: path.join(dir, 'reasons.json'),
      goldenDir: path.join(dir, 'golden'),
      findingSchemaPath: path.join(dir, 'finding.v1.schema.json'),
    });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/missing from reasons.json/);
  });
});

describe('validateProvenanceClasses additional branches', () => {
  it('validates class entry shape and schema provenance fields', () => {
    const dir = tmpDir('ip-prv-');
    writeJson(path.join(dir, 'provenance_classes.json'), {
      schema: 'intentproof.provenance_classes.v1',
      version: '',
      classes: [{ value: '', labels: 'bad', consumer_treatment: '' }],
    });
    const result = validateProvenanceClasses({
      provenancePath: path.join(dir, 'provenance_classes.json'),
      schemaDir: path.join(__dirname, 'schema'),
    });
    expect(result.ok).toBe(false);
  });
});

describe('integrity branches', () => {
  it('reuses an existing private key and recreates a missing public key', () => {
    const dir = tmpDir('ip-gen3-');
    fs.mkdirSync(path.join(dir, 'schema'));
    fs.writeFileSync(path.join(dir, 'schema/a.json'), '{}');
    const publicKeyPath = path.join(dir, 'well-known-keys/spec-integrity.pem');
    const privateKeyPath = path.join(dir, 'secrets/spec-integrity-private.pem');
    const manifestPath = path.join(dir, 'integrity/manifest.v1.json');
    const sigPath = path.join(dir, 'integrity/manifest.v1.json.sig');
    const opts = { projectRoot: dir, publicKeyPath, privateKeyPath, manifestPath, sigPath };
    expect(generateManifest(opts).ok).toBe(true);
    fs.unlinkSync(publicKeyPath);
    expect(generateManifest(opts).ok).toBe(true);
  });

  it('fails when manifest signature is invalid', () => {
    const dir = tmpDir('ip-vfy3-');
    fs.mkdirSync(path.join(dir, 'schema'));
    fs.writeFileSync(path.join(dir, 'schema/a.json'), '{}');
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    fs.mkdirSync(path.join(dir, 'integrity'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'well-known-keys'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'integrity/manifest.v1.json'), '{"files":{}}');
    fs.writeFileSync(path.join(dir, 'integrity/manifest.v1.json.sig'), Buffer.from('bad-sig'));
    fs.writeFileSync(
      path.join(dir, 'well-known-keys/spec-integrity.pem'),
      publicKey.export({ type: 'spki', format: 'pem' }),
    );
    void privateKey;
    const result = verifyManifest(dir);
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/signature verification failed/);
  });

  it('runs generate manifest cli when operator keys are present', () => {
    const privateKeyPath = path.join(__dirname, 'integrity/../secrets/spec-integrity-private.pem');
    if (!fs.existsSync(privateKeyPath)) {
      return;
    }
    const result = runGenerateManifestCli();
    expect(result.ok).toBe(true);
  });

  it('uses SPEC_INTEGRITY_PRIVATE_KEY env for CI-style generation', () => {
    const dir = tmpDir('ip-gen-env-');
    fs.mkdirSync(path.join(dir, 'schema'));
    fs.writeFileSync(path.join(dir, 'schema/a.json'), '{}');
    const { privateKey } = crypto.generateKeyPairSync('ed25519');
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const previous = process.env.SPEC_INTEGRITY_PRIVATE_KEY;
    process.env.SPEC_INTEGRITY_PRIVATE_KEY = pem.trim();
    try {
      const result = runGenerateManifestCli(dir);
      expect(result.ok).toBe(true);
      expect(result.verified).toBe(true);
      expect(fs.existsSync(path.join(dir, 'integrity/manifest.v1.json'))).toBe(true);
    } finally {
      if (previous === undefined) {
        delete process.env.SPEC_INTEGRITY_PRIVATE_KEY;
      } else {
        process.env.SPEC_INTEGRITY_PRIVATE_KEY = previous;
      }
    }
  });
});

describe('runner additional branches', () => {
  it('warns when golden file has no matching schema', () => {
    const dir = tmpDir('ip-run3-');
    const schemaDir = path.join(dir, 'schema');
    const goldenDir = path.join(dir, 'golden');
    fs.mkdirSync(schemaDir);
    fs.mkdirSync(goldenDir);
    fs.writeFileSync(path.join(goldenDir, 'missing_schema_cases.jsonl'), '{"x":{}}\n');
    const result = runConformance({ schemaDir, goldenDir });
    expect(result.ok).toBe(true);
    expect(result.messages.join('\n')).toMatch(/No schema found/);
  });
});
