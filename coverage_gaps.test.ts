import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { describe, expect, it, vi } from 'vitest';
import { canonicalize } from 'json-canonicalize';
import { runJcsConformanceTests } from './conformance/jcs_conformance';
import { runConformance } from './conformance/runner';
import { runAgentManifestTests } from './conformance/agent_manifest_test';
import { runWebhookFindingTests } from './conformance/webhook_findings';
import { verifyManifest } from './integrity/verify_manifest';
import { generateManifest } from './integrity/generate_manifest';
import {
  githubReleaseExistsViaHttps,
  runVerifyCompatibilityMatrixCli,
  verifyCompatibilityMatrix,
  setHttpsGetForTests,
} from './compatibility/verify_matrix';
import { validateReasons, runValidateReasonsCli } from './semantics/validate_reasons';
import {
  validateProvenanceClasses,
  runValidateProvenanceClassesCli,
} from './semantics/validate_provenance_classes';
import { validateReferencePolicies, runValidateReferencePoliciesCli } from './reference-policies/validate';

function tmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

describe('JCS conformance failure branches', () => {
  it('reports when canonical form still includes fingerprint fields', () => {
    const result = runJcsConformanceTests(undefined, {
      canonicalizeImpl: () => '{"policy_fingerprint":"x"}',
    });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/did not exclude fingerprint fields/);
  });

  it('reports policy hash mismatch', () => {
    const result = runJcsConformanceTests(undefined, { hashHex: 'deadbeef' });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/Policy fingerprint mismatch/);
  });

  it('reports when computePolicyFingerprint lacks sha256 prefix', () => {
    const result = runJcsConformanceTests(undefined, {
      fingerprintImpl: () => 'md5:bad',
    });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/sha256 prefix/);
  });
});

describe('runner remaining branches', () => {
  it('errors when schema file lacks $id and is not compiled', () => {
    const dir = tmpDir('ip-run4-');
    const schemaDir = path.join(dir, 'schema');
    const goldenDir = path.join(dir, 'golden');
    fs.mkdirSync(schemaDir);
    fs.mkdirSync(goldenDir);
    writeJson(path.join(schemaDir, 'policy.v1.schema.json'), {
      type: 'object',
      properties: { schema: { const: 'intentproof.policy.v1' } },
    });
    fs.writeFileSync(
      path.join(goldenDir, 'policy_cases.jsonl'),
      JSON.stringify({ shouldValidate: true, policy: { schema: 'intentproof.policy.v1' } }) + '\n',
    );
    const result = runConformance({ schemaDir, goldenDir });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/AJV did not compile/);
  });

  it('flags delegation oracle violations on execution events', () => {
    const dir = tmpDir('ip-run5-');
    const schemaDir = path.join(dir, 'schema');
    const goldenDir = path.join(dir, 'golden');
    fs.mkdirSync(schemaDir);
    fs.mkdirSync(goldenDir);
    writeJson(path.join(schemaDir, 'execution_event.v1.schema.json'), {
      $id: 'intentproof://execution_event.v1',
      type: 'object',
      properties: {
        schema: { const: 'intentproof.event.v1' },
        attributes: { type: 'object' },
      },
      required: ['schema'],
    });
    fs.writeFileSync(
      path.join(goldenDir, 'execution_event_cases.jsonl'),
      JSON.stringify({
        shouldValidate: true,
        event: {
          schema: 'intentproof.event.v1',
          attributes: { 'intentproof.delegation.extra': true },
        },
      }) + '\n',
    );
    const result = runConformance({ schemaDir, goldenDir });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/delegation oracle/);
  });

  it('reports validation expectation mismatches and missing policy fingerprint', () => {
    const dir = tmpDir('ip-run6-');
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
    fs.writeFileSync(
      path.join(goldenDir, 'policy_cases.jsonl'),
      [
        JSON.stringify({
          shouldValidate: false,
          policy: { schema: 'intentproof.policy.v1' },
        }),
        JSON.stringify({
          shouldValidate: true,
          policy: { schema: 'intentproof.policy.v1' },
        }),
      ].join('\n') + '\n',
    );
    const result = runConformance({ schemaDir, goldenDir });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/Expected valid=false/);
    expect(result.messages.join('\n')).toMatch(/policy_fingerprint is missing/);
  });
});

