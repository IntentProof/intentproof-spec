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
