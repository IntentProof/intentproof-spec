# Schema-driven type generation (normative for SDKs)

The IntentProof specification defines runtime truth in **`spec.json`** and **`schema/*.schema.json`**. SDKs MUST NOT treat hand-maintained language types as authoritative for `ExecutionEvent`, `WrapOptions`, or `IntentProofConfig`.

## Rules

1. **Single source**: Types that mirror JSON payloads MUST be generated from the JSON Schema files referenced in `spec.json` under `schemas` (e.g. `execution_event`, `wrap_options`, `intentproof_config`).
2. **CI enforcement**: Each SDK’s CI MUST run generation (or verify generated output is up to date) such that drift from the pinned spec revision fails the build.
3. **Contract sketches** (`sdk_contracts/*.ts`, `*.py`, `*.java`) are illustrative only—documentation for humans—until replaced by generated output checked into `src/generated/` (or equivalent). They MUST NOT be edited as the primary definition of fields or optionality.
4. **Validators**: Runtime validation MUST use the same schema documents as code generation (same file paths relative to the vendored spec tree).

## Suggested generators

All three SDKs consume the **same** schema files under `schema/` (see `spec.json`). Recursive constructs such as `JsonValue` may require a **non-recursive substitute** for the codegen step only; that substitution must be implemented in the SDK’s generation script (never by committing an alternate schema file inside the SDK).

| Language   | Typical tooling |
|------------|------------------|
| TypeScript | `json-schema-to-typescript`, OpenAPI-style codegen, or Ajv + typed wrappers |
| Python     | `datamodel-code-generator` → Pydantic v2 models checked into `src/intentproof/generated/`; normative schemas embedded as `normative_schemas.py` + `jsonschema` (Draft 2020-12) at runtime; CI drift via `scripts/verify-generated-types.sh` |
| Java       | Gradle plugin `org.jsonschema2pojo` (pinned in `gradle/libs.versions.toml`), Jackson annotations; sources checked into `src/main/java/com/intentproof/sdk/generated/v1/`; regenerate with `./gradlew intentproofGenerateSchemaSources`; CI drift via `scripts/verify-generated-pojos.sh`. Normal `compileJava` / `jar` do **not** run codegen. |

Exact tooling is an SDK choice; **correctness** is determined by passing **`scripts/run-conformance.sh`** against the pinned `intentproofSpecVersion`, plus **CI drift checks** that regenerated models match the pinned spec checkout.

Generator versions MUST be exact-pinned for reproducibility (no open-ended ranges).

## Version pinning

See **`sdk_contracts/spec_version_pinning.md`**. The declared spec version MUST match `spec.json` for the vendored checkout.

## Operational checklist

For a review/CI-ready hardening list across Node, Python, and Java, see
**`sdk_contracts/drift_hardening_checklist.md`**.

## Enforcement boundary

Vitest in **`intentproof-spec`** validates the canonical schemas and goldens; SDK CI runs that oracle via **`scripts/spec-conformance.sh`** but that alone does not execute SDK **`wrap()`** code. See **`sdk_contracts/conformance_reality.md`** for what is guaranteed vs what SDKs must test natively (golden parity + emit checks).
