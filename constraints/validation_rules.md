# Validation Rules (v1)

## JSON Schema gate

SDKs MUST validate serialized events with `schema/execution_event.v1.schema.json` using a Draft 2020-12 compatible validator (Ajv v8+, equivalent in other languages).

Schema files declare `"$id"` under `https://intentproof.dev/schema/…` as a **logical document identifier** for validators; the **normative** bytes are the files in the [IntentProof specification repository (`intentproof-spec`)](https://github.com/IntentProof/intentproof-spec) under `schema/` (see README for raw GitHub URLs). Do not assume that `$id` dereferences to a live HTTP response.

## Serialization rules

Normative detail lives in `semantics/serialization_rules.md`.

### Allowed JSON types for `inputs` and `output`

- `null`, `boolean`, `number`, `string`, `array`, `object` where nested structures respect `IntentProofConfig.serialization.maxDepth`.
- `number` MUST be finite; `NaN` and infinities MUST be replaced with `null` or string sentinel `"[NonFiniteNumber]"`—**pick one per SDK and document**; conformance golden uses `null` for non-finite.
- `bigint` (Node/Java) MUST stringify to decimal string or reject capture—golden uses string decimal when present in fixtures.
- Functions, symbols, weak collections, and host objects without JSON projection MUST be omitted or replaced with `"[UnsupportedType:<name>]"` consistently.

### Strings

- Truncate per `maxStringLength` with documented suffix `…` or `"[Truncated]"` at end—golden fixtures stay under limits.

### Redaction

- Keys listed in `serialization.redactKeys` MUST have values replaced with the string `"[REDACTED]"` (case-insensitive key match).

### Dates

- Serialize as RFC 3339 UTC with `Z` suffix **or** explicit offset; golden files use millisecond precision UTC `Z`.

### Binary

- Encode as base64 string with prefix `"base64:"` or reject; golden uses `"base64:AQID"` style for samples.

## Post-schema semantic validators

After Ajv validation succeeds, SDKs SHOULD run the reference checks implemented in `tests/conformance/semantics_validation.test.ts` (port the logic to each language).

## Wrap options validation

Merge defaults then validate merged object against `schema/wrap_options.v1.schema.json` for keys actually present—full object validation when static config is used.
