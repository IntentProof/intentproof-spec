import * as fs from 'fs';
import * as path from 'path';

// Validator for semantics/reasons.json.
//
// Asserts:
//   1. The file parses as JSON.
//   2. Every reason entry has the required fields (code, category,
//      description).
//   3. Every category is one of the closed vocabulary kinds (DSL rule kinds
//      plus evaluator-only buckets such as "unknown").
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
  'unknown',
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
const vocabularyCategories = new Set<string>();

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
  vocabularyCategories.add(category);
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

// Cross-check finding.v1.schema.json reason enum matches vocabulary exactly.
const findingSchemaPath = path.join(
  __dirname,
  '..',
  'schema',
  'finding.v1.schema.json',
);
let findingRaw = '';
let findingSchemaReadOk = false;
try {
  findingRaw = fs.readFileSync(findingSchemaPath, 'utf-8');
  findingSchemaReadOk = true;
} catch (e) {
  fail(`Unable to read ${findingSchemaPath}: ${(e as Error).message}`);
}
if (findingSchemaReadOk) {
  let findingDoc: unknown;
  try {
    findingDoc = JSON.parse(findingRaw);
  } catch (e) {
    fail(`finding.v1.schema.json is not valid JSON: ${(e as Error).message}`);
  }
  if (typeof findingDoc !== 'object' || findingDoc === null) {
    fail('finding.v1.schema.json must be an object');
  } else {
    const props = (findingDoc as Record<string, unknown>).properties;
    if (typeof props !== 'object' || props === null) {
      fail('finding.v1.schema.json missing properties');
    } else {
      const reasonProp = (props as Record<string, unknown>).reason;
      if (typeof reasonProp !== 'object' || reasonProp === null) {
        fail('finding.v1.schema.json missing reason property');
      } else {
        const en = (reasonProp as Record<string, unknown>).enum;
        if (!Array.isArray(en)) {
          fail('finding.v1.schema.json reason must have enum array');
        } else {
          const schemaCodes = new Set<string>();
          for (const c of en) {
            if (typeof c !== 'string') {
              fail('finding reason enum contains non-string');
            } else {
              schemaCodes.add(c);
            }
          }
          for (const c of seenCodes) {
            if (!schemaCodes.has(c)) {
              fail(
                `reason code '${c}' is in reasons.json but missing from finding.v1.schema.json enum`,
              );
            }
          }
          for (const c of schemaCodes) {
            if (!seenCodes.has(c)) {
              fail(
                `reason code '${c}' is in finding.v1.schema.json enum but missing from reasons.json`,
              );
            }
          }
        }
      }
      const ruleCatProp = (props as Record<string, unknown>).rule_category;
      if (typeof ruleCatProp !== 'object' || ruleCatProp === null) {
        fail('finding.v1.schema.json missing rule_category property');
      } else {
        const rcEnum = (ruleCatProp as Record<string, unknown>).enum;
        if (!Array.isArray(rcEnum)) {
          fail('finding.v1.schema.json rule_category must have enum array');
        } else {
          const ruleCategorySchema = new Set<string>();
          for (const c of rcEnum) {
            if (typeof c !== 'string') {
              fail('finding rule_category enum contains non-string');
            } else {
              ruleCategorySchema.add(c);
            }
          }
          for (const c of vocabularyCategories) {
            if (!ruleCategorySchema.has(c)) {
              fail(
                `reasons vocabulary category '${c}' missing from finding.v1.schema.json rule_category enum`,
              );
            }
          }
        }
      }
    }
  }
}

if (hasError) {
  console.error('reasons.json validation failed.');
  process.exit(1);
}

console.log(
  `reasons.json: ${reasons.length} entries, ${seenCodes.size} unique codes, ${goldenReasonCodes.size} golden refs; finding schema reason + rule_category parity OK.`,
);
