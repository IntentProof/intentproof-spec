import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import { canonicalize } from 'json-canonicalize';
import { listManifestFiles } from './integrity/manifest_files';
import { verifyManifest } from './integrity/verify_manifest';
import { generateManifest as generateManifestFn } from './integrity/generate_manifest';
import { delegationAttributeViolation } from './conformance/delegation_attributes';
import { computePolicyFingerprint } from './conformance/policy_fingerprint';
import {
  projectAgentManifest,
  sha256Canonical,
  AGENT_MANIFEST_READ_ORDER,
} from './conformance/agent_manifest';
import { verifyWebhookFindingEnvelope } from './conformance/webhook_findings';
import {
  collectGoldenCaseFiles,
  resolveSchemaFile,
  isExecutionEventSchema,
  runConformance,
} from './conformance/runner';
import {
  githubReleaseExistsViaHttps,
  verifyCompatibilityMatrix,
} from './compatibility/verify_matrix';
import { validateReasons } from './semantics/validate_reasons';
import { validateProvenanceClasses } from './semantics/validate_provenance_classes';
import { validateReferencePolicies } from './reference-policies/validate';

describe('manifest_files', () => {
  it('lists schema, golden, and compatibility json files', () => {
    const root = path.join(__dirname);
    const files = listManifestFiles(root);
    expect(files.some((f) => f.endsWith('schema/policy.v1.schema.json'))).toBe(true);
    expect(files.some((f) => f.endsWith('golden/policy_cases.jsonl'))).toBe(true);
    expect(files.some((f) => f.endsWith('compatibility/matrix.v1.json'))).toBe(true);
  });

  it('ignores missing subdirectories', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ip-spec-'));
    expect(listManifestFiles(dir)).toEqual([]);
  });
});

describe('delegation_attributes', () => {
  it('accepts allowed delegation keys', () => {
    expect(
      delegationAttributeViolation({
        'intentproof.delegation.depth': 1,
      }),
    ).toBeNull();
  });

  it('rejects unknown delegation keys', () => {
    expect(delegationAttributeViolation({ 'intentproof.delegation.extra': true })).toMatch(/unknown/);
  });

  it('rejects non-object attributes', () => {
    expect(delegationAttributeViolation([])).toMatch(/object/);
    expect(delegationAttributeViolation(null)).toBeNull();
  });
});

describe('policy_fingerprint', () => {
  it('excludes signature fields from fingerprint', () => {
    const policy = {
      schema: 'intentproof.policy.v1',
      policy_id: 'tnt.test',
      policy_version: 1,
      policy_fingerprint: 'sha256:old',
      signed_at: '2026-01-01T00:00:00Z',
      signature: { alg: 'ed25519', key_id: 'k', value: 'v' },
    };
    const fp = computePolicyFingerprint(policy);
    expect(fp).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(fp).not.toBe('sha256:old');
  });
});

describe('agent_manifest', () => {
  it('projects untrusted payload field paths', () => {
    const manifest = projectAgentManifest({
      files: {
        'certificate.json': { issued_at: '2026-01-01T00:00:00Z' },
        'run.json': { tenant_id: 'tnt', status: 'fail', findings: [{ outcome: 'fail', finding_id: 'f1' }] },
        'policy.json': { policy_id: 'p', policy_version: 1 },
        'flow.json': { flow_id: 'flow_1' },
        'events.jsonl': [{ untrusted_payload: true, inputs: { x: 1 }, output: { y: 2 } }],
      },
      known_limitations: ['demo'],
    });
    expect(manifest.untrusted_payload_fields).toEqual([
      'events.jsonl#$.inputs',
      'events.jsonl#$.output',
    ]);
    expect(manifest.decision_basis_finding_ids).toEqual(['f1']);
    expect(manifest.recommended_read_order).toEqual(
      AGENT_MANIFEST_READ_ORDER.filter((name) =>
        ['certificate.json', 'run.json', 'policy.json', 'flow.json', 'events.jsonl'].includes(name),
      ),
    );
    expect(sha256Canonical({ a: 1 })).toMatch(/^sha256:/);
  });
});

describe('integrity generate and verify', () => {
  it('generates and verifies a manifest in a temp repo', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ip-manifest-'));
    const schemaDir = path.join(dir, 'schema');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.writeFileSync(path.join(schemaDir, 'sample.v1.schema.json'), '{"schema":true}');

    const publicKeyPath = path.join(dir, 'well-known-keys', 'spec-integrity.pem');
    const privateKeyPath = path.join(dir, 'secrets', 'spec-integrity-private.pem');
    const manifestPath = path.join(dir, 'integrity', 'manifest.v1.json');
    const sigPath = path.join(dir, 'integrity', 'manifest.v1.json.sig');

    const generated = generateManifestFn({
      projectRoot: dir,
      publicKeyPath,
      privateKeyPath,
      manifestPath,
      sigPath,
    });
    expect(generated.ok).toBe(true);
    expect(generated.verified).toBe(true);

    const verified = verifyManifest(dir);
    expect(verified.ok).toBe(true);
  });

  it('fails when public key exists without private key', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ip-manifest-'));
    fs.mkdirSync(path.join(dir, 'schema'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'schema', 'sample.v1.schema.json'), '{}');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const publicKeyPath = path.join(dir, 'well-known-keys', 'spec-integrity.pem');
    fs.mkdirSync(path.dirname(publicKeyPath), { recursive: true });
    fs.writeFileSync(publicKeyPath, publicKey.export({ type: 'spki', format: 'pem' }));

    const result = generateManifestFn({
      projectRoot: dir,
      publicKeyPath,
      privateKeyPath: path.join(dir, 'secrets', 'missing.pem'),
      manifestPath: path.join(dir, 'integrity', 'manifest.v1.json'),
      sigPath: path.join(dir, 'integrity', 'manifest.v1.json.sig'),
      generateIfMissing: false,
    });
    expect(result.ok).toBe(false);
  });

  it('reports missing manifest inputs', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ip-manifest-'));
    const result = verifyManifest(dir);
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/Manifest file not found/);
  });
});

