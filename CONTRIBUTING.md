# Contributing to `intentproof-spec`

This repository is the **normative** source for JSON Schemas, golden oracles, semantics references, and the executable Vitest oracle (`scripts/run-conformance.sh`). SDK repositories (**Node**, **Python**, **Java**) consume it via pinned checkouts and shared contracts under **`sdk_contracts/`**.

## Before you open a pull request

1. **Install and verify locally**
   - `npm ci` (or reuse `node_modules` if already installed).
   - Quick gate: `npm run ci:local` (integrity verify + typecheck + Vitest).
   - Full oracle (matches CI conformance job closely): `npm run conformance`.
2. **Schema edits**
   - PRs run **`schema-compatibility`** against the merge base. Classifications **`BREAKING`** require PR label **`spec-breaking-approved`** or repository variable **`SPEC_SCHEMA_COMPAT_OVERRIDE=true`** (documented break-glass), or revert/adjust the change.
3. **Files listed under `spec.json` → `schemas`**
   - Regenerate the integrity manifest and signature (private key off-repo). See **`sdk_contracts/spec_version_pinning.md`** (“Migration (SDK maintainers)” applies to spec maintainers for manifest rotation).
4. **Interoperability**
   - Read **`sdk_contracts/single_source_policy.md`** and **`sdk_contracts/drift_hardening_checklist.md`** when changing anything SDKs must mirror.

**Node.js:** CI and local runs use the version in **`.nvmrc`** (currently **22**). `package.json` **`engines`** expects **>=22** for this repo.

**Shell scripts:** `scripts/*.sh` are linted with **shellcheck** in CI.

## Terminology (shared with SDK repos)

Use the same names across repositories and CI so pins and scripts stay unambiguous.

| Term | Meaning |
|------|---------|
| **`intentproof-spec`** | This Git repository: canonical schemas, goldens, oracle. |
| **`INTENTPROOF_SPEC_ROOT`** | Absolute path to an `intentproof-spec` checkout. Set by SDK CI and local scripts when the spec is not adjacent to the SDK. |
| **`intentproofSpecVersion`** (Node root + workspace **`package.json`**) | Must equal **`spec.json`** **`version`**. |
| **`intentproofSpecCommit`** (Node / Gradle **`gradle.properties`**) | 40-character lowercase hex SHA; the **`intentproof-spec`** checkout used in CI must satisfy **`git rev-parse HEAD` == this commit**. |
| **`spec-version`** / **`spec-commit`** | Python **`pyproject.toml`** **`[tool.intentproof]`** — same contract as version + commit above. |
| **`scripts/run-conformance.sh`** | Runs in **this** repo (or with **`INTENTPROOF_SPEC_ROOT`**): npm install, **`spec:integrity:verify`**, typecheck, Vitest, smoke, optional replay / JSON report. |
| **`scripts/spec-conformance.sh`** | Lives in **each SDK** repo; invokes the spec oracle with **`INTENTPROOF_SPEC_ROOT`** pointing at the pinned spec tree. |
| **`scripts/check-sdk-spec-pins.sh`** | Validates SDK manifests vs a spec checkout (**`spec.json`** version + **`HEAD`**). Run from **`intentproof-spec`**. |
| **`scripts/check-sdk-spec-pin.sh`** | Per-SDK thin wrapper; delegates to **`check-sdk-spec-pins.sh`**. |
| **`scripts/check-sdk-hardening.sh`** | SDK audit: pins, drift scripts, generator pins, delegated policies. |
| **`ExecutionEvent`** | Wire payload shape defined by **`schema/execution_event.v1.schema.json`** (see **`spec.json`**). |

SDK pinning details: **`sdk_contracts/spec_version_pinning.md`**. Contract boundaries: **`sdk_contracts/conformance_reality.md`**.

## Changelog

User-visible spec, schema, golden, or tooling changes should include an entry in **`CHANGELOG.md`**.

## Security

Do not open public issues for undisclosed vulnerabilities. Use **GitHub Security Advisories** (or your org’s equivalent).
