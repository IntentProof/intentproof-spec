# What the specification repository actually guarantees

This file states the **boundary of machine enforcement** so maintainers do not over-claim or under-test.

## Spec repository (`intentproof-spec`) jobs

- **`scripts/run-conformance.sh`** (Vitest) validates **this repo’s** JSON Schemas, **goldens** (`golden/*.jsonl`), **semantics** (`tests/lib/semantics.ts` + `schema` via Ajv), and **canonicalization** vectors. It is the **authoritative oracle for the spec artifacts** and the **TypeScript reference implementation** of the checks.
- It does **not** import or execute the **Node, Python, or Java SDKs** as libraries. A green spec CI run **does not** prove that a given SDK’s `wrap()` output is correct.
- **Pull-request** workflows (`ci.yml`) exercise Vitest/schema gates without emitting **`conformance-report.json`** / signed **`conformance-certificate.json`**. **Trusted** workflows (**`conformance-attestation.yml`**, **`cross-consumer-parity.yml`** adopted rows) emit and verify certificates per **`docs/certificate-issuance-policy.md`**.

## SDK responsibilities

1. **Pin** the spec revision via `intentproofSpecVersion` (or the language-specific equivalent) and run **`scripts/spec-conformance.sh`** (which delegates to the spec’s `run-conformance.sh`) so the **same** Vitest oracle runs in SDK CI.
2. **Add SDK-native tests** that load the **same** `golden/execution_event_cases.jsonl` (and optionally emit path tests) so **schema + post-schema semantics** are evaluated in the **language’s** runtime, using the **vendored spec tree** (`INTENTPROOF_SPEC_ROOT` or a sibling `../intentproof-spec`).

Without (2), an SDK can still **drift in emitted `ExecutionEvent` shape or semantics** while the detached spec job stays green.

## Equivalence across languages

**Byte-identical** `ExecutionEvent` JSON after **canonical** serialization is the bar for “same execution contract.” SDKs should run **emit → canonical JSON** checks and, where applicable, **`tools/replay/compare-streams.ts`**-style comparison for exported streams. The spec repository defines the **canonical** rules; each SDK must implement them in native code or share a library.

Keep `tests/lib/semantics.ts` in the spec repo as the **single source of truth for the rule list**; **Python/Java/Node** golden tests should stay **manually aligned** with that file when semantics evolve (or share generated assertions in a future phase).

Recommended hardening: run the cross-SDK parity workflow on a **schedule** (and **`workflow_dispatch`** against a **spec tag/commit**) so generation drift gates and SDK-side `spec-conformance.sh` run against the **same pinned `intentproof-spec` checkout** as the resolved target—not on every spec merge, which races SDK pin landings.