describe('runner helpers', () => {
  it('collects nested golden case files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ip-golden-'));
    const nested = path.join(dir, 'multi-agent');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(nested, 'execution_event_cases.jsonl'), '{}');
    expect(collectGoldenCaseFiles(dir).length).toBe(1);
  });

  it('resolves schema file names', () => {
    const files = ['execution_event.v1.schema.json', 'policy.v1.schema.json'];
    expect(resolveSchemaFile('execution_event', files)).toBe('execution_event.v1.schema.json');
    expect(isExecutionEventSchema('execution_event.v1.schema.json')).toBe(true);
  });

  it('flags invalid JSON in golden fixtures', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ip-run-'));
    const schemaDir = path.join(dir, 'schema');
    const goldenDir = path.join(dir, 'golden');
    fs.mkdirSync(schemaDir);
    fs.mkdirSync(goldenDir);
    fs.writeFileSync(
      path.join(schemaDir, 'policy.v1.schema.json'),
      JSON.stringify({
        $id: 'intentproof://policy.v1',
        type: 'object',
        properties: { schema: { const: 'intentproof.policy.v1' } },
        required: ['schema'],
      }),
    );
    fs.writeFileSync(path.join(goldenDir, 'policy_cases.jsonl'), '{not-json');
    const result = runConformance({ schemaDir, goldenDir });
    expect(result.ok).toBe(false);
  });
});

describe('compatibility matrix', () => {
  it('validates schema and manifest coverage', async () => {
    const result = await verifyCompatibilityMatrix({ root: __dirname });
    expect(result.ok).toBe(true);
  });

  it('fails on invalid matrix JSON', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ip-matrix-'));
    fs.mkdirSync(path.join(dir, 'compatibility'));
    fs.mkdirSync(path.join(dir, 'integrity'));
    fs.writeFileSync(path.join(dir, 'compatibility', 'matrix.v1.schema.json'), '{"type":"object"}');
    fs.writeFileSync(path.join(dir, 'compatibility', 'matrix.v1.json'), '{"schema":"wrong"}');
    fs.writeFileSync(
      path.join(dir, 'integrity', 'manifest.v1.json'),
      JSON.stringify({ files: {} }),
    );
    const result = await verifyCompatibilityMatrix({ root: dir });
    expect(result.ok).toBe(false);
  });

  it('checks released entries with injected release lookup', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ip-matrix-'));
    fs.mkdirSync(path.join(dir, 'compatibility'));
    fs.mkdirSync(path.join(dir, 'integrity'));
    fs.copyFileSync(
      path.join(__dirname, 'compatibility/matrix.v1.schema.json'),
      path.join(dir, 'compatibility/matrix.v1.schema.json'),
    );
    const base = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'compatibility/matrix.v1.json'), 'utf-8'),
    ) as { schema: string; generated_at: string; entries: Record<string, unknown>[] };
    base.entries[0] = { ...base.entries[0], release_status: 'released' };
    fs.writeFileSync(path.join(dir, 'compatibility/matrix.v1.json'), JSON.stringify(base));
    fs.writeFileSync(
      path.join(dir, 'integrity', 'manifest.v1.json'),
      JSON.stringify({
        files: {
          'compatibility/matrix.v1.json': 'sha256:abc',
          'compatibility/matrix.v1.schema.json': 'sha256:abc',
        },
      }),
    );
    const missing = await verifyCompatibilityMatrix({
      root: dir,
      releaseExists: async () => false,
    });
    expect(missing.ok).toBe(false);

    const ok = await verifyCompatibilityMatrix({
      root: dir,
      releaseExists: async () => true,
    });
    expect(ok.ok).toBe(true);
  });
});

describe('validateReasons failures', () => {
  it('fails on invalid reasons JSON', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ip-reasons-'));
    fs.writeFileSync(path.join(dir, 'reasons.json'), '{');
    const result = validateReasons({ reasonsPath: path.join(dir, 'reasons.json') });
    expect(result.ok).toBe(false);
  });
});

describe('validateProvenanceClasses failures', () => {
  it('fails when provenance doc schema is wrong', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ip-prov-'));
    fs.writeFileSync(path.join(dir, 'provenance_classes.json'), JSON.stringify({ schema: 'bad' }));
    const result = validateProvenanceClasses({
      provenancePath: path.join(dir, 'provenance_classes.json'),
      schemaDir: path.join(__dirname, 'schema'),
    });
    expect(result.ok).toBe(false);
  });
});

describe('validateReferencePolicies failures', () => {
  it('fails when pack.json is missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ip-ref-'));
    fs.mkdirSync(path.join(dir, 'demo', 'sample', 'v1'), { recursive: true });
    const result = validateReferencePolicies({ root: dir, repoRoot: __dirname });
    expect(result.ok).toBe(false);
  });
});

describe('webhook_findings', () => {
  it('rejects envelopes with wrong key id', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    void privateKey;
    const envelope = {
      schema: 'intentproof.webhook_finding.v1',
      signature: { alg: 'ed25519', key_id: 'wrong', value: 'abc' },
    };
    expect(verifyWebhookFindingEnvelope(envelope, publicKey)).toBe(false);
  });
});
