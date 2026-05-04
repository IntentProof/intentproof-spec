# Error Model (v1)

## ExecutionError shape

`error` on `ExecutionEvent` MUST match `#/$defs/ExecutionError` in `schema/execution_event.v1.schema.json`.

| Field     | Required | Description |
|-----------|----------|-------------|
| `name`    | yes      | Exception class or type name. |
| `message` | yes      | Human-readable message; use `""` if none exists. |
| `code`    | no       | Stable optional machine code. |
| `stack`   | no       | String stack trace or `null` when suppressed. |
| `cause`   | no       | Nested `ExecutionError` when the runtime exposes a cause chain. |

## Exception → ExecutionError mapping

1. **Name**: Prefer the runtime exception type name (`error.name`, `type(exception).__name__`, `exception.getClass().getSimpleName()`), falling back to `"Error"`.
2. **Message**: Coerce `message` / `str(exception)` / `getMessage()` to string; never omit the field.
3. **Stack**:
   - If `captureStack` is false in effective wrap options, set `stack` to `null`.
   - Otherwise capture the platform stack string; if unavailable, `null`.
4. **Cause**: If the runtime exposes a chained cause and `captureStack` is true, map recursively up to **one** level of nesting in v1 (`cause` is a single optional `ExecutionError`). Deeper chains MAY be concatenated into `message` or dropped—SDKs MUST be consistent cross-language; the conformance golden set only asserts single-level `cause`.

## ExecutionEvent.status

- Failures that are caught and converted into a returned error value without throwing are still `ok` if no exception crosses the wrap boundary (SDK MUST NOT emit `error` for that path). If the user throws, `status` is `error`.

## captureError and captureOutput interaction

- `captureError` does not remove the requirement to emit an `ExecutionEvent` with `status=error` when the wrapped callable throws.
- Optional `output` on failure is controlled by wrap semantics (see `wrap_semantics.md`).

## Guaranteed emission on failure

- Even if all exporters fail, the user-visible failure behavior MUST remain that of the original thrown error (propagate rejection / rethrow). The event object MUST still be constructed and passed to exporters; exporter exceptions are swallowed or logged per `lifecycle_model.md`, never replacing the user error.