describe('integrity verify remaining branches', () => {
  it('reports missing signature and public key files', () => {
    const dir = tmpDir('ip-vfy4-');
    fs.mkdirSync(path.join(dir, 'integrity'));
    fs.writeFileSync(path.join(dir, 'integrity/manifest.v1.json'), '{}');
    const noSig = verifyManifest(dir);
    expect(noSig.messages.join('\n')).toMatch(/Signature file not found/);

    fs.writeFileSync(path.join(dir, 'integrity/manifest.v1.json.sig'), Buffer.from('sig'));
    const noKey = verifyManifest(dir);
    expect(noKey.messages.join('\n')).toMatch(/Public key file not found/);
  });

  it('reports manifest missing files object', () => {
    const dir = tmpDir('ip-vfy5-');
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    const manifestContent = Buffer.from('[]');
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
    expect(result.messages.join('\n')).toMatch(/missing files object/);
  });
});

describe('compatibility matrix remaining branches', () => {
  it('reports schema validation errors with detail lines', async () => {
    const dir = tmpDir('ip-mx3-');
    fs.mkdirSync(path.join(dir, 'compatibility'));
    fs.mkdirSync(path.join(dir, 'integrity'));
    fs.copyFileSync(
      path.join(__dirname, 'compatibility/matrix.v1.schema.json'),
      path.join(dir, 'compatibility/matrix.v1.schema.json'),
    );
    fs.writeFileSync(path.join(dir, 'compatibility/matrix.v1.json'), '{"schema":"wrong"}');
    fs.writeFileSync(path.join(dir, 'integrity/manifest.v1.json'), JSON.stringify({ files: {} }));
    const result = await verifyCompatibilityMatrix({ root: dir });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/schema validation failed/);
  });

  it('handles CLI errors from release lookup failures', async () => {
    expect(await runVerifyCompatibilityMatrixCli({ root: path.join(tmpDir('ip-mx4-'), 'missing') })).toBe(1);
  });

  it('rejects non-404 HTTP responses from GitHub', async () => {
    const mockGet = vi.fn((_url: string, _opts: unknown, cb: (res: { statusCode: number; resume: () => void; on: (e: string, fn: () => void) => void }) => void) => {
      cb({
        statusCode: 500,
        resume: () => undefined,
        on: (event: string, fn: () => void) => {
          if (event === 'end') {
            fn();
          }
        },
      });
      return { on: () => undefined, setTimeout: () => undefined };
    });
    setHttpsGetForTests(mockGet as typeof import('https').get);
    await expect(githubReleaseExistsViaHttps('spec', 'v0.0.1')).rejects.toThrow(/HTTP 500/);
    setHttpsGetForTests(null);
  });
});

describe('validateReasons remaining branches', () => {
  it('reports unreadable reasons file', () => {
    const result = validateReasons({ reasonsPath: path.join(tmpDir('ip-rsn5-'), 'missing.json') });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/Unable to read/);
  });

  it('validates demo_blocker_reasons shape and duplicates', () => {
    const dir = tmpDir('ip-rsn6-');
    writeJson(path.join(dir, 'reasons.json'), {
      reasons: [{ code: 'fail.required.x', category: 'required', description: 'd' }],
      demo_blocker_reasons: 'bad',
    });
    expect(validateReasons({ reasonsPath: path.join(dir, 'reasons.json') }).ok).toBe(false);

    writeJson(path.join(dir, 'reasons.json'), {
      reasons: [{ code: 'fail.required.x', category: 'required', description: 'd' }],
      demo_blocker_reasons: ['', 'fail.required.x', 'fail.required.x'],
    });
    const dup = validateReasons({ reasonsPath: path.join(dir, 'reasons.json') });
    expect(dup.ok).toBe(false);
    expect(dup.messages.join('\n')).toMatch(/non-string entry/);
    expect(dup.messages.join('\n')).toMatch(/duplicate entry/);
  });

  it('validates reason entry shape and optional array items', () => {
    const dir = tmpDir('ip-rsn7-');
    writeJson(path.join(dir, 'reasons.json'), {
      reasons: [
        null,
        { category: 'required', description: 'd' },
        { code: 'fail.required.x', description: 'd' },
        { code: 'fail.required.y', category: 'required' },
        {
          code: 'fail.required.z',
          category: 'required',
          description: 'd',
          typical_owners: [''],
        },
      ],
    });
    writeJson(path.join(dir, 'finding.v1.schema.json'), {
      type: 'object',
      properties: {
        reason: { enum: ['fail.required.x', 'fail.required.y', 'fail.required.z'] },
        rule_category: { enum: ['required'] },
      },
    });
    const result = validateReasons({
      reasonsPath: path.join(dir, 'reasons.json'),
      findingSchemaPath: path.join(dir, 'finding.v1.schema.json'),
    });
    expect(result.ok).toBe(false);
    expect(result.messages.length).toBeGreaterThan(4);
  });

  it('validates finding schema enum shape errors', () => {
    const dir = tmpDir('ip-rsn8-');
    writeJson(path.join(dir, 'reasons.json'), {
      reasons: [{ code: 'fail.required.x', category: 'required', description: 'd' }],
    });
    writeJson(path.join(dir, 'finding.v1.schema.json'), {
      type: 'object',
      properties: {
        reason: { enum: [1] },
        rule_category: 'bad',
      },
    });
    const badEnum = validateReasons({
      reasonsPath: path.join(dir, 'reasons.json'),
      findingSchemaPath: path.join(dir, 'finding.v1.schema.json'),
    });
    expect(badEnum.ok).toBe(false);
    expect(badEnum.messages.join('\n')).toMatch(/non-string/);

    writeJson(path.join(dir, 'finding.v1.schema.json'), {
      type: 'object',
      properties: { reason: { enum: ['fail.required.x'] } },
    });
    const noRuleCat = validateReasons({
      reasonsPath: path.join(dir, 'reasons.json'),
      findingSchemaPath: path.join(dir, 'finding.v1.schema.json'),
    });
    expect(noRuleCat.ok).toBe(false);
    expect(noRuleCat.messages.join('\n')).toMatch(/missing rule_category/);

    writeJson(path.join(dir, 'finding.v1.schema.json'), {
      type: 'object',
      properties: {
        reason: { enum: ['fail.required.x'] },
        rule_category: {},
      },
    });
    const noEnum = validateReasons({
      reasonsPath: path.join(dir, 'reasons.json'),
      findingSchemaPath: path.join(dir, 'finding.v1.schema.json'),
    });
    expect(noEnum.ok).toBe(false);
    expect(noEnum.messages.join('\n')).toMatch(/must have enum array/);
  });

  it('runs CLI with failure output paths', () => {
    expect(runValidateReasonsCli({ reasonsPath: path.join(tmpDir('ip-rsn9-'), 'missing.json') })).toBe(1);
  });
});

