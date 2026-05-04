# IntentProof Specification (`intentproof-spec`)

**Canonical repository:** [github.com/intentproof/intentproof-spec](https://github.com/intentproof/intentproof-spec) (issues, releases, and source of truth).

This repo defines **execution semantics**, **JSON Schemas**, **golden oracles**, and **conformance tests** for IntentProof SDKs (Node.js, Python, Java). It is the authority layer for cross-language correctness: SDKs match only when they emit the same `ExecutionEvent` shapes and behavior described here.

**Normative schema files** (pin a tag or commit in production, not only `main`):

| Schema | Raw on `main` |
|--------|----------------|
| `execution_event.v1` | [`execution_event.v1.schema.json`](https://raw.githubusercontent.com/intentproof/intentproof-spec/main/schema/execution_event.v1.schema.json) |
| `wrap_options.v1` | [`wrap_options.v1.schema.json`](https://raw.githubusercontent.com/intentproof/intentproof-spec/main/schema/wrap_options.v1.schema.json) |
| `intentproof_config.v1` | [`intentproof_config.v1.schema.json`](https://raw.githubusercontent.com/intentproof/intentproof-spec/main/schema/intentproof_config.v1.schema.json) |

Each file under `schema/` sets `"$id"` to `https://intentproof.dev/schema/…`. That string is a **JSON Schema document identifier** (stable name and `$ref` base for validators). **It does not imply** a public HTTP server at that host. The **normative** text is always the file in this repository at the paths above.

### Prerequisites

- **Node.js 18+** and **npm** (Node **22** recommended; see `.nvmrc` for the version used in CI).
- No runtime beyond Node is required for schemas, golden files, Vitest, or `scripts/run-conformance.sh`.

## Repository layout

| Path | Purpose |
|------|---------|
| `schema/` | JSON Schema Draft 2020-12 definitions (`execution_event`, `wrap_options`, `intentproof_config`). |
| `semantics/` | Normative prose for wrap behavior, correlation, errors, lifecycle, exporters, and serialization. |
| `constraints/` | Invariants, validation rules, and required field matrices. |
| `examples/` | Curated JSON fixtures for manual review and schema smoke tests. |
| `golden/` | Machine-readable oracle lines (`.jsonl`) consumed by CI in every SDK. |
| `tests/conformance/` | Vitest suite: schema gates, semantics checks, golden equivalence, correlation fixtures. |
| `tests/lib/` | Shared validators (`validator.ts`, `semantics.ts`, `canonical-json.ts`). |
| `tests/runners/sdk_test_harness.ts` | Stable entrypoint other SDKs vendor or submodule to reuse oracle logic. |
| `sdk_contracts/` | Language-native contract sketches aligned with the schemas. |
| `tools/` | CLI helpers for validating, canonicalizing, and diffing events. |
| `scripts/run-conformance.sh` | **SDK CI entrypoint:** installs deps, runs `tsc`, Vitest conformance, and example event validation. |
| `LICENSE` / `NOTICE` | Apache-2.0 terms and attribution. |
| `CHANGELOG.md` | Human-readable history of spec-facing changes. |
| `.github/` | CI workflow (`workflows/ci.yml`) and Dependabot config. |

## Versioning model

- **Spec v1** maps to `schema/*.v1.schema.json` and `golden/*_cases.jsonl` in this repository.
- Release tags SHOULD use `spec-v1.x.y` SemVer for schema- and golden-compatible evolution:
  - **PATCH**: clarify docs, add non-breaking golden positives, tighten tests without invalidating conforming SDKs.
  - **MINOR**: add optional schema fields (still backward compatible for readers) or new golden cases all SDKs must satisfy going forward.
  - **MAJOR**: breaking schema or semantic changes → new `v2` schema files + new golden files; SDK major bumps follow.

SDK packages SHOULD declare the **spec git tag** (or internal package version, if you publish a mirror of this repo) they were validated against in their release notes.

## Integration for SDK maintainers

1. **Vendor or submodule** this repository next to the SDK (or publish an internal npm package that ships `schema/`, `golden/`, and harness entrypoints). In CI, run **`scripts/run-conformance.sh`** (see below) against the pinned checkout so every language runs the same oracle.
2. **Validate every emitted event** against `schema/execution_event.v1.schema.json` using a Draft 2020-12 compatible validator.
3. **Run semantic checks** equivalent to `tests/lib/semantics.ts` after schema success (duration vs timestamps, attribute primitive shape, forbidden `error` field on `ok`, correlation trimming).
4. **Load `golden/execution_event_cases.jsonl`** and assert `shouldValidate` matches the outcome of schema+semantics for each `event` payload. Any drift fails CI.
5. **Load `golden/wrap_behavior_cases.jsonl`** in language-specific tests to assert wrap defaults, capture flags, correlation propagation, and exporter ordering behaviors match the expectations encoded in each JSON object.
6. **Mirror contracts** in `sdk_contracts/` when evolving public types.

Serialization rules for captured payloads are normative in `semantics/serialization_rules.md` (see also `constraints/validation_rules.md`).

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

GitHub Actions runs the **language-agnostic conformance script** on every push and pull request (see `.github/workflows/ci.yml`). Dependabot is configured for **npm** and **GitHub Actions** (see `.github/dependabot.yml`).

### SDK CI (Python / Java / any runner)

Vendor this repository (submodule, subtree, or copy at a pinned tag), install **Node.js 18+**, then invoke:

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

Equivalent from inside a clone of this repo: `npm run conformance` (runs the same shell script). For a quick local gate without the shell wrapper: `npm run ci:local` (typecheck + Vitest).

This is the **canonical executable oracle** for schema, semantics, and golden JSONL expectations; SDKs SHOULD pin a spec git tag and run this script in CI whenever that pin changes.

## Commands

```bash
npm install
npm run typecheck              # TypeScript --noEmit (same as CI)
npm test
npm run ci:local               # typecheck + vitest
npm run conformance            # install + typecheck + vitest + example smoke (see scripts/run-conformance.sh)
npm run validate:event -- examples/success_event.json
npm run normalize:event -- examples/success_event.json
npm run diff:events -- examples/success_event.json examples/error_event.json
npm audit                       # expect 0 vulnerabilities on a fresh install
```

## Success criteria (release gate)

- Node, Python, and Java SDKs each execute the **same golden assertions** (file-for-file) against `golden/`.
- `ExecutionEvent` payloads are byte-identical after **canonical normalization** (`tools/normalize-event.ts`, helpers in `tests/lib/canonical-json.ts`) for deterministic fixtures.
- No semantic drift: wrap ordering, correlation propagation, and error mapping follow `semantics/*.md`.
- CI fails on any extra root fields (`additionalProperties: false` in schema) or forbidden states (`shouldValidate: false` golden cases must keep failing).

## Governance

Changes that affect interoperability require:

1. Schema or golden updates in this repo.
2. Parallel PRs (or a coordinated release train) to every supported SDK updating their vendored spec hash and tests.

This process keeps IntentProof a **formal specification with an executable oracle**, not informal documentation.

## License

Licensed under the **Apache License, Version 2.0**; see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).

## Security

Report sensitive issues through **GitHub Security Advisories** (or your org’s equivalent private channel). Do not open public issues for undisclosed vulnerabilities.
