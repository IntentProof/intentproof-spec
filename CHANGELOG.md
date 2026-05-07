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

- **Stage 2 certification:** Draft **RFC** + **issuance policy**; normative
  **`conformance_certificate.v1`** in **`spec.json`** (re-sign
  **`artifacts/spec-integrity.v1.*`** when indexed schemas change). Emitter
  **`tools/conformance-certificate.ts`** (after report when **`INTENTPROOF_CONFORMANCE_JSON=1`**;
  digest = SHA-256 of report bytes). Validator **`tools/validate-conformance-certificate.ts`**
  / **`npm run validate:conformance-certificate`** (schema, digest, binding, all phases **pass**). **`ci.yml`**: validate + artifact **`conformance-artifacts`**.
  **`cross-sdk-parity.yml`** (adopted SDKs): same validate + **`conformance-artifacts-<sdk>`**;
  parity log parsing selects the **conformance report** JSON (not the trailing
  certificate line). Env: **`INTENTPROOF_CERTIFICATE_*`**. Docs/README updated.
- **Stage 2 certificate signing/verification:** conformance certificate emission
  now supports **Ed25519** signatures via
  **`INTENTPROOF_CERTIFICATE_SIGNING_KEY_PEM`** (+ optional key id), and
  certificate validation verifies signatures with
  **`INTENTPROOF_CERTIFICATE_PUBLIC_KEY_PEM`**; CI/parity enforce required
  signatures when both signing and verification secrets are configured.
- **Integrity-key custody hardening:** `spec:integrity:verify` now requires an
  external public key input (`INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PEM` or
  `INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PATH`) instead of repo-local
  `signing/spec-integrity.public.pem`; docs/workflows updated to use org/repo
  secrets for verification.
- **Trust-split CI policy:** `ci.yml` now runs an untrusted conformance
  precheck on pull requests (no secrets) and a trusted attestation conformance
  gate on push (secret-backed integrity verification + certificate validation).
- **Cross-SDK parity & release train:** **`cross-sdk-parity`** on **schedule** +
  **`workflow_dispatch`** only; target **`spec-v*`** / `spec_ref`, **adoption** =
  SDK pin SHA vs target, optional **`require_full_adoption`**. **`sdk-release-train.yml`**
  (pin PRs, fingerprints, **`INTENTPROOF_BOT_APP_*`**). Normative-path PRs: **`ci.yml`**
  parity note (includes cert tool paths).
- **Docs:** **`sdk_contracts/conformance_reality.md`**, workflow headers,
  **`CONTRIBUTING.md`** (Actions, **`SPEC_SCHEMA_COMPAT_OVERRIDE`**).

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
