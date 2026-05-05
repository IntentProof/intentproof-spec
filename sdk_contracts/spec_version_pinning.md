# Spec version pinning contract

Every SDK package MUST declare which IntentProof specification revision it implements. CI MUST fail if the field is missing or incompatible with the vendored **`spec.json`** `version` field.

## Required declarations

| Ecosystem | Location | Example |
|-----------|----------|---------|
| Node.js   | Root `package.json` | `"intentproofSpecVersion": "spec-v1.0.0"` |
| Python    | `pyproject.toml` under `[project]` or `[tool.intentproof]` | `intentproof-spec-version = "spec-v1.0.0"` |
| Java (Maven) | Root `pom.xml` inside `<properties>` | `<intentproof.spec.version>spec-v1.0.0</intentproof.spec.version>` |
| Java (Gradle) | `gradle.properties` or root build file | `intentproofSpecVersion=spec-v1.0.0` |

Naming MAY vary by convention; the **value** MUST equal the `version` string in `spec.json` for the git tag or submodule commit you vendor.

## Compatibility checks

- **Exact match** on the spec repo tag used in CI (recommended): `intentproofSpecVersion === spec.json.version`.
- SDKs MAY add a small script that reads `spec.json` and compares to the package metadata; the canonical reference implementation is `tools/check-spec-version.ts` in this repository (Node).

## Releases

Release notes SHOULD state the spec git tag (e.g. `spec-v1.0.0`) used for conformance so downstream consumers can audit equivalence across languages.
