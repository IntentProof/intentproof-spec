# Correlation Rules (v1)

Correlation ties multiple `ExecutionEvent` records into a single logical trace while preserving nesting semantics.

## Identifier format

- `correlationId` MUST be a non-empty string consisting of printable ASCII without leading or trailing whitespace (trimmed).
- Recommended pattern: UUID v4 in lowercase hex with hyphens (`8-4-4-4-12`).
- When inbound headers or foreign systems supply identifiers, SDKs MUST trim ASCII whitespace (`\t`, `\n`, `\r`, ` `) from both ends. If the result is empty, treat as missing.

## Generation

- When no active correlation exists and `IntentProofConfig.correlation.generateOnMissing` is true (default), generate a fresh UUID v4.
- When generation is disabled and no correlation exists, omit `correlationId` from the event **or** omit the field entirely; the schema treats the field as optional. SDKs MUST NOT emit `"correlationId": ""`.

## Propagation

### Node.js

- Use `AsyncLocalStorage` (or equivalent async context) keyed by the IntentProof module. Enter a new store frame for each wrap boundary carrying `{ correlationId }`. Inner wraps read the same frame unless they explicitly start a new correlation scope (not defined in v1—SDKs MUST NOT fork correlation implicitly).

### Python

- Use `contextvars.ContextVar` for `correlation_id`. Mutations MUST be scoped via `ContextVar.set` token reset in `finally` blocks tied to the wrap boundary.

### Java

- Use `ThreadLocal` for synchronous code. For virtual threads / structured concurrency, use `ScopedValue` where available with the same lexical scoping as the wrap; otherwise document equivalent safe propagation. Inner synchronous calls on the same thread inherit the value until cleared.

## Nesting precedence

- Outer wrap establishes correlation unless the inner wrap explicitly sets a new correlation (application-level API not mandated in v1). Default inner inherits outer.
- Attributes from outer and inner merges: **inner wins** on duplicate keys.

## Validation before emit

- If `correlationId` is present, it MUST be `trim(value).length > 0`.
- Invalid values MUST be replaced by UUID fallback when `generateOnMissing` is true; otherwise dropped.

## HTTP bridging

- When extracting from HTTP, read header name from `IntentProofConfig.correlation.headerName` (default `x-intentproof-correlation-id`). Apply trimming and validation rules above.