describe('validateProvenanceClasses remaining branches', () => {
  it('reports non-object class entries and missing labels/treatment', () => {
    const dir = tmpDir('ip-prv2-');
    writeJson(path.join(dir, 'provenance_classes.json'), {
      schema: 'intentproof.provenance_classes.v1',
      version: '1',
      classes: ['bad', { value: 'platform_attested' }],
    });
    const result = validateProvenanceClasses({
      provenancePath: path.join(dir, 'provenance_classes.json'),
      schemaDir: path.join(__dirname, 'schema'),
    });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/non-object entry/);
    expect(result.messages.join('\n')).toMatch(/must declare labels/);
  });

  it('reports schema provenance_class field mismatches', () => {
    const dir = tmpDir('ip-prv3-');
    writeJson(path.join(dir, 'provenance_classes.json'), {
      schema: 'intentproof.provenance_classes.v1',
      version: '1',
      classes: [
        { value: 'platform_attested', labels: ['a'], consumer_treatment: 'trust' },
        { value: 'source_attested', labels: ['b'], consumer_treatment: 'trust' },
        { value: 'sdk_attested_evidence', labels: ['c'], consumer_treatment: 'trust' },
        { value: 'customer_supplied_payload', labels: ['d'], consumer_treatment: 'trust' },
        { value: 'non_authoritative_summary', labels: ['e'], consumer_treatment: 'trust' },
      ],
    });
    const schemaDir = path.join(dir, 'schema');
    fs.cpSync(path.join(__dirname, 'schema'), schemaDir, { recursive: true });
    writeJson(path.join(schemaDir, 'policy.v1.schema.json'), {
      type: 'object',
      properties: {},
      required: [],
    });
    const result = validateProvenanceClasses({
      provenancePath: path.join(dir, 'provenance_classes.json'),
      schemaDir,
    });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/missing properties.provenance_class/);
  });

  it('runs CLI helper', () => {
    expect(runValidateProvenanceClassesCli()).toBe(0);
  });
});

