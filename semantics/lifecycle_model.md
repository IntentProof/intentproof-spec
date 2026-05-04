# Lifecycle Model (v1)

Normative artifacts for the **IntentProof** specification live in **https://github.com/intentproof/intentproof-spec** (pinned tags recommended for SDK CI).

## Phases

1. **Configuration load**: `IntentProofConfig` validated against `schema/intentproof_config.v1.schema.json` (SDKs MAY subset unsupported fields but MUST preserve unknown keys only if schema allows—schema forbids unknown keys at root).
2. **Registration**: Exporters register in stable order; order defines invocation sequence.
3. **Wrap active**: Each wrap boundary runs Enter → Execute → Emit phases from `wrap_semantics.md`.
4. **Shutdown** (optional SDK API): Flush exporters; after shutdown, wraps MUST either reject registration or no-op per SDK documentation—consistent across languages.

## Exporter contract

Each exporter is a function/hook `onEvent(event: ExecutionEvent): void | Promise<void>`.

### Preconditions

- `event` MUST already satisfy schema validation for v1.
- Exporters MUST NOT mutate `event` in ways that break immutability expectations; prefer deep-clone if mutation is required for transport.

### Failure resilience (`failOpen`)

- When `failOpen` is true (default for declarative config), an exporter that throws or rejects MUST be caught by the SDK.
- The SDK MUST continue invoking subsequent exporters.
- The SDK MUST surface exporter failure through internal logging hooks only; MUST NOT alter user return values or thrown errors.
- When `failOpen` is false, the first exporter failure MAY abort the exporter chain; user-visible behavior remains identical to `failOpen=true` for thrown user errors (user error still propagates).

### Timeouts

- If `exporterTimeoutMs` > 0, SDKs SHOULD cancel awaited exporter work after the timeout and treat it as a failure per `failOpen`.

### Idempotency

- Exporters SHOULD be idempotent; duplicate deliveries MAY occur during at-least-once transports—documented as SDK responsibility, not duplicated emission from a single wrap.

## Versioning

- `ExecutionEvent` documents implicitly target schema v1 via repository tag `spec-v1`. Breaking field changes require a new schema file (`execution_event.v2.schema.json`) and a new golden file prefix.
