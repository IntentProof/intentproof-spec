# Serialization Rules (v1)

Values captured into `ExecutionEvent.inputs` and `ExecutionEvent.output` MUST round-trip through JSON (`JSON.stringify` / `json.dumps` / Jackson `writeValueAsString`) without changing the logical event contract. This document normatively constrains that projection.

## Permitted JSON types

- `null`, `boolean`, `number` (finite IEEE-754), `string`, `array`, `object`.
- Non-finite numbers (`NaN`, `±Infinity`) MUST become JSON `null` in cross-language fixtures (see `golden/execution_event_cases.jsonl`).
- `bigint` / `BigInteger` MUST stringify as decimal digits without scientific notation **or** be rejected from capture with a documented sentinel; SDKs MUST pick one policy and apply it uniformly in conformance tests.

## Depth and size

- Respect `IntentProofConfig.serialization.maxDepth` when traversing nested structures; beyond the limit, replace subtrees with `"[MaxDepth]"` or an empty object—SDKs MUST document the chosen sentinel; golden fixtures stay within default limits.
- Respect `maxStringLength` by truncating with a stable suffix marker such as `"[Truncated]"`.

## Redaction

- Keys listed in `serialization.redactKeys` MUST be matched case-insensitively; matched values serialize as the string `"[REDACTED]"`.

## Dates and temporal types

- Serialize instants as RFC 3339 UTC with millisecond precision and `Z` suffix unless an explicit offset is preserved end-to-end.

## Opaque / host types

- Functions, symbols, weak references, threads, streams, and other non-JSON host values MUST be replaced with a stable string token such as `"[UnsupportedType:<name>]"` including the best-effort type name, never silently dropped unless `captureInputs` / `captureOutput` is false.

## Attributes vs inputs/output

- `attributes` MUST remain flat primitives only (see `schema/execution_event.v1.schema.json`). Rich structures belong in `inputs` / `output` under the rules above.

## Canonical JSON projection (normative)

For **cross-SDK conformance**, any JSON value that participates in byte-identical checks (including full `ExecutionEvent` documents) MUST be projected through a single canonical form so that all languages agree after UTF-8 encoding.

**Algorithm** (reference implementation: `tools/canonical/canonical-json.ts`; manifest entry `spec.json` → `tools.canonical_json`):

1. **Sort keys** at every object depth: walk the value recursively; for each JSON object, emit a new object whose keys are the sorted lexicographic list of the original keys (Unicode code unit order as in ECMAScript `Array.prototype.sort` on strings). Arrays preserve element order; nested structures recurse.
2. **Serialize** the sorted value with compact JSON: `JSON.stringify` with no added whitespace (same output shape as ECMA-262 `JSON.stringify` for the sorted structure).
3. **Terminate** the document with exactly one line feed character (`U+000A`) after the closing token.

The octet sequence is compared **verbatim**. Golden vectors live in `golden/canonicalization_cases.jsonl` (see `spec.json` → `goldens.canonicalization`). SDKs MUST implement this algorithm in native code or delegate to a shared library; hand-written “pretty print” JSON is non-conforming for oracle comparisons.

This canonical projection applies **after** capture-time serialization rules above (e.g. redaction, depth limits) have produced a pure JSON value.
