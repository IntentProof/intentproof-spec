import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { canonicalize } from 'json-canonicalize';

type FixtureManifest = {
  id: string;
  description: string;
  flow: string;
  attestations: string;
  expected_run: string;
};

type PackManifest = {
  schema: string;
  reference_id: string;
  domain: string;
  name: string;
  version: number;
  display_name: string;
  summary: string;
  policy: string;
  fixtures: FixtureManifest[];
};

const root = __dirname;
const repoRoot = path.join(root, '..');
const schemaDir = path.join(repoRoot, 'schema');
const ajv = new Ajv({ strict: false, allowUnionTypes: true });
addFormats(ajv);

for (const file of fs.readdirSync(schemaDir).filter((f) => f.endsWith('.json'))) {
  const schema = JSON.parse(fs.readFileSync(path.join(schemaDir, file), 'utf-8'));
  ajv.addSchema(schema, file);
}

const policySchema = ajv.getSchema('policy.v1.schema.json');
const flowSchema = ajv.getSchema('flow.v1.schema.json');
const runSchema = ajv.getSchema('run.v1.schema.json');

if (!policySchema || !flowSchema || !runSchema) {
  throw new Error('required schemas failed to load');
}
const validatePolicySchema = policySchema;
const validateFlowSchema = flowSchema;
const validateRunSchema = runSchema;

let hasError = false;
const referenceIDs = new Set<string>();

function fail(message: string): void {
  console.error(`[FAIL] ${message}`);
  hasError = true;
}

function readJSON(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function requireFile(packDir: string, relPath: string): string {
  const resolved = path.resolve(packDir, relPath);
  if (!resolved.startsWith(path.resolve(packDir) + path.sep)) {
    fail(`path escapes pack directory: ${relPath}`);
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    fail(`missing required file: ${path.relative(root, resolved)}`);
  }
  return resolved;
}

function computePolicyFingerprint(policy: Record<string, unknown>): string {
  const copy = JSON.parse(JSON.stringify(policy)) as Record<string, unknown>;
  delete copy.policy_fingerprint;
  delete copy.signed_at;
  delete copy.signature;
  return 'sha256:' + crypto.createHash('sha256').update(canonicalize(copy)).digest('hex');
}

function validateAttestationsJSONL(filePath: string): void {
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  if (raw === '') {
    return;
  }
  raw.split('\n').forEach((line, index) => {
    try {
      JSON.parse(line);
    } catch {
      fail(`${path.relative(root, filePath)}:${index + 1} is not valid JSON`);
    }
  });
}

function validateSchema(
  label: string,
  value: unknown,
  validate: typeof validatePolicySchema,
): void {
  if (!validate(value)) {
    fail(`${label} failed schema validation: ${ajv.errorsText(validate.errors)}`);
  }
}

function validatePack(packDir: string, domain: string, name: string, versionDir: string): void {
  const manifestPath = path.join(packDir, 'pack.json');
  if (!fs.existsSync(manifestPath)) {
    fail(`missing pack.json in ${path.relative(root, packDir)}`);
    return;
  }

  const manifest = readJSON(manifestPath) as PackManifest;
  const version = Number(versionDir.slice(1));
  const expectedID = `reference.${domain}.${name}.v${version}`;

  if (manifest.schema !== 'intentproof.reference_policy_pack.v1') {
    fail(`${expectedID}: pack.json schema must be intentproof.reference_policy_pack.v1`);
  }
  if (manifest.reference_id !== expectedID) {
    fail(`${expectedID}: reference_id must match directory-derived ID`);
  }
  if (manifest.domain !== domain || manifest.name !== name || manifest.version !== version) {
    fail(`${expectedID}: domain/name/version must match directory path`);
  }
  if (!manifest.display_name || !manifest.summary) {
    fail(`${expectedID}: display_name and summary are required`);
  }
  if (referenceIDs.has(manifest.reference_id)) {
    fail(`${expectedID}: duplicate reference_id`);
  }
  referenceIDs.add(manifest.reference_id);

  requireFile(packDir, 'README.md');
  const policyPath = requireFile(packDir, manifest.policy);
  const policy = readJSON(policyPath) as Record<string, unknown>;
  validateSchema(`${expectedID} policy.json`, policy, validatePolicySchema);
  if (policy.policy_id !== expectedID || policy.policy_version !== version) {
    fail(`${expectedID}: policy_id and policy_version must match pack identity`);
  }
  const computed = computePolicyFingerprint(policy);
  if (policy.policy_fingerprint !== computed) {
    fail(`${expectedID}: policy_fingerprint must be ${computed}`);
  }

  if (!Array.isArray(manifest.fixtures) || manifest.fixtures.length === 0) {
    fail(`${expectedID}: at least one fixture is required`);
    return;
  }

  const fixtureIDs = new Set<string>();
  for (const fixture of manifest.fixtures) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fixture.id)) {
      fail(`${expectedID}: fixture id must be kebab-case: ${fixture.id}`);
    }
    if (fixtureIDs.has(fixture.id)) {
      fail(`${expectedID}: duplicate fixture id ${fixture.id}`);
    }
    fixtureIDs.add(fixture.id);

    const expectedPrefix = `fixtures/${fixture.id}/`;
    for (const relPath of [fixture.flow, fixture.attestations, fixture.expected_run]) {
      if (!relPath.startsWith(expectedPrefix)) {
        fail(`${expectedID}: fixture file ${relPath} must live under ${expectedPrefix}`);
      }
    }

    const flowPath = requireFile(packDir, fixture.flow);
    const attestationsPath = requireFile(packDir, fixture.attestations);
    const expectedRunPath = requireFile(packDir, fixture.expected_run);

    const flow = readJSON(flowPath) as Record<string, unknown>;
    const expectedRun = readJSON(expectedRunPath) as Record<string, unknown>;
    validateSchema(`${expectedID}/${fixture.id} flow.json`, flow, validateFlowSchema);
    validateSchema(`${expectedID}/${fixture.id} expected-run.json`, expectedRun, validateRunSchema);
    validateAttestationsJSONL(attestationsPath);

    if (expectedRun.policy_id !== policy.policy_id ||
        expectedRun.policy_version !== policy.policy_version ||
        expectedRun.policy_fingerprint !== policy.policy_fingerprint) {
      fail(`${expectedID}/${fixture.id}: expected run policy fields must match policy.json`);
    }
    if (expectedRun.flow_id !== flow.flow_id || expectedRun.tenant_id !== flow.tenant_id) {
      fail(`${expectedID}/${fixture.id}: expected run must reference fixture flow and tenant`);
    }
  }

  console.log(`[PASS] ${expectedID}`);
}

for (const domain of fs.readdirSync(root)) {
  const domainPath = path.join(root, domain);
  if (!fs.statSync(domainPath).isDirectory() || domain.startsWith('.')) {
    continue;
  }
  for (const name of fs.readdirSync(domainPath)) {
    const namePath = path.join(domainPath, name);
    if (!fs.statSync(namePath).isDirectory()) {
      continue;
    }
    for (const versionDir of fs.readdirSync(namePath)) {
      const packDir = path.join(namePath, versionDir);
      if (!fs.statSync(packDir).isDirectory() || !/^v[1-9][0-9]*$/.test(versionDir)) {
        continue;
      }
      validatePack(packDir, domain, name, versionDir);
    }
  }
}

if (referenceIDs.size === 0) {
  fail('no reference policy packs found');
}

if (hasError) {
  process.exit(1);
}

console.log(`Reference policy validation passed (${referenceIDs.size} pack(s)).`);
