import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { computePolicyFingerprint } from './policy_fingerprint';
import { delegationAttributeViolation } from './delegation_attributes';

export function collectGoldenCaseFiles(dir: string): string[] {
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

export function resolveSchemaFile(schemaBase: string, schemaFiles: string[]): string | undefined {
  return schemaFiles.find(
    (f) => f.startsWith(schemaBase) || f.startsWith(schemaBase.replace('_', '-')),
  );
}

export function isExecutionEventSchema(schemaFile: string): boolean {
  return schemaFile.startsWith('execution_event');
}

export type RunConformanceOptions = {
  schemaDir?: string;
  goldenDir?: string;
};

export function runConformance(options: RunConformanceOptions = {}): { ok: boolean; messages: string[] } {
  const messages: string[] = [];
  let hasError = false;
  const schemaDir = options.schemaDir ?? path.join(__dirname, '../schema');
  const goldenDir = options.goldenDir ?? path.join(__dirname, '../golden');

  const ajv = new Ajv({ strict: false, allowUnionTypes: true });
  addFormats(ajv);

  const schemaFiles = fs.readdirSync(schemaDir).filter((f) => f.endsWith('.json'));
  for (const file of schemaFiles) {
    const schemaPath = path.join(schemaDir, file);
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    if (schema.$id && !ajv.getSchema(schema.$id)) {
      ajv.addSchema(schema, file);
    }
  }

  const goldenFiles = collectGoldenCaseFiles(goldenDir);

  for (const goldenPath of goldenFiles) {
    const file = path.relative(goldenDir, goldenPath).split(path.sep).join('/');
    const schemaNameMatch = path.basename(goldenPath).match(/^(.*)_cases\.jsonl$/);
    if (!schemaNameMatch) {
      continue;
    }
    const schemaBase = schemaNameMatch[1];

    const schemaFile = resolveSchemaFile(schemaBase, schemaFiles);
    if (!schemaFile) {
      messages.push(`[WARN] No schema found for golden file ${file}`);
      continue;
    }

    const validate = ajv.getSchema(schemaFile);
    if (!validate) {
      messages.push(`[ERROR] AJV did not compile schema ${schemaFile}`);
      hasError = true;
      continue;
    }

    const checkDelegation = isExecutionEventSchema(schemaFile);
    const lines = fs.readFileSync(goldenPath, 'utf-8').split('\n').filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let fixture: Record<string, unknown>;
      try {
        fixture = JSON.parse(line);
      } catch {
        messages.push(`[FAIL] ${file}:${i + 1} Invalid JSON`);
        hasError = true;
        continue;
      }

      const keys = Object.keys(fixture).filter((k) => k !== 'shouldValidate');
      const objectToValidate = fixture[keys[0]] as Record<string, unknown>;

      let valid = validate(objectToValidate) === true;
      if (valid && checkDelegation) {
        const violation = delegationAttributeViolation(objectToValidate?.attributes);
        if (violation) {
          valid = false;
          messages.push(`[INFO] ${file}:${i + 1} delegation oracle: ${violation}`);
        }
      }

      if (valid !== fixture.shouldValidate) {
        messages.push(`[FAIL] ${file}:${i + 1} Expected valid=${fixture.shouldValidate}, got ${valid}`);
        if (validate.errors) {
          messages.push(JSON.stringify(validate.errors));
        }
        hasError = true;
      } else {
        messages.push(`[PASS] ${file}:${i + 1} valid=${fixture.shouldValidate}`);
      }

      if (fixture.shouldValidate && valid && file === 'policy_cases.jsonl') {
        if (!objectToValidate.policy_fingerprint) {
          messages.push(`[FAIL] ${file}:${i + 1} policy_fingerprint is missing or empty`);
          hasError = true;
        } else {
          const expected = computePolicyFingerprint(objectToValidate);
          if (objectToValidate.policy_fingerprint !== expected) {
            messages.push(
              `[FAIL] ${file}:${i + 1} Fingerprint mismatch: expected ${expected}, got ${objectToValidate.policy_fingerprint}`,
            );
            hasError = true;
          } else {
            messages.push(`[PASS] ${file}:${i + 1} fingerprint verified`);
          }
        }
      }
    }
  }

  if (!hasError) {
    messages.push('All conformance checks passed.');
  }
  return { ok: !hasError, messages };
}

export function runConformanceCli(): number {
  const result = runConformance();
  for (const msg of result.messages) {
    console.log(msg);
  }
  return result.ok ? 0 : 1;
}

/* v8 ignore start */
if (require.main === module) {
  process.exit(runConformanceCli());
}
/* v8 ignore stop */
