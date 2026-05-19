import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import { runJcsConformanceTests } from './conformance/jcs_conformance';
import { vectors } from './conformance/jcs_vectors';
import { runAgentManifestTests } from './conformance/agent_manifest_test';
import { runWebhookFindingTests } from './conformance/webhook_findings';
import { runConformance } from './conformance/runner';
import { computePolicyFingerprint } from './conformance/policy_fingerprint';
import { verifyManifest } from './integrity/verify_manifest';
import { generateManifest } from './integrity/generate_manifest';
import { verifyCompatibilityMatrix } from './compatibility/verify_matrix';
import { validateReasons } from './semantics/validate_reasons';
import { validateProvenanceClasses } from './semantics/validate_provenance_classes';
import { validateReferencePolicies } from './reference-policies/validate';

function tmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

describe('verifyManifest edge cases', () => {
  it('detects hash mismatch and orphan manifest entries', () => {
    const dir = tmpDir('ip-vfy-');
    const schemaDir = path.join(dir, 'schema');
    fs.mkdirSync(schemaDir);
    fs.writeFileSync(path.join(schemaDir, 'sample.v1.schema.json'), '{"x":1}');

    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    const manifest = {
      files: {
        'schema/sample.v1.schema.json': 'sha256:deadbeef',
        'schema/missing.v1.schema.json': 'sha256:abc',
      },
    };
    const manifestContent = Buffer.from(JSON.stringify(manifest));
    const sig = crypto.sign(null, manifestContent, privateKey);
    fs.mkdirSync(path.join(dir, 'integrity'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'well-known-keys'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'integrity/manifest.v1.json'), manifestContent);
    fs.writeFileSync(path.join(dir, 'integrity/manifest.v1.json.sig'), sig);
    fs.writeFileSync(
      path.join(dir, 'well-known-keys/spec-integrity.pem'),
      publicKey.export({ type: 'spki', format: 'pem' }),
    );

    const result = verifyManifest(dir);
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/hash mismatch/);
    expect(result.messages.join('\n')).toMatch(/missing file/);
  });

  it('detects on-disk file missing from manifest', () => {
    const dir = tmpDir('ip-vfy2-');
    fs.mkdirSync(path.join(dir, 'schema'));
    fs.writeFileSync(path.join(dir, 'schema/a.json'), '{}');

    const generated = generateManifest({
      projectRoot: dir,
      publicKeyPath: path.join(dir, 'well-known-keys/spec-integrity.pem'),
      privateKeyPath: path.join(dir, 'secrets/spec-integrity-private.pem'),
      manifestPath: path.join(dir, 'integrity/manifest.v1.json'),
      sigPath: path.join(dir, 'integrity/manifest.v1.json.sig'),
    });
    expect(generated.ok).toBe(true);

    fs.writeFileSync(path.join(dir, 'schema/extra.json'), '{}');
    const result = verifyManifest(dir);
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/not found in manifest/);
  });
});

describe('generateManifest edge cases', () => {
  it('refuses to rotate when public key exists without private key', () => {
    const dir = tmpDir('ip-gen-');
    fs.mkdirSync(path.join(dir, 'schema'));
    fs.writeFileSync(path.join(dir, 'schema/a.json'), '{}');
    const { publicKey } = crypto.generateKeyPairSync('ed25519');
    const publicKeyPath = path.join(dir, 'well-known-keys/spec-integrity.pem');
    fs.mkdirSync(path.dirname(publicKeyPath), { recursive: true });
    fs.writeFileSync(publicKeyPath, publicKey.export({ type: 'spki', format: 'pem' }));

    const result = generateManifest({
      projectRoot: dir,
      publicKeyPath,
      privateKeyPath: path.join(dir, 'secrets/spec-integrity-private.pem'),
      manifestPath: path.join(dir, 'integrity/manifest.v1.json'),
      sigPath: path.join(dir, 'integrity/manifest.v1.json.sig'),
    });
    expect(result.ok).toBe(false);
  });

  it('fails when keys are missing and generation disabled', () => {
    const dir = tmpDir('ip-gen2-');
    fs.mkdirSync(path.join(dir, 'schema'));
    fs.writeFileSync(path.join(dir, 'schema/a.json'), '{}');
    const result = generateManifest({
      projectRoot: dir,
      publicKeyPath: path.join(dir, 'pub.pem'),
      privateKeyPath: path.join(dir, 'priv.pem'),
      manifestPath: path.join(dir, 'integrity/manifest.v1.json'),
      sigPath: path.join(dir, 'integrity/manifest.v1.json.sig'),
      generateIfMissing: false,
    });
    expect(result.ok).toBe(false);
  });
});

