import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { canonicalize } from 'json-canonicalize';

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

let hasError = false;

// Validate golden cases
const goldenFiles = fs.readdirSync(goldenDir).filter(f => f.endsWith('.jsonl'));
for (const file of goldenFiles) {
  const schemaNameMatch = file.match(/^(.*)_cases\.jsonl$/);
  if (!schemaNameMatch) continue;
  const schemaBase = schemaNameMatch[1].replace('_', '-'); // Rough mapping
  
  // Find matching schema file
  const schemaFile = schemaFiles.find(f => f.startsWith(schemaNameMatch[1]) || f.startsWith(schemaBase));
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

  const lines = fs.readFileSync(path.join(goldenDir, file), 'utf-8').split('\n').filter(Boolean);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let fixture;
    try {
      fixture = JSON.parse(line);
    } catch (e) {
      console.error(`[FAIL] ${file}:${i+1} Invalid JSON`);
      hasError = true;
      continue;
    }
    
    // Extract the object to validate (first key that isn't shouldValidate)
    const keys = Object.keys(fixture).filter(k => k !== 'shouldValidate');
    const objectToValidate = fixture[keys[0]];
    
    const valid = validate(objectToValidate);
    if (valid !== fixture.shouldValidate) {
      console.error(`[FAIL] ${file}:${i+1} Expected valid=${fixture.shouldValidate}, got ${valid}`);
      if (validate.errors) console.error(validate.errors);
      hasError = true;
    } else {
      console.log(`[PASS] ${file}:${i+1} valid=${fixture.shouldValidate}`);
    }

    // For pass policies, verify JCS fingerprint consistency.
    if (fixture.shouldValidate && valid && file === 'policy_cases.jsonl') {
      if (!objectToValidate.policy_fingerprint) {
        console.error(`[FAIL] ${file}:${i+1} policy_fingerprint is missing or empty`);
        hasError = true;
      } else {
        const copy = JSON.parse(JSON.stringify(objectToValidate));
        delete copy.policy_fingerprint;
        delete copy.signed_at;
        delete copy.signature;
        const canonical = canonicalize(copy);
        const expected = 'sha256:' + crypto.createHash('sha256').update(canonical).digest('hex');
        if (objectToValidate.policy_fingerprint !== expected) {
          console.error(`[FAIL] ${file}:${i+1} Fingerprint mismatch: expected ${expected}, got ${objectToValidate.policy_fingerprint}`);
          hasError = true;
        } else {
          console.log(`[PASS] ${file}:${i+1} fingerprint verified`);
        }
      }
    }
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log("All conformance checks passed.");
}
