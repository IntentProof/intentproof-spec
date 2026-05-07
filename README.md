# IntentProof Specification (`intentproof-spec`)

**Canonical repository:** [IntentProof specification on GitHub](https://github.com/IntentProof/intentproof-spec) (issues, releases, and source of truth).

This repo defines **execution semantics**, **JSON Schemas**, **golden oracles**, and **conformance tests** for IntentProof SDKs (Node.js, Python, Java). It is the authority layer for cross-language correctness: SDKs match only when they emit the same `ExecutionEvent` shapes and behavior described here.

**Normative schema files** (pin a tag or commit in production, not only `main`):

| Schema | Raw on `main` |
|--------|----------------|
| `execution_event.v1` | [`execution_event.v1.schema.json`](https://raw.githubusercontent.com/IntentProof/intentproof-spec/main/schema/execution_event.v1.schema.json) |
| `wrap_options.v1` | [`wrap_options.v1.schema.json`](https://raw.githubusercontent.com/IntentProof/intentproof-spec/main/schema/wrap_options.v1.schema.json) |
| `intentproof_config.v1` | [`intentproof_config.v1.schema.json`](https://raw.githubusercontent.com/IntentProof/intentproof-spec/main/schema/intentproof_config.v1.schema.json) |

Each file under `schema/` sets `"$id"` to `https://intentproof.dev/schema/…`. That string is a **JSON Schema document identifier** (stable name and `$ref` base for validators). **It does not imply** a public HTTP server at that host. The **normative** text is always the file in this repository at the paths above.

### Prerequisites

- **Node.js 22+** and **npm** (see **`.nvmrc`** for the exact version CI uses; **`package.json`** **`engines`** matches).
- No runtime beyond Node is required for schemas, golden files, Vitest, or `scripts/run-conformance.sh`.

## Repository layout

| Path | Purpose |
|------|---------|
| `schema/` | JSON Schema Draft 2020-12 definitions (`execution_event`, `wrap_options`, `intentproof_config`). |
| `semantics/` | Normative prose for wrap behavior, correlation, errors, lifecycle, exporters, and serialization. |
| `constraints/` | Invariants, validation rules, and required field matrices. |
| `examples/` | Curated JSON fixtures for manual review and schema smoke tests. |
| `spec.json` | **Single manifest:** schema paths, golden paths, semantics paths, spec version — SDKs anchor here. |
| `golden/` | Machine-readable oracle lines (`.jsonl`) consumed by CI in every SDK. |
| `tests/conformance/` | Vitest suite: schema gates, semantics checks, golden equivalence, canonicalization vectors. |
| `tests/lib/` | Shared validators (`validator.ts`, `semantics.ts`, `spec-manifest.ts`). |
| `tests/runners/sdk_test_harness.ts` | Stable entrypoint other SDKs vendor or submodule to reuse oracle logic. |
| `sdk_contracts/` | Type-generation rules (`type_generation.md`), drift hardening checklist (`drift_hardening_checklist.md`), conformance boundary notes (`conformance_reality.md`), version pinning (`spec_version_pinning.md`). Index: [`sdk_contracts/README.md`](sdk_contracts/README.md). |
| `tools/canonical/` | Normative canonical JSON (`canonical-json.ts`) referenced by `semantics/serialization_rules.md`. |
| `tools/replay/` | Cross-SDK JSONL stream comparison (`compare-streams.ts`) post-canonicalization. |
| `tools/` | CLI helpers for validating, canonicalizing, diffing, spec version checks, conformance JSON reports. |
| `scripts/run-conformance.sh` | **Executable spec oracle:** installs deps, version pin check, **signed schema integrity verify**, `tsc`, Vitest, smoke, optional replay & JSON output. |
| `scripts/check-sdk-spec-pins.sh` | Canonical **version + git SHA** pin check for Node / Python / Java SDK trees. |
| `artifacts/spec-integrity.v1.json` (+ `.sig`) | Deterministic SHA-256 manifest over `spec.json` → `schemas.*`; verified every conformance run. |
| `INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PEM` / `INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PATH` | External Ed25519 public key input used by integrity verification (private key stays off-repo). |
| `LICENSE` / `NOTICE` | Apache-2.0 terms and attribution. |
| `CHANGELOG.md` | Human-readable history of spec-facing changes. |
| `.github/` | CI (`workflows/ci.yml`: conformance, schema compatibility on PRs, shellcheck), cross-SDK parity (`workflows/cross-sdk-parity.yml`: schedule + manual, tag-anchored target), SDK release train (`workflows/sdk-release-train.yml`: `spec-v*` tag or manual → bot PRs to bump SDK pins), Dependabot. |

## Versioning model

- **Spec v1** maps to `schema/*.v1.schema.json` and `golden/*_cases.jsonl` in this repository.
- Release tags SHOULD use `spec-v1.x.y` SemVer for schema- and golden-compatible evolution:
  - **PATCH**: clarify docs, add non-breaking golden positives, tighten tests without invalidating conforming SDKs.
  - **MINOR**: add optional schema fields (still backward compatible for readers) or new golden cases all SDKs must satisfy going forward.
  - **MAJOR**: breaking schema or semantic changes → new `v2` schema files + new golden files; SDK major bumps follow.

SDK packages SHOULD declare the **spec git tag** (or internal package version, if you publish a mirror of this repo) they were validated against in their release notes.

## Integration for SDK maintainers

1. **Vendor or submodule** this repository next to the SDK and treat **`spec.json` as the only path index** to schemas, goldens, and semantics. In CI, run **`scripts/run-conformance.sh`** against the pinned checkout so every language runs the same oracle. Declare **`intentproofSpecVersion`** and **`intentproofSpecCommit`** (see `sdk_contracts/spec_version_pinning.md`): the version MUST equal `spec.json.version`, and the commit MUST equal `git rev-parse HEAD` in that checkout.
2. **Validate every emitted event** against the execution-event schema from `spec.json` → `schemas.execution_event` using a Draft 2020-12 compatible validator.
3. **Run semantic checks** equivalent to `tests/lib/semantics.ts` after schema success (duration vs timestamps, attribute primitive shape, forbidden `error` field on `ok`, correlation trimming).
4. **Load `golden/execution_event_cases.jsonl`** and assert `shouldValidate` matches the outcome of schema+semantics for each `event` payload. Any drift fails CI.
5. **Load `golden/wrap_behavior_cases.jsonl`** in language-specific tests to assert wrap defaults, capture flags, correlation propagation, and exporter ordering behaviors match the expectations encoded in each JSON object.
6. **Generate types** from JSON Schema per `sdk_contracts/type_generation.md`; do not hand-edit `ExecutionEvent` / `WrapOptions` as the source of truth.
7. **Audit SDK hardening controls** from this repo when wiring CI/release gates:

```bash
bash scripts/check-sdk-hardening.sh /absolute/path/to/intentproof-sdk-<node|python|java>
```

For a compact map of pins, signed-schema verification, codegen drift gates, and conformance enforcement, see **[Continuous integration → Drift protection at a glance](#drift-protection-at-a-glance)** below.

Serialization rules for captured payloads are normative in `semantics/serialization_rules.md` (see also `constraints/validation_rules.md`). Byte-identical `ExecutionEvent` comparisons use the canonical projection in that document, implemented under `tools/canonical/`.

### Node.js

- Add a devDependency or git submodule to this repo.
- Import `assertGoldenExecutionEventOracle` from `tests/runners/sdk_test_harness.ts` inside Vitest/Jest, or call `bash scripts/run-conformance.sh` in CI for the full oracle.
- Ship **Ajv** (or equivalent) validation in debug/test builds at minimum; production validation is strongly recommended until performance gates prove safe.

### Python

- Use `jsonschema` with Draft202012Validator referencing the same schema files on disk.
- Port `tests/lib/semantics.ts` logic if you cannot run Node in CI; otherwise prefer `scripts/run-conformance.sh` against the vendored spec.
- Parse `golden/*.jsonl` with stdlib `json` line-wise.

### Java

- Use `networknt/json-schema-validator` or `everit-org/json-schema` configured for Draft 2020-12.
- Parse golden files with Jackson streaming or `Files.readAllLines`.
- Prefer invoking `scripts/run-conformance.sh` in CI when Node is available so semantics stay centralized.

## Continuous integration

### Drift protection at a glance

Cross-SDK drift controls are spelled out in `sdk_contracts/drift_hardening_checklist.md`. Here is a short map from **theme** to **where it is enforced**:

| Theme | In this repo (`intentproof-spec`) | In SDK repos |
|-------|-----------------------------------|--------------|
| **Pins** (`spec.json` version + immutable commit) | `scripts/check-sdk-spec-pins.sh`; `scripts/check-sdk-hardening.sh`; `scripts/read-sdk-spec-commit.sh` | Pin fields in manifests (`package.json`, `pyproject.toml`, `gradle.properties`, …); CI checks out **declared SHA**; each SDK’s `scripts/check-sdk-spec-pin.sh` delegates to the spec script |
| **Signed normative schemas** | `npm run spec:integrity:verify` inside `scripts/run-conformance.sh`; manifest `artifacts/spec-integrity.v1.json` + signature; `scripts/verify-spec-integrity.sh` | Run the same verify/conformance against the **pinned** spec tree |
| **No handwritten canonical wire models** | `scripts/check-sdk-no-handwritten-model-types.sh` | Thin bridges only; delegate script required by `check-sdk-hardening.sh` |
| **Generated sources match regen** | Hardening requires drift scripts to exist | `verify-generated-types.sh` (Node/Python) / `verify-generated-pojos.sh` (Java): regen + `git diff --exit-code` |
| **Pinned codegen tools** | Regex checks in `check-sdk-hardening.sh` | Exact versions (npm/pip/Toml/Gradle catalog) |
| **Executable oracle (schemas + semantics + goldens)** | `scripts/run-conformance.sh`; Vitest under `tests/conformance/` | `scripts/spec-conformance.sh` → spec runner; upload `conformance-report.json` where applicable |
| **Breaking schema changes explicit on PRs** | Workflow `schema-compatibility` in `.github/workflows/ci.yml` (`tools/schema-compatibility-classify.ts`); label **`spec-breaking-approved`** or **`SPEC_SCHEMA_COMPAT_OVERRIDE`** | Coordinated pin bumps when adopting breaks |
| **Cross-language alignment** | `.github/workflows/cross-sdk-parity.yml`: **weekly schedule** + **`workflow_dispatch`** against a resolved **spec tag/commit** (optional `spec_ref`, optional **strict full adoption**); per-SDK adoption vs target commit; central stream compare when all SDKs are adopted. **SDK release train** (`.github/workflows/sdk-release-train.yml`) can open pin-bump PRs after **`spec-v*`** tags via org GitHub App credentials. | Each SDK’s CI still runs hardening, pin checks, drift verify, and `spec-conformance.sh` on PRs |
| **Optional incident fingerprint** | `npm run spec:fingerprint` | Optional CI hook for debugging |

Shell scripts under `scripts/` are linted in CI (**shellcheck**). Detail beyond this table: `sdk_contracts/spec_version_pinning.md`, `sdk_contracts/type_generation.md`.

GitHub Actions runs the **language-agnostic conformance script** on every push and pull request (see `.github/workflows/ci.yml`), including **signed schema integrity verification** and, on pull requests, a **schema compatibility** job (**`BREAKING`** changes need PR label **`spec-breaking-approved`** or repository variable **`SPEC_SCHEMA_COMPAT_OVERRIDE=true`** as a documented break-glass escape hatch). **Cross-SDK parity** (`.github/workflows/cross-sdk-parity.yml`) does **not** run on spec `push`; it runs on a **weekly schedule** and **`workflow_dispatch`**, targets a **stable spec ref** (tag/commit), and skips or fails based on **SDK adoption** vs that target. PRs that change normative paths get a **parity policy note** in CI pointing maintainers at manual/scheduled parity and SDK pin follow-up. After **`spec-v*`** tags, **SDK release train** (`.github/workflows/sdk-release-train.yml`) can propose SDK pin updates via PRs. Dependabot is configured for **npm** and **GitHub Actions** (see `.github/dependabot.yml`).

### SDK CI (Python / Java / any runner)

Vendor this repository (submodule, subtree, or copy at a pinned tag), install **Node.js 22+** (see **`.nvmrc`** in this repo), then invoke:

```bash
bash path/to/intentproof-spec/scripts/run-conformance.sh
```

From your monorepo root you can pass the spec path explicitly:

```bash
bash vendor/intentproof-spec/scripts/run-conformance.sh vendor/intentproof-spec
```

Or set **`INTENTPROOF_SPEC_ROOT`** to an absolute path to the spec checkout.

| Environment variable | Effect |
|----------------------|--------|
| `INTENTPROOF_SPEC_ROOT` | Use this directory as the spec repo (instead of resolving from the script location or first argument). |
| `INTENTPROOF_SPEC_SKIP_INSTALL=1` | Skip `npm ci` / `npm install` (requires an existing `node_modules` in the spec tree, for example from a cache step). |
| `INTENTPROOF_SPEC_SKIP_SMOKE=1` | Skip `validate:event` on the reference examples after Vitest. |
| `INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PEM` | PEM public key used by `spec:integrity:verify` (preferred). |
| `INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PATH` | Path to PEM public key for `spec:integrity:verify` (alternative to `*_PEM`). |
| `INTENTPROOF_CERTIFICATE_SIGNING_KEY_PEM` | Optional PEM private key (Ed25519) used to sign `conformance-certificate.json`. |
| `INTENTPROOF_CERTIFICATE_SIGNING_KEY_ID` | Optional key id embedded in certificate signature (`intentproof-ci-ed25519-v1` default). |
| `INTENTPROOF_CERTIFICATE_PUBLIC_KEY_PEM` | PEM public key used by `validate:conformance-certificate` for signature verification. |
| `INTENTPROOF_CERTIFICATE_REQUIRE_SIGNATURE=1` | Fail certificate validation when signature is missing. |

Equivalent from inside a clone of this repo: `npm run conformance` (runs the same shell script). For a quick local gate without the shell wrapper: `npm run ci:local` (typecheck + Vitest).

This is the **canonical executable oracle** for schema, semantics, and golden JSONL expectations; SDKs SHOULD pin a spec git tag and run this script in CI whenever that pin changes.

When `INTENTPROOF_CONFORMANCE_JSON=1`, the runner emits a validated
`conformance-report.json` (`schema/conformance_report.v1`) and, when issuance
gates pass, `conformance-certificate.json` (`schema/conformance_certificate.v1`);
CI runs `npm run validate:conformance-certificate` and uploads report + certificate
(**`conformance-artifacts`** in `ci.yml`, **`conformance-artifacts-<sdk>`** in parity
for adopted SDKs). See `docs/conformance-report.md` and
`docs/certificate-issuance-policy.md`.

## Commands

```bash
npm install
npm run typecheck              # TypeScript --noEmit (same as CI)
npm test
npm run ci:local               # typecheck + vitest
npm run conformance            # install + typecheck + vitest + example smoke (see scripts/run-conformance.sh)
npm run validate:conformance-certificate  # after a JSON conformance run: schema + digest binding checks
npm run validate:event -- examples/success_event.json
npm run normalize:event -- examples/success_event.json
npm run diff:events -- examples/success_event.json examples/error_event.json
npm run spec:fingerprint       # deterministic schema fingerprint from spec.json -> schemas.*
npm audit                       # expect 0 vulnerabilities on a fresh install
```

## Success criteria (release gate)

- Node, Python, and Java SDKs each execute the **same golden assertions** (file-for-file) against `golden/`.
- `ExecutionEvent` payloads are byte-identical after **canonical normalization** (`tools/normalize-event.ts`, `tools/canonical/canonical-json.ts`) for deterministic fixtures.
- No semantic drift: wrap ordering, correlation propagation, and error mapping follow `semantics/*.md`.
- CI fails on any extra root fields (`additionalProperties: false` in schema) or forbidden states (`shouldValidate: false` golden cases must keep failing).

## Contributing

See **[`CONTRIBUTING.md`](CONTRIBUTING.md)** (local verification, schema PR policy, integrity manifest rotation, **shared terminology** with SDK repos).

## Governance

Changes that affect interoperability require:

1. Schema or golden updates in this repo.
2. Parallel PRs (or a coordinated release train) to every supported SDK updating their vendored spec hash and tests.

This process keeps IntentProof a **formal specification with an executable oracle**, not informal documentation.

## License

Licensed under the **Apache License, Version 2.0**; see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).

## Security

Report sensitive issues through **GitHub Security Advisories** (or your org’s equivalent private channel). Do not open public issues for undisclosed vulnerabilities.
