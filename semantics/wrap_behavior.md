# Wrap Semantics (v1)

This document defines deterministic behavior for `wrap(fn, options)` (name may vary per SDK) around user code. All SDKs MUST implement identical ordering and visibility guarantees.

## Lifecycle

1. **Enter**: Resolve effective `WrapOptions` by merging `IntentProofConfig.defaultWrapOptions` (if any) with call-site options, with call-site winning on conflicts.
2. **Correlation snapshot**: Read the active `correlationId` from the runtime context store (see `correlation.md`). If absent and `generateOnMissing` is true, generate a new UUID v4 string and bind it for the duration of this wrap unless overridden.
3. **Start timestamp**: Capture `startedAt` as the earliest instant after correlation is resolved and before user code observes side effects from IntentProof (excluding exporter side effects).
4. **Input capture**: If `captureInputs` is true, serialize arguments per serialization rules into `inputs`. If false, set `inputs` to `{}` exactly.
5. **Execute user function**: Invoke the wrapped callable with the original arguments. Await the result if the callable returns a thenable (Promise or equivalent).
6. **Output / error capture**:
   - On normal completion: `status` is `ok`. If `captureOutput` is true, serialize the return value into `output`; otherwise `output` is JSON `null`.
   - On thrown/propagated failure: `status` is `error`. Populate `error` per `error_model.md` for every failure event. `captureStack` controls stack/cause richness; `captureError` gates optional `output` on failure (see below) but never removes `error`.
7. **End timestamp**: Capture `completedAt` after the user promise settles or sync function returns/throws.
8. **Duration**: `durationMs` MUST equal `max(0, round(completedAt - startedAt in ms))` using monotonic wall clock where available; if only `Date` is available, use epoch milliseconds difference rounded to nearest integer.
9. **Emit**: Invoke exporters with the finalized `ExecutionEvent` in FIFO exporter order. Exporter failures MUST follow `lifecycle_model.md`.

## Async behavior

- If the wrapped callable returns a thenable, the wrap boundary remains open until that thenable fulfills or rejects.
- Rejection is treated equivalently to a synchronous throw for steps 6–9.
- Microtasks scheduled by user code before return are part of user execution; exporters run strictly after settlement.

## Nested wrap

- Inner wraps inherit the same `correlationId` when `propagateCorrelation` is true (default). Inner MAY add attributes; attribute keys from outer and inner are merged with inner winning on key collision.
- Each wrap emits **exactly one** `ExecutionEvent` for its own boundary. Inner completes before outer `completedAt` is recorded unless the SDK explicitly documents concurrent fan-out (not part of v1 single-wrap).

## Concurrency

- Context correlation stores MUST be re-entrant safe. Concurrent unrelated wraps on different async branches MUST NOT leak correlation across branches when each branch sets or generates its own correlation (e.g., separate async tasks without shared parent context receive independent correlation unless explicitly bridged by the host application).

## Ordering guarantees

1. Input capture completes before user code runs.
2. User code completes (return or throw) before output/error capture.
3. Output/error capture completes before any exporter is invoked.
4. Exporters are invoked serially in registration order.

## captureError override (output on failure)

- Default: when `status=error`, `output` SHOULD be omitted from the serialized event.
- When `captureError` is true **and** the SDK supports capturing a structured “partial output” or sentinel (documented per language), `output` MAY be present alongside `error`. JSON Schema permits optional `output` on `status=error`.

## No extra fields

- Serialized events MUST validate against `execution_event.v1.schema.json` with `additionalProperties: false` semantics: no keys beyond those defined in the schema.
