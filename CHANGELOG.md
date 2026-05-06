# Changelog

Repository: [IntentProof specification (`intentproof-spec`)](https://github.com/IntentProof/intentproof-spec).

All notable changes to this specification repository are documented here. Versioning follows Git tags `spec-vMAJOR.MINOR.PATCH` (see README).

## How this changelog differs from app/package repos

- This repository is a **specification authority**, not a deployable app package.
- Versions here track the **IntentProof contract** (`schema/`, `semantics/`, `golden/`),
  published as spec tags like `spec-v1.0.1`.
- Changelog sections therefore describe **spec-version impact**, not binary/package
  release notes.
- `PATCH`/`MINOR`/`MAJOR` should be interpreted as contract compatibility levels:
  - `PATCH`: non-breaking clarifications/tooling/docs/tests.
  - `MINOR`: backward-compatible contract additions.
  - `MAJOR`: breaking contract changes requiring SDK major migration.
- Non-normative repo/tooling changes may appear in `Unreleased`, and should be
  labeled clearly when they do not change normative contract behavior.

## Unreleased

- **Stage 2 certification (draft docs, non-normative):** add
  `docs/certification-rfc.md` (certificate family `cert-v0.1-draft`, trust model,
  field sketch) and `docs/certificate-issuance-policy.md` (preconditions,
  denial cases, staged rollout toward signed certificates).
- **Stage 2 certificate schema (normative):** add
  `schema/conformance_certificate.v1.schema.json` and index it from
  `spec.json` → `schemas.conformance_certificate`. Regenerate and re-sign
  `artifacts/spec-integrity.v1.json` when changing indexed schemas (see
  **CONTRIBUTING.md**).
- **Cross-SDK parity & release train:** `cross-sdk-parity` runs only on
  **schedule** + **`workflow_dispatch`** (no push to default branch); targets a
  resolved **spec tag/commit** (`spec_ref` input or latest `spec-v*`), classifies
  **per-SDK adoption** vs that commit, skips stream compare when adoption is
  incomplete, and supports optional **`require_full_adoption`** to fail if any
  SDK lags. **`sdk-release-train.yml`** opens SDK pin-bump PRs on **`spec-v*`
  tags** or manual dispatch, refreshes pin fields + fingerprint JSON where
  applicable, and uses GitHub App auth (`INTENTPROOF_BOT_APP_ID` /
  `INTENTPROOF_BOT_APP_PRIVATE_KEY`). PRs that touch normative paths get an
  updated **parity policy note** in `ci.yml`.
- **Docs:** refresh README, `sdk_contracts/conformance_reality.md`, workflow
  header comments, and **`CONTRIBUTING.md`** (Actions variables/secrets,
  parity dispatch inputs, `SPEC_SCHEMA_COMPAT_OVERRIDE`) to match the above.

## 1.0.1 — 2026-05-06

- **CI policy and workflows:** add `shellcheck` for `scripts/*.sh`; add PR
  `schema-compatibility` classification with artifact + breaking-change gate
  (`spec-breaking-approved` / `SPEC_SCHEMA_COMPAT_OVERRIDE`); run
  `cross-sdk-parity` on `push` (normative paths), `schedule`, and
  `workflow_dispatch` (not `pull_request`); add a PR policy-note job in
  `ci.yml` for normative-path changes; pin Java parity verify jobs to
  Temurin 21 + Gradle setup for deterministic generated-source checks; upgrade
  workflow actions (`upload-artifact` v7, `download-artifact` v8,
  `setup-java` v5, Gradle actions v6, `setup-python` v6, cache v5).
- **Integrity, pinning, and hardening:** add signed schema integrity verification
  (`tools/spec-integrity.ts`, artifacts + signature/public key,
  `verify-spec-integrity.sh`) and wire it into conformance; add cross-SDK pin and
  hardening auditors (`check-sdk-spec-pins.sh`, `read-sdk-spec-commit.sh`,
  `check-sdk-hardening.sh`) plus delegated no-handwritten-model checks.
- **Conformance artifacts and tooling:** add `conformance_report.v1` schema/docs,
  emit validated `conformance-report.json` from `run-conformance.sh`, and add
  spec fingerprint tooling (`npm run spec:fingerprint`) indexed via `spec.json`.
- **Conformance report metadata:** `scripts/run-conformance.sh` now defaults
  `INTENTPROOF_SDK_VERSION` from local `package.json` when unset, so
  spec-generated `conformance-report.json` emits a concrete SDK version
  instead of `"unknown"`.
- **Docs, contracts, and runtime baseline:** expand `CONTRIBUTING.md`,
  `sdk_contracts/README.md`, and README for drift policy/parity/fingerprints and
  canonical schema paths; standardize on Node.js 22+ (`.nvmrc`, `engines`,
  conformance scripts); align IntentProof naming/links and canonical repo
  metadata.

_Normative contract behavior is unchanged in this release; changes are
CI/tooling/docs and governance hardening._

## 1.0.0 — 2026-05-04

- Initial public layout: JSON Schemas (v1), semantics and constraints, golden JSONL oracles, Vitest conformance suite, SDK harness, CLI tools, and `scripts/run-conformance.sh` for cross-language CI.