describe('validateReasons edge cases', () => {
  it('validates structural and vocabulary errors', () => {
    const dir = tmpDir('ip-reasons2-');
    writeJson(path.join(dir, 'reasons.json'), {
      reasons: [
        {
          code: 'fail.required.missing_event',
          category: 'required',
          description: 'ok',
          severity_hint: 'critical',
        },
        {
          code: 'fail.required.missing_event',
          category: 'required',
          description: 'dup',
        },
        {
          code: 'bad.outcome.code',
          category: 'required',
          description: 'bad prefix',
        },
        {
          code: 'fail.required',
          category: 'required',
          description: 'too few segments',
        },
        {
          code: 'fail.forbidden.secret',
          category: 'required',
          description: 'category mismatch',
        },
        {
          code: 'fail.unknown.x',
          category: 'not_allowed',
          description: 'bad category',
        },
        {
          code: 'fail.required.empty_title',
          category: 'required',
          description: 'x',
          title: '',
        },
      ],
      categories: ['required', 'not_allowed'],
      demo_blocker_reasons: ['fail.required.missing_event', 'missing.code'],
    });
    writeJson(path.join(dir, 'finding.v1.schema.json'), {
      type: 'object',
      properties: {
        reason: { enum: ['fail.required.missing_event'] },
        rule_category: { enum: ['required'] },
      },
    });
    fs.mkdirSync(path.join(dir, 'golden'));
    fs.writeFileSync(
      path.join(dir, 'golden/run_cases.jsonl'),
      '{"run":{"findings":[{"reason":"fail.required.ghost"}]}}',
    );

    const result = validateReasons({
      reasonsPath: path.join(dir, 'reasons.json'),
      goldenDir: path.join(dir, 'golden'),
      findingSchemaPath: path.join(dir, 'finding.v1.schema.json'),
    });
    expect(result.ok).toBe(false);
    expect(result.messages.length).toBeGreaterThan(5);
  });

  it('rejects non-object top-level reasons document', () => {
    const dir = tmpDir('ip-reasons3-');
    fs.writeFileSync(path.join(dir, 'reasons.json'), '[]');
    const result = validateReasons({ reasonsPath: path.join(dir, 'reasons.json') });
    expect(result.ok).toBe(false);
  });

  it('detects finding schema enum drift in both directions', () => {
    const dir = tmpDir('ip-reasons4-');
    writeJson(path.join(dir, 'reasons.json'), {
      reasons: [
        {
          code: 'fail.required.missing_event',
          category: 'required',
          description: 'x',
        },
      ],
    });
    writeJson(path.join(dir, 'finding.v1.schema.json'), {
      type: 'object',
      properties: {
        reason: { enum: ['fail.required.missing_event', 'fail.extra.stale'] },
        rule_category: { enum: ['required', 'stale'] },
      },
    });
    const result = validateReasons({
      reasonsPath: path.join(dir, 'reasons.json'),
      goldenDir: path.join(dir, 'golden'),
      findingSchemaPath: path.join(dir, 'finding.v1.schema.json'),
    });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/missing from reasons.json/);
    expect(result.messages.join('\n')).toMatch(/not used as a category/);
  });
});

