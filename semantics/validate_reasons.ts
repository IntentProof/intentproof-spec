import * as fs from 'fs';
import * as path from 'path';

// Validator for semantics/reasons.json.
//
// Asserts:
//   1. The file parses as JSON.
//   2. Every reason entry has the required fields (code, category,
//      description).
//   3. Every category is one of the eight closed rule kinds.
//   4. Reason codes are unique.
//   5. Reason codes start with "<outcome>." where outcome is one of
//      pass | fail | inconclusive.
//   6. Every reason code used in golden/*.jsonl fixtures appears in
//      the vocabulary.
//
// This script is invoked from `npm test` so the vocabulary cannot
// drift from goldens without CI noticing.

const ALLOWED_CATEGORIES = new Set([
  'required',
  'forbidden',
  'ordering',
  'cardinality',
  'temporal',
  'consensus',
  'value_bound',
  'claim_match',
]);

const ALLOWED_OUTCOMES = new Set(['pass', 'fail', 'inconclusive']);
const ALLOWED_SEVERITIES = new Set([
  'critical',
  'high',
  'medium',
  'low',
  'info',
]);

const reasonsPath = path.join(__dirname, 'reasons.json');
const goldenDir = path.join(__dirname, '..', 'golden');

let hasError = false;
const fail = (msg: string): void => {
  console.error(`[FAIL] ${msg}`);
  hasError = true;
};

let raw: string;
try {
  raw = fs.readFileSync(reasonsPath, 'utf-8');
} catch (e) {
  fail(`Unable to read ${reasonsPath}: ${(e as Error).message}`);
  process.exit(1);
}

let doc: unknown;
try {
  doc = JSON.parse(raw);
} catch (e) {
  fail(`reasons.json is not valid JSON: ${(e as Error).message}`);
  process.exit(1);
}

if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
  fail('reasons.json must be a JSON object at the top level');
  process.exit(1);
}

const rec = doc as Record<string, unknown>;
const reasons = rec.reasons;
if (!Array.isArray(reasons)) {
  fail('reasons.json must have a "reasons" array');
  process.exit(1);
}

const declaredCategories = rec.categories;
if (Array.isArray(declaredCategories)) {
  for (const c of declaredCategories) {
    if (typeof c !== 'string' || !ALLOWED_CATEGORIES.has(c)) {
      fail(`categories[] contains unknown category: ${String(c)}`);
    }
  }
}

const seenCodes = new Set<string>();
const codeToCategory = new Map<string, string>();

for (let i = 0; i < reasons.length; i++) {
  const entry = reasons[i];
  const where = `reasons[${i}]`;
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    fail(`${where} is not an object`);
    continue;
  }
  const e = entry as Record<string, unknown>;
  const code = e.code;
  const category = e.category;
  const description = e.description;
  const severityHint = e.severity_hint;

  if (typeof code !== 'string' || code.length === 0) {
    fail(`${where}.code is missing or not a non-empty string`);
    continue;
  }
  if (typeof category !== 'string') {
    fail(`${where}.category is missing or not a string (code=${code})`);
    continue;
  }
  if (typeof description !== 'string' || description.length === 0) {
    fail(`${where}.description is missing or empty (code=${code})`);
  }
  if (!ALLOWED_CATEGORIES.has(category)) {
    fail(`${where}.category '${category}' not in closed set (code=${code})`);
  }
  if (seenCodes.has(code)) {
    fail(`duplicate reason code: ${code}`);
  } else {
    seenCodes.add(code);
    codeToCategory.set(code, category);
  }

  const prefix = code.split('.')[0];
  if (!ALLOWED_OUTCOMES.has(prefix)) {
    fail(`${code} does not start with pass./fail./inconclusive.`);
  }

  const parts = code.split('.');
  if (parts.length < 3) {
    fail(`${code} should be of the form <outcome>.<category>.<specifier>`);
  } else if (parts[1] !== category) {
    fail(
      `${code} second segment '${parts[1]}' must equal category '${category}'`,
    );
  }

  if (severityHint !== undefined) {
    if (
      typeof severityHint !== 'string' ||
      !ALLOWED_SEVERITIES.has(severityHint)
    ) {
      fail(`${where}.severity_hint '${String(severityHint)}' is not valid`);
    }
  }
}

// Cross-check against goldens: every reason code referenced in
// golden/*.jsonl must exist in the vocabulary.
const goldenReasonCodes = new Set<string>();
if (fs.existsSync(goldenDir)) {
  const files = fs.readdirSync(goldenDir).filter((f) => f.endsWith('.jsonl'));
  const reasonRegex = /"reason"\s*:\s*"([^"]+)"/g;
  for (const f of files) {
    const content = fs.readFileSync(path.join(goldenDir, f), 'utf-8');
    let m: RegExpExecArray | null;
    while ((m = reasonRegex.exec(content)) !== null) {
      goldenReasonCodes.add(m[1]);
    }
  }
}

for (const code of goldenReasonCodes) {
  if (!seenCodes.has(code)) {
    fail(`reason code '${code}' is used in goldens but missing from reasons.json`);
  }
}

if (hasError) {
  console.error('reasons.json validation failed.');
  process.exit(1);
}

console.log(
  `reasons.json: ${reasons.length} entries, ${seenCodes.size} unique codes, ${goldenReasonCodes.size} golden references cross-checked.`,
);
