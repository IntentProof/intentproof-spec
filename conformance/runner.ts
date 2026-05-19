import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { computePolicyFingerprint } from './policy_fingerprint';
import { delegationAttributeViolation } from './delegation_attributes';

const ajv = new Ajv({ strict: false, allowUnionTypes: true });
addFormats(ajv);

const schemaDir = path.join(__dirname, '../schema');
const goldenDir = path.join(__dirname, '../golden');

// Load schemas
const schemaFiles = fs.readdirSync(schemaDir).filter(f => f.endsWith('.json'));
for (const file of schemaFiles) {
  const schemaPath = path.join(schemaDir, file);
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  if (schema.$id && !ajv.getSchema(schema.$id)) {
    ajv.addSchema(schema, file);
  }
}

function collectGoldenCaseFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectGoldenCaseFiles(full));
    } else if (entry.name.endsWith('_cases.jsonl')) {
      results.push(full);
    }
  }
  return results.sort();
}

function resolveSchemaFile(schemaBase: string): string | undefined {
  return schemaFiles.find(
    (f) => f.startsWith(schemaBase) || f.startsWith(schemaBase.replace('_', '-'))
  );
}

function isExecutionEventSchema(schemaFile: string): boolean {
  return schemaFile.startsWith('execution_event');
}

let hasError = false;

const goldenFiles = collectGoldenCaseFiles(goldenDir);

for (const goldenPath of goldenFiles) {
  const file = path.relative(goldenDir, goldenPath).split(path.sep).join('/');
  const schemaNameMatch = path.basename(goldenPath).match(/^(.*)_cases\.jsonl$/);
  if (!schemaNameMatch) continue;
  const schemaBase = schemaNameMatch[1];

  const schemaFile = resolveSchemaFile(schemaBase);
  if (!schemaFile) {
    console.error(`[WARN] No schema found for golden file ${file}`);
    continue;
  }

  const validate = ajv.getSchema(schemaFile);
  if (!validate) {
    console.error(`[ERROR] AJV did not compile schema ${schemaFile}`);
    hasError = true;
    continue;
  }

  const checkDelegation = isExecutionEventSchema(schemaFile);
  const lines = fs.readFileSync(goldenPath, 'utf-8').split('\n').filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let fixture;
    try {
      fixture = JSON.parse(line);
    } catch {
      console.error(`[FAIL] ${file}:${i + 1} Invalid JSON`);
      hasError = true;
      continue;
    }

    const keys = Object.keys(fixture).filter(k => k !== 'shouldValidate');
    const objectToValidate = fixture[keys[0]];

    let valid = validate(objectToValidate) === true;
    if (valid && checkDelegation) {
      const violation = delegationAttributeViolation(objectToValidate?.attributes);
      if (violation) {
        valid = false;
        console.error(`[INFO] ${file}:${i + 1} delegation oracle: ${violation}`);
      }
    }

    if (valid !== fixture.shouldValidate) {
      console.error(`[FAIL] ${file}:${i + 1} Expected valid=${fixture.shouldValidate}, got ${valid}`);
      if (validate.errors) console.error(validate.errors);
      hasError = true;
    } else {
      console.log(`[PASS] ${file}:${i + 1} valid=${fixture.shouldValidate}`);
    }

    if (fixture.shouldValidate && valid && file === 'policy_cases.jsonl') {
      if (!objectToValidate.policy_fingerprint) {
        console.error(`[FAIL] ${file}:${i + 1} policy_fingerprint is missing or empty`);
        hasError = true;
      } else {
        const expected = computePolicyFingerprint(objectToValidate);
        if (objectToValidate.policy_fingerprint !== expected) {
          console.error(`[FAIL] ${file}:${i + 1} Fingerprint mismatch: expected ${expected}, got ${objectToValidate.policy_fingerprint}`);
          hasError = true;
        } else {
          console.log(`[PASS] ${file}:${i + 1} fingerprint verified`);
        }
      }
    }
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log('All conformance checks passed.');
}
