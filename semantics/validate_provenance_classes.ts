import * as fs from 'fs';
import * as path from 'path';

export const EXPECTED_PROVENANCE_CLASSES = [
  'platform_attested',
  'source_attested',
  'sdk_attested_evidence',
  'customer_supplied_payload',
  'non_authoritative_summary',
] as const;

export const SCHEMA_PROVENANCE_EXPECTATIONS: Record<string, string> = {
  'attestation.v1.schema.json': 'source_attested',
  'certificate.v1.schema.json': 'platform_attested',
  'execution_event.v1.schema.json': 'sdk_attested_evidence',
  'finding.v1.schema.json': 'platform_attested',
  'flow.v1.schema.json': 'platform_attested',
  'policy.v1.schema.json': 'platform_attested',
  'run.v1.schema.json': 'platform_attested',
};

export type ValidateProvenanceOptions = {
  provenancePath?: string;
  schemaDir?: string;
};

export function validateProvenanceClasses(
  options: ValidateProvenanceOptions = {},
): { ok: boolean; messages: string[] } {
  const messages: string[] = [];
  let hasError = false;
  const fail = (msg: string): void => {
    messages.push(`[FAIL] ${msg}`);
    hasError = true;
  };

  const provenancePath =
    options.provenancePath ?? path.join(__dirname, 'provenance_classes.json');
  const schemaDir = options.schemaDir ?? path.join(__dirname, '..', 'schema');

  const raw = fs.readFileSync(provenancePath, 'utf-8');
  const doc = JSON.parse(raw) as Record<string, unknown>;

  if (doc.schema !== 'intentproof.provenance_classes.v1') {
    fail('provenance_classes.json has an unexpected schema value');
  }

  if (typeof doc.version !== 'string' || doc.version.length === 0) {
    fail('provenance_classes.json must declare a non-empty version');
  }

  if (!Array.isArray(doc.classes)) {
    fail('provenance_classes.json must declare classes[]');
  } else {
    const values = doc.classes.map((entry) => {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        fail(`classes[] contains non-object entry: ${String(entry)}`);
        return '';
      }
      const rec = entry as Record<string, unknown>;
      if (typeof rec.value !== 'string' || rec.value.length === 0) {
        fail(`classes[] entry has invalid value: ${String(rec.value)}`);
        return '';
      }
      if (!Array.isArray(rec.labels)) {
        fail(`${rec.value} must declare labels[]`);
      }
      if (typeof rec.consumer_treatment !== 'string' || rec.consumer_treatment.length === 0) {
        fail(`${rec.value} must declare consumer_treatment`);
      }
      return rec.value;
    });

    const seen = new Set<string>();
    for (const value of values) {
      if (seen.has(value)) {
        fail(`Duplicate provenance class: ${value}`);
      }
      seen.add(value);
    }

    const expected = [...EXPECTED_PROVENANCE_CLASSES].sort();
    const actual = [...seen].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      fail(
        `Closed provenance class set mismatch: expected ${expected.join(', ')}, got ${actual.join(', ')}`,
      );
    }
  }

  for (const [schemaFile, expectedClass] of Object.entries(SCHEMA_PROVENANCE_EXPECTATIONS)) {
    const schemaPath = path.join(schemaDir, schemaFile);
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8')) as Record<string, unknown>;
    const properties = schema.properties as Record<string, unknown> | undefined;
    const provenance = properties?.provenance_class as Record<string, unknown> | undefined;
    if (!provenance) {
      fail(`${schemaFile} is missing properties.provenance_class`);
      continue;
    }
    if (provenance.const !== expectedClass) {
      fail(`${schemaFile} provenance_class const must be ${expectedClass}`);
    }
    if (provenance.default !== expectedClass) {
      fail(`${schemaFile} provenance_class default must be ${expectedClass}`);
    }
    const required = schema.required;
    if (!Array.isArray(required) || !required.includes('provenance_class')) {
      fail(`${schemaFile} must require provenance_class`);
    }
  }

  if (!hasError) {
    messages.push(
      `Validated ${EXPECTED_PROVENANCE_CLASSES.length} provenance classes across ${Object.keys(SCHEMA_PROVENANCE_EXPECTATIONS).length} signed schemas.`,
    );
  }
  return { ok: !hasError, messages };
}

export function runValidateProvenanceClassesCli(): number {
  const result = validateProvenanceClasses();
  for (const msg of result.messages) {
    console.log(msg);
  }
  return result.ok ? 0 : 1;
}

/* v8 ignore start */
if (require.main === module) {
  process.exit(runValidateProvenanceClassesCli());
}
/* v8 ignore stop */
