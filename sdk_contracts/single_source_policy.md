# Single source of truth: `intentproof-spec`

This policy applies to **every** published IntentProof SDK repository — **TypeScript (Node)**, **Python**, and **Java** — with the same obligations and CI guards (no vendored normative schema; generated or verified wire models; drift checks on regenerated output).

SDK repositories **MUST NOT** be a parallel home for:

- JSON Schema (`.schema.json` or copies under `schema/`)
- Ad-hoc “spec” markdown that contradicts this repository
- Hand-written wire types for **`ExecutionEvent` / `ExecutionError` / `WrapOptions` / `IntentProofConfig`** that are not **generated or verified** from the files declared in **`spec.json`**

## Required artifacts (from this repo only)

| What | Source path (see `spec.json`) |
|------|-------------------------------|
| Schemas | `spec.json` → `schemas.*` |
| Golden vectors | `spec.json` → `goldens.*` |
| Semantics & canonicalization | `spec.json` → `semantics.*` + `tools/canonical/` |

## SDK obligations

1. **Pin** a spec revision (`intentproofSpecVersion` or equivalent) and run **`run-conformance.sh`** (or the SDK wrapper) in CI.
2. **Generate** language types from the JSON Schemas (or, at minimum, **statically verify** hand-written public types against the schema in CI; generation is the default expectation per `type_generation.md`).
3. **Never** vendor a second copy of the schema in the SDK tree. Load validator paths from a checkout of this repository or from a package that **mirrors** it without editing.
4. **Semantics** that are not expressible in JSON Schema (e.g. `durationMs` vs timestamps) must **mirror** `tests/lib/semantics.ts` in tests; when that file changes, SDKs update their mirrored checks in the same change train.

## CI guards

Every SDK **must** run:

- A **“no bundled schema”** script that fails if `*.schema.json` appears in the SDK repo (with explicit allow-list only for third-party tools if ever required).
- A **“generated types up to date”** step: run the language codegen from a checkout of this repo (`INTENTPROOF_SPEC_ROOT` or equivalent), then `git diff --exit-code` on the generated output directory (or compare hashes).

Implementation references (each SDK names its own scripts; behavior matches the bullets above):

| SDK | Typical locations |
|-----|-------------------|
| Node (`intentproof-sdk-node`) | `scripts/check-no-bundled-schema.sh`, `scripts/verify-generated-types.sh`, `packages/sdk/src/generated/` |
| Python (`intentproof-sdk-python`) | `scripts/check-no-bundled-schema.sh`, `scripts/verify-generated-types.sh`, `src/intentproof/generated/` |
| Java (`intentproof-sdk-java`) | `scripts/check-no-bundled-schema.sh`, `scripts/verify-generated-pojos.sh`, `src/main/java/com/intentproof/sdk/generated/v1/` |

## Rationale

If schemas or wire types live in an SDK without generation or verification, they will drift. The spec repository is the **only** place where the execution contract is defined; SDKs **consume** it, they do not **author** it.

See also **`sdk_contracts/drift_hardening_checklist.md`** for the cross-SDK review checklist.