describe('validateReferencePolicies remaining branches', () => {
  it('fails when required schemas are missing', () => {
    const dir = tmpDir('ip-ref4-');
    const repoRoot = path.join(dir, 'repo');
    const schemaDir = path.join(repoRoot, 'schema');
    fs.mkdirSync(schemaDir, { recursive: true });
    writeJson(path.join(schemaDir, 'other.v1.schema.json'), { type: 'object' });
    const result = validateReferencePolicies({
      root: path.join(dir, 'packs'),
      repoRoot,
    });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/required schemas failed to load/);
  });

  it('covers pack traversal skips and manifest field branches', () => {
    const dir = tmpDir('ip-ref5-');
    const repoRoot = __dirname;
    const root = path.join(dir, 'packs');
    fs.mkdirSync(path.join(root, 'demo'), { recursive: true });
    fs.writeFileSync(path.join(root, 'demo', 'skip-me.txt'), 'not-a-pack');
    fs.mkdirSync(path.join(root, 'demo', 'sample', 'v1'), { recursive: true });
    fs.writeFileSync(path.join(root, 'demo', 'sample', 'v1', 'pack.json'), '{');
    const badPack = validateReferencePolicies({ root, repoRoot });
    expect(badPack.ok).toBe(false);

    const templateSrc = path.join(__dirname, 'reference-policies/templates/minimal-required/v1');
    const goodRoot = path.join(dir, 'good');
    const packDir = path.join(goodRoot, 'templates', 'minimal-required', 'v1');
    fs.cpSync(templateSrc, packDir, { recursive: true });
    const manifest = JSON.parse(fs.readFileSync(path.join(packDir, 'pack.json'), 'utf-8'));
    delete manifest.summary;
    manifest.name = 'wrong-name';
    manifest.version = 99;
    fs.writeFileSync(path.join(packDir, 'pack.json'), JSON.stringify(manifest));
    const mismatch = validateReferencePolicies({ root: goodRoot, repoRoot });
    expect(mismatch.ok).toBe(false);
    expect(mismatch.messages.join('\n')).toMatch(/display_name and summary/);
    expect(mismatch.messages.join('\n')).toMatch(/domain\/name\/version/);
  });

  it('accepts empty attestations and skips unreadable fixture payloads', () => {
    const templateSrc = path.join(__dirname, 'reference-policies/templates/minimal-required/v1');
    const dir = tmpDir('ip-ref6-');
    const packDir = path.join(dir, 'templates', 'minimal-required', 'v1');
    fs.cpSync(templateSrc, packDir, { recursive: true });
    fs.writeFileSync(path.join(packDir, 'fixtures/happy-path/attestations.jsonl'), '');
    fs.writeFileSync(path.join(packDir, 'fixtures/happy-path/flow.json'), '{');
    const result = validateReferencePolicies({
      root: path.join(dir, 'templates'),
      repoRoot: __dirname,
    });
    expect(result.ok).toBe(false);
  });

  it('runs reference policies CLI', () => {
    expect(runValidateReferencePoliciesCli()).toBe(0);
  });
});

describe('agent manifest and webhook pass paths', () => {
  it('reports pass for skipped fixtures and successful projection', () => {
    const dir = tmpDir('ip-am2-');
    const cases = path.join(dir, 'cases.jsonl');
    fs.writeFileSync(
      cases,
      [
        JSON.stringify({ shouldValidate: false, source_bundle: {} }),
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
          agent_manifest: {
            schema: 'intentproof.agent_manifest.v1',
            bundle_sha256: 'sha256:placeholder',
          },
        }),
      ].join('\n') + '\n',
    );
    expect(runAgentManifestTests(cases).ok).toBe(false);
  });

  it('reports pass when webhook signature verifies', () => {
    const dir = tmpDir('ip-wh2-');
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    const pubPath = path.join(dir, 'webhook.pem');
    fs.writeFileSync(pubPath, publicKey.export({ type: 'spki', format: 'pem' }));
    const envelope: Record<string, unknown> = {
      schema: 'intentproof.webhook_finding.v1',
      finding_id: 'f1',
      signature: {
        alg: 'ed25519',
        key_id: 'platform@webhook-signer-2026q2',
        value: '',
      },
    };
    const signed = JSON.parse(JSON.stringify(envelope)) as Record<string, unknown>;
    delete signed.signature;
    const sig = crypto.sign(null, Buffer.from(canonicalize(signed)), privateKey);
    (envelope.signature as Record<string, unknown>).value = sig.toString('base64');
    const cases = path.join(dir, 'cases.jsonl');
    fs.writeFileSync(
      cases,
      JSON.stringify({ shouldValidate: true, webhook_finding: envelope }) + '\n',
    );
    const result = runWebhookFindingTests(cases, pubPath);
    expect(result.ok).toBe(true);
    expect(result.messages.join('\n')).toMatch(/signature verified/);
  });
});

describe('generateManifest CLI failure path', () => {
  it('logs errors when generation fails via CLI wrapper', () => {
    const dir = tmpDir('ip-gen4-');
    fs.mkdirSync(path.join(dir, 'schema'));
    fs.writeFileSync(path.join(dir, 'schema/a.json'), '{}');
    const { publicKey } = crypto.generateKeyPairSync('ed25519');
    const publicKeyPath = path.join(dir, 'pub.pem');
    fs.writeFileSync(publicKeyPath, publicKey.export({ type: 'spki', format: 'pem' }));
    const result = generateManifest({
      projectRoot: dir,
      publicKeyPath,
      privateKeyPath: path.join(dir, 'priv.pem'),
      manifestPath: path.join(dir, 'manifest.json'),
      sigPath: path.join(dir, 'manifest.sig'),
      generateIfMissing: false,
    });
    expect(result.ok).toBe(false);
  });
});
