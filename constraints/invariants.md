# Invariants (v1)

These invariants MUST hold for every emitted `ExecutionEvent` after SDK normalization.

1. **Status domain**: `status` is exactly `"ok"` or `"error"`.
2. **Mutual exclusivity on success**: If `status` is `"ok"`, property `error` MUST NOT appear on the JSON object.
3. **Error presence on failure**: If `status` is `"error"`, object `error` MUST exist and validate as `ExecutionError`.
4. **Output on success**: If `status` is `"ok"`, `output` MUST be present (possibly JSON `null` when capture is disabled).
5. **Temporal ordering**: `startedAt` and `completedAt` MUST parse as RFC 3339 instants with `startedAt <= completedAt`.
6. **Duration**: `durationMs` equals rounded millisecond difference between `startedAt` and `completedAt`, clamped at `0` for monotonic clock quirks not exceeding 1 ms tolerance (see tests).
7. **Attributes shape**: Every value in `attributes` is `string | number | boolean | null` only; no arrays or objects.
8. **No undocumented keys**: Root object contains only schema-defined keys.
9. **Correlation hygiene**: If `correlationId` is present, `trim(correlationId).length > 0`.