describe('validateProvenanceClasses edge cases', () => {
  it('reports duplicate and missing class entries', () => {
    const dir = tmpDir('ip-prov2-');
    writeJson(path.join(dir, 'provenance_classes.json'), {
      schema: 'intentproof.provenance_classes.v1',
      version: '1',
      classes: [
        { value: 'platform_attested', labels: ['a'], consumer_treatment: 'trust' },
        { value: 'platform_attested', labels: ['b'], consumer_treatment: 'trust' },
      ],
    });
    const result = validateProvenanceClasses({
      provenancePath: path.join(dir, 'provenance_classes.json'),
      schemaDir: path.join(__dirname, 'schema'),
    });
    expect(result.ok).toBe(false);
  });
});

describe('validateReferencePolicies edge cases', () => {
  it('reports pack manifest and fixture errors', () => {
    const dir = tmpDir('ip-ref2-');
    const packDir = path.join(dir, 'demo', 'sample', 'v1');
    fs.mkdirSync(path.join(packDir, 'fixtures/bad'), { recursive: true });
    writeJson(path.join(packDir, 'pack.json'), {
      schema: 'wrong',
      reference_id: 'reference.demo.sample.v1',
      domain: 'demo',
      name: 'sample',
      version: 1,
      display_name: 'Demo',
      summary: 'Demo pack',
      policy: 'policy.json',
      policy_yaml: 'policy.yaml',
      migration_notes: 'MIGRATION.md',
      fixtures: [
        {
          id: 'bad',
          description: 'bad',
          flow: '../escape/flow.json',
          attestations: 'fixtures/bad/attestations.jsonl',
          expected_run: 'fixtures/bad/expected-run.json',
        },
      ],
    });
    fs.writeFileSync(path.join(packDir, 'README.md'), '# demo');
    fs.writeFileSync(path.join(packDir, 'MIGRATION.md'), 'none');
    writeJson(path.join(packDir, 'policy.json'), { schema: 'intentproof.policy.v1' });
    fs.writeFileSync(path.join(packDir, 'policy.yaml'), 'schema: intentproof.policy.v1\n');
    fs.writeFileSync(path.join(packDir, 'fixtures/bad/attestations.jsonl'), '{bad json');
    writeJson(path.join(packDir, 'fixtures/bad/flow.json'), { schema: 'intentproof.flow.v1' });
    writeJson(path.join(packDir, 'fixtures/bad/expected-run.json'), { schema: 'intentproof.run.v1' });

    const result = validateReferencePolicies({ root: dir, repoRoot: __dirname });
    expect(result.ok).toBe(false);
    expect(result.messages.length).toBeGreaterThan(3);
  });
});

describe('runner edge cases', () => {
  it('warns when schema mapping is missing and fails fingerprint mismatch', () => {
    const dir = tmpDir('ip-run2-');
    const schemaDir = path.join(dir, 'schema');
    const goldenDir = path.join(dir, 'golden');
    fs.mkdirSync(schemaDir);
    fs.mkdirSync(goldenDir);
    writeJson(path.join(schemaDir, 'policy.v1.schema.json'), {
      $id: 'intentproof://policy.v1',
      type: 'object',
      properties: {
        schema: { const: 'intentproof.policy.v1' },
        policy_fingerprint: { type: 'string' },
      },
      required: ['schema'],
    });
    fs.writeFileSync(path.join(goldenDir, 'unknown_cases.jsonl'), '{"x":{}}\n');
    const policy = {
      schema: 'intentproof.policy.v1',
      policy_id: 'tnt.test',
      policy_version: 1,
      policy_fingerprint: 'sha256:wrong',
    };
    fs.writeFileSync(
      path.join(goldenDir, 'policy_cases.jsonl'),
      JSON.stringify({ shouldValidate: true, policy }) + '\n',
    );
    const result = runConformance({ schemaDir, goldenDir });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/Fingerprint mismatch|No schema found/);
  });
});

