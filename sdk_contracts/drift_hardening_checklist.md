# Cross-SDK drift-hardening checklist

Use this checklist for **TypeScript (Node)**, **Python**, and **Java** SDK PR review and CI policy.

## 1) Spec pin is explicit and enforced

- [ ] SDK declares a pinned spec version (for example `intentproofSpecVersion` / `[tool.intentproof].spec-version`).
- [ ] SDK declares a pinned **immutable spec commit** (`intentproofSpecCommit` / `spec-commit` / `intentproofSpecCommit=`).
- [ ] CI compares the version to `intentproof-spec/spec.json` `version` and the commit to `git rev-parse HEAD` in that checkout; both must match.
- [ ] CI checks out `intentproof-spec` at the **declared commit SHA** (see SDK workflows / `scripts/read-sdk-spec-commit.sh`), not an unconstrained `main` tip that may bypass the pin contract.
- [ ] CI runs **`spec:integrity:verify`** via `scripts/run-conformance.sh` (hashes + Ed25519 signature for `spec.json` → `schemas.*`).
- [ ] Pull requests that change schemas are classified in spec CI (via `spec.json` → `schemas` only); **`BREAKING`** requires label **`spec-breaking-approved`** or repository variable **`SPEC_SCHEMA_COMPAT_OVERRIDE=true`** (break-glass).
- [ ] Release notes mention the pinned spec tag **and git SHA** used for conformance.

## 2) Wire models are generated from schema

- [ ] `ExecutionEvent`, `ExecutionError`, `WrapOptions`/config wire models come from code generation based on `spec.json -> schemas.*`.
- [ ] SDK code does not keep hand-written canonical wire model definitions as a competing source of truth.
- [ ] Any SDK-only convenience wrappers/aliases are thin facades over generated models.

## 3) Generated output is checked in and drift-gated

- [ ] SDK checks in generated output (`src/generated` or equivalent).
- [ ] CI/local verify script runs generation and then `git diff --exit-code` on generated directories.
- [ ] Normal compile/package flows do not silently re-generate artifacts.

## 4) Generator toolchain is deterministic

- [ ] Generator package/plugin versions are pinned to exact versions (not open-ended ranges).
- [ ] Codegen scripts are deterministic (stable sort/order, reproducible output).
- [ ] Any schema patching for codegen limitations is script-based and reproducible (never via hand-edited schema copies in SDK repos).
- [ ] CI runs a hardening audit script (for example `intentproof-spec/scripts/check-sdk-hardening.sh`) to enforce these controls mechanically.

## 4.1) Schema fingerprinting

- [ ] SDK codegen metadata includes the spec version, generator version, and schema fingerprint.
- [ ] Fingerprint is derived from `spec.json -> schemas.*` paths using deterministic hashing.
- [ ] CI can print/compare the fingerprint (for example `npm run spec:fingerprint` in this repo) during drift/debug incidents.

## 5) Validator source matches generation source

- [ ] Runtime validation uses schemas from the same pinned `intentproof-spec` source (or deterministic embedded normative copy generated from it).
- [ ] SDK repository blocks vendored `*.schema.json` copies outside approved generation flow.

## 6) Conformance and behavior parity

- [ ] SDK CI runs `scripts/spec-conformance.sh` against pinned spec checkout.
- [ ] SDK CI emits and uploads `conformance-report.json` (v1) from the shared spec runner.
- [ ] SDK-native golden tests verify emitted events against `golden/execution_event_cases.jsonl`.
- [ ] Post-schema semantics (from `tests/lib/semantics.ts`) are mirrored in SDK tests.

## 7) Cross-SDK parity spot checks

- [ ] At least one CI/test path compares canonicalized emitted events across SDKs for the same scenario set.
- [ ] A scheduled parity job runs independently of feature PRs (nightly recommended) to catch toolchain or ecosystem drift.
- [ ] Any intentional divergence is documented in the SDK README and contract docs.

---

Passing all sections means drift risk is primarily limited to intentional spec changes and reviewed SDK runtime behavior changes, not silent schema/type mismatch.
