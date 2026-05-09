# Spec version pinning contract

See also the **[root `CONTRIBUTING.md`](../CONTRIBUTING.md#terminology-shared-with-sdk-repos)** terminology table (`INTENTPROOF_SPEC_ROOT`, commit pin field names).

Every SDK package MUST declare which IntentProof specification revision it implements **and** the **exact git commit** of the `intentproof-spec` checkout used in CI and releases. CI MUST fail if either field is missing or incompatible with the vendored **`spec.json`** `version` field or with **`git rev-parse HEAD`** inside that checkout.

## Required declarations

| Ecosystem | Location | Example |
|-----------|----------|---------|
| Node.js   | Root `package.json` | `"intentproofSpecVersion": "spec-v1.0.1"`, `"intentproofSpecCommit": "<40-char lowercase hex>"` |
| Node.js   | `packages/sdk/package.json` (workspace) | Same `intentproofSpecVersion` and `intentproofSpecCommit` as root |
| Python    | `pyproject.toml` under `[tool.intentproof]` | `spec-version = "spec-v1.0.1"`, `spec-commit = "<40-char lowercase hex>"` |
| Java (Maven) | Root `pom.xml` inside `<properties>` | Follow the same **version + full commit** contract as Gradle if your build uses Maven (exact property names are project-specific). |
| Java (Gradle) | `gradle.properties` | `intentproofSpecVersion=spec-v1.0.1`, `intentproofSpecCommit=<40-char lowercase hex>` |

The **version** string MUST equal `spec.json.version`. The **commit** string MUST equal `git -C <spec-checkout> rev-parse HEAD` (full SHA, lowercase hex).

## Canonical enforcement

- **`scripts/check-consumer-spec-pins.sh`** in this repository validates both fields for a given consumer repository root + spec checkout root. Consumer repositories typically ship a thin wrapper **`scripts/check-consumer-spec-pin.sh`** (or **`scripts/check-spec-pin.sh`** in **`intentproof-api`**) that delegates to this script.
- **`scripts/read-consumer-spec-commit.sh`** prints only the declared **commit** SHA (for automation such as CI checkout `ref=`).
- **`scripts/check-consumer-hardening.sh`** audits consumer repos for drift controls and runs **`check-consumer-spec-pins.sh`** against the spec checkout next to it so audits fail closed when pins are missing or do not match `spec.json` / `HEAD`.
- Consumer CI SHOULD check out **`IntentProof/intentproof-spec` at the declared pin SHA** (not only `main`) so jobs stay green when `main` advances past the pin.
- The spec repository still uses **`tools/check-spec-version.ts`** for its own `package.json` `intentproofSpecVersion === spec.json.version` gate (spec repo does not carry an SDK-style commit pin in `package.json`).

## Schema integrity manifest

Normative schema files listed under `spec.json` → `schemas` are hashed in **`artifacts/spec-integrity.v1.json`** with an **Ed25519** detached signature in **`artifacts/spec-integrity.v1.json.sig`**. Verification requires an external public key via **`INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PEM`** (or **`INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PATH`**). **`scripts/run-conformance.sh`** runs **`npm run spec:integrity:verify`** so every conformance run checks hashes and signature. **`scripts/verify-spec-integrity.sh`** is the shell wrapper used when you want install + verify without the full oracle.

Signing policy: this repository standardizes on **Ed25519 + PEM** for portability in CI without extra binaries. Organizations that prefer **Sigstore/cosign** or **GPG** may wrap the same canonical manifest bytes; verification in CI must still run **`npm run spec:integrity:verify`** (or fail closed) unless you replace it with an equivalently strict policy owned by your org.

When schemas change, maintainers regenerate and re-sign (private key is never committed; see `.gitignore`).

## Pull request schema compatibility

CI classifies schema diffs vs the merge base of the PR base branch (only paths from **`spec.json` → `schemas`**). **`BREAKING`** changes require **one** of: GitHub label **`spec-breaking-approved`** on the PR, repository variable **`SPEC_SCHEMA_COMPAT_OVERRIDE=true`** (break-glass, audited), or reverting the schema change. Reports are uploaded as the **`schema-compatibility-report`** artifact.

## Migration (SDK maintainers)

1. Check out the `intentproof-spec` revision you intend to ship against (`spec.json.version` + `git rev-parse HEAD`).
2. Add the **version** and **commit** fields in Node (root + `packages/sdk`), Python (`[tool.intentproof]`), or Gradle (`gradle.properties`) as in the table above.
3. Run **`bash /path/to/intentproof-spec/scripts/check-consumer-spec-pins.sh /path/to/consumer-repo /path/to/spec`** locally; fix mismatches until it passes.
4. If you changed JSON Schemas in the spec repo, regenerate **`artifacts/spec-integrity.v1.json`** and its **`.sig`** there (`npm run spec:integrity:generate` then `npm run spec:integrity:sign -- --private-key /secure/path/spec-integrity.key.pem`), commit the updated manifest + signature. Keep signing private keys **outside** the repo checkout; `tools/spec-integrity.ts sign` rejects in-repo key paths unless `INTENTPROOF_ALLOW_INSECURE_LOCAL_SIGNING_KEY=1` is explicitly set.

## Releases

Release notes SHOULD state the spec git tag (e.g. `spec-v1.0.1`) **and** the spec repository git SHA used for conformance so downstream consumers can audit equivalence across languages.
