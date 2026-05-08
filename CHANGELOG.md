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

- **CI:** Trusted workflows (**`conformance-attestation.yml`**, adopted rows in **`cross-sdk-parity.yml`**) now require Ed25519 certificate signatures (**`INTENTPROOF_CERTIFICATE_REQUIRE_SIGNATURE=1`**) and fail fast if certificate PEM secrets are missing on **`intentproof-spec`**.
- **Docs:** README, **`docs/`**, **`sdk_contracts/`** aligned with **`conformance_certificate.v2`**, trusted vs PR **`ci.yml`** roles, and **`docs/README.md`** index.

## 2.0.0 — 2026-05-07

- **Stage 2 certification artifacts:** draft RFC + issuance policy now back
  normative `conformance_certificate.v1` in `spec.json`; emitter
  `tools/conformance-certificate.ts` (after `INTENTPROOF_CONFORMANCE_JSON=1`);
  validator `tools/validate-conformance-certificate.ts` /
  `npm run validate:conformance-certificate` (schema, digest/report binding,
  all phases pass); CI/parity publish `conformance-artifacts*`; parity log
  parsing selects the conformance report JSON line.
- **Certificate signing and v2 cutover:** certificate emission and validation
  support Ed25519 signing via `INTENTPROOF_CERTIFICATE_*`; add
  `schema/conformance_certificate.v2.schema.json` (requires `signature.keyId`
  when signature is present), switch `spec.json` to v2, and default cert
  emit/validate tooling to `INTENTPROOF_CERTIFICATE_SCHEMA_VERSION=v2`; v1
  schema remains available for compatibility reference.
- **Integrity-key custody and CI trust split:** `spec:integrity:verify` now
  requires external public key input
  (`INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PEM` or `_PATH`) instead of
  `signing/spec-integrity.public.pem`; PR CI runs an untrusted no-secrets
  precheck; trusted secret-backed attestation runs in
  `conformance-attestation.yml` (push/tag/manual).
- **Parity, release train, and docs:** `cross-sdk-parity` remains schedule +
  `workflow_dispatch` only with adoption targeting (`spec_ref`,
  `require_full_adoption`); release train uses `INTENTPROOF_BOT_APP_*`; docs
  updated across `README.md`, `CONTRIBUTING.md`, workflow headers, and
  `sdk_contracts/conformance_reality.md`.

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
