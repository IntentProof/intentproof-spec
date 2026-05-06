# Changelog

Repository: [IntentProof specification (`intentproof-spec`)](https://github.com/IntentProof/intentproof-spec).

All notable changes to this specification repository are documented here. Versioning follows Git tags `spec-vMAJOR.MINOR.PATCH` (see README).

## How this changelog differs from app/package repos

- This repository is a **specification authority**, not a deployable app package.
- Versions here track the **IntentProof contract** (`schema/`, `semantics/`, `golden/`),
  published as spec tags like `spec-v1.0.0`.
- Changelog sections therefore describe **spec-version impact**, not binary/package
  release notes.
- `PATCH`/`MINOR`/`MAJOR` should be interpreted as contract compatibility levels:
  - `PATCH`: non-breaking clarifications/tooling/docs/tests.
  - `MINOR`: backward-compatible contract additions.
  - `MAJOR`: breaking contract changes requiring SDK major migration.
- Non-normative repo/tooling changes may appear in `Unreleased`, and should be
  labeled clearly when they do not change normative contract behavior.

## Unreleased

- **CI & workflows:** **shellcheck** on **`scripts/*.sh`**; PR **schema-compatibility** (`tools/schema-compatibility-classify.ts`) with artifact + breaking gate (**`spec-breaking-approved`** / **`SPEC_SCHEMA_COMPAT_OVERRIDE`**); **cross-SDK parity** (normative path triggers, PR native SDK gates, aggregate compare); GitHub Actions bumps (**upload-artifact** v7, **download-artifact** v8, **setup-java** v5, **Gradle actions** v6, **setup-python** v6, **cache** v5 where used).
- **Integrity, pins, hardening:** signed schema manifest (**`spec:integrity:*`**, `tools/spec-integrity.ts`, artifacts + **`signing/spec-integrity.public.pem`**, **`verify-spec-integrity.sh`**; verify in **`run-conformance.sh`** / **`ci:local`**); **`check-sdk-spec-pins.sh`**, **`read-sdk-spec-commit.sh`**, **`check-sdk-hardening.sh`** with delegated **`check-sdk-no-handwritten-model-types.sh`** and **`sdk_contracts`** drift / generator-pin policy (incl. Python **`tox`** static parity).
- **Conformance outputs:** **`conformance-report.v1`** (schema, emitter, docs); validated **`conformance-report.json`** from **`run-conformance.sh`**; **`spec.json`** indexes conformance report + **schema fingerprint** tooling (**`npm run spec:fingerprint`**).
- **Documentation & runtime:** **`CONTRIBUTING.md`**, **`sdk_contracts/README.md`**, README (drift summary, hardening/parity/fingerprint, schema URLs); **Node.js 22+** (**`engines`**, **`run-conformance.sh`**, **`.nvmrc`**).
- **Housekeeping:** IntentProof naming/links across README/changelog/semantics/constraints/schemas/harness/`package.json`; canonical repo URLs + **`homepage`**; Vitest **4.1.5** ( **`npm audit`** clean on fresh install).

_Normative contract behavior is unchanged unless called out above; most items are tooling, CI, and documentation._

## 1.0.0 — 2026-05-04

- Initial public layout: JSON Schemas (v1), semantics and constraints, golden JSONL oracles, Vitest conformance suite, SDK harness, CLI tools, and `scripts/run-conformance.sh` for cross-language CI.