describe('compatibility matrix manifest coverage gap', () => {
  it('fails when integrity manifest omits compatibility files', async () => {
    const dir = tmpDir('ip-matrix2-');
    fs.mkdirSync(path.join(dir, 'compatibility'));
    fs.mkdirSync(path.join(dir, 'integrity'));
    fs.copyFileSync(
      path.join(__dirname, 'compatibility/matrix.v1.schema.json'),
      path.join(dir, 'compatibility/matrix.v1.schema.json'),
    );
    fs.copyFileSync(
      path.join(__dirname, 'compatibility/matrix.v1.json'),
      path.join(dir, 'compatibility/matrix.v1.json'),
    );
    fs.writeFileSync(path.join(dir, 'integrity/manifest.v1.json'), JSON.stringify({ files: {} }));
    const result = await verifyCompatibilityMatrix({ root: dir });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/Integrity manifest does not cover/);
  });
});

describe('CLI entry scripts', () => {
  it('run exported suites directly', () => {
    expect(runJcsConformanceTests().ok).toBe(true);
    expect(
      runAgentManifestTests(path.join(__dirname, 'golden/agent-manifest_cases.jsonl')).ok,
    ).toBe(true);
    expect(
      runWebhookFindingTests(
        path.join(__dirname, 'golden/webhook-finding_cases.jsonl'),
        path.join(__dirname, 'well-known-keys/webhook-signer-2026q2.pem'),
      ).ok,
    ).toBe(true);
  });
});

describe('jcs conformance failures', () => {
  it('reports vector mismatch', () => {
    const bad = [{ input: { a: 1 }, expected: '{"a":2}' }];
    const result = runJcsConformanceTests(bad as typeof vectors);
    expect(result.ok).toBe(false);
  });
});

describe('reference pack copied from template', () => {
  it('detects yaml/json drift and bad fixture ids', () => {
    const src = path.join(__dirname, 'reference-policies/templates/minimal-required/v1');
    const dir = tmpDir('ip-ref3-');
    const packDir = path.join(dir, 'templates', 'minimal-required', 'v1');
    fs.cpSync(src, packDir, { recursive: true });
    fs.writeFileSync(path.join(packDir, 'policy.yaml'), 'schema: intentproof.policy.v1\npolicy_id: wrong\n');
    const result = validateReferencePolicies({
      root: path.join(dir, 'templates'),
      repoRoot: __dirname,
    });
    expect(result.ok).toBe(false);
  });
});

describe('agent manifest and webhook failure paths', () => {
  it('reports projection mismatch', () => {
    const dir = tmpDir('ip-am-');
    const cases = path.join(dir, 'cases.jsonl');
    fs.writeFileSync(
      cases,
      JSON.stringify({
        shouldValidate: true,
        source_bundle: {
          files: {
            'certificate.json': { issued_at: '2026-01-01T00:00:00Z' },
            'run.json': { tenant_id: 't', status: 'pass', findings: [] },
            'policy.json': { policy_id: 'p', policy_version: 1 },
            'flow.json': { flow_id: 'f' },
          },
        },
        agent_manifest: { schema: 'intentproof.agent_manifest.v1', bundle_sha256: 'sha256:dead' },
      }) + '\n',
    );
    expect(runAgentManifestTests(cases).ok).toBe(false);
  });

  it('reports invalid webhook metadata', () => {
    const dir = tmpDir('ip-wh-');
    const cases = path.join(dir, 'cases.jsonl');
    fs.writeFileSync(
      cases,
      JSON.stringify({
        shouldValidate: true,
        webhook_finding: { schema: 'intentproof.webhook_finding.v1', signature: { alg: 'ed25519', key_id: 'bad', value: 'a' } },
      }) + '\n',
    );
    const result = runWebhookFindingTests(
      cases,
      path.join(__dirname, 'well-known-keys/webhook-signer-2026q2.pem'),
    );
    expect(result.ok).toBe(false);
  });
});

describe('policy_fingerprint stability', () => {
  it('matches runner expectation for stub policy', () => {
    const policy = {
      schema: 'intentproof.policy.v1',
      policy_id: 'tnt.test',
      policy_version: 1,
      tenant_id: 'tnt',
      spec_version: '1.0.0',
      scope: { any_event_action_in: ['a'] },
      rules: [{ id: 'r1', category: 'required', severity: 'high', spec: { action: 'a' } }],
    };
    expect(computePolicyFingerprint(policy)).toMatch(/^sha256:/);
  });
});
