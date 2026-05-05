# Conformance report v1

`conformance-report.v1` is the machine-readable proof artifact emitted by
`scripts/run-conformance.sh` when `INTENTPROOF_CONFORMANCE_JSON=1`.

## Schema

- Schema path: `schema/conformance_report.v1.schema.json`
- Manifest key: `spec.json -> schemas.conformance_report`
- Output file: `conformance-report.json` in the `intentproof-spec` checkout root

Core fields:

- `specVersion`: `spec.json.version`
- `specFingerprint`: SHA-256 over all `spec.json` referenced `schemas`, `goldens`,
  and `semantics` files
- `sdk`: name/language/version metadata from environment
- `environment`: runtime + OS string
- `results`: per-phase status (`pass`/`fail`/`skip`) for:
  - `schemaValidation`
  - `semanticValidation`
  - `goldenTests`
  - `replayParity`
- `replay`:
  - `canonicalHash`: canonical JSONL hash for the first replay stream
  - `streamHashes`: per-stream canonical JSONL hashes
- `generatedAt`: RFC 3339 timestamp

Example:

```json
{
  "specVersion": "spec-v1.0.0",
  "specFingerprint": "58c8e26829e9662f8993d7442440bec304f20430683fdd9b5d400626feaabb28",
  "sdk": {
    "name": "intentproof-sdk-node",
    "language": "typescript",
    "version": "0.1.2"
  },
  "environment": {
    "runtime": "node v22.22.0",
    "os": "linux 6.19.10-300.fc44.aarch64"
  },
  "results": {
    "schemaValidation": "pass",
    "semanticValidation": "pass",
    "goldenTests": "pass",
    "replayParity": "pass"
  },
  "replay": {
    "canonicalHash": "aee9ba9cebe4c3491ab1f297fdf98bbf1eb1cc3bf4607a4b5d385299aaf08027",
    "streamHashes": {
      "stream1": "aee9ba9cebe4c3491ab1f297fdf98bbf1eb1cc3bf4607a4b5d385299aaf08027",
      "stream2": "aee9ba9cebe4c3491ab1f297fdf98bbf1eb1cc3bf4607a4b5d385299aaf08027"
    }
  },
  "generatedAt": "2026-05-05T14:02:24.221Z"
}
```

## How SDKs generate it

SDK CI jobs call `scripts/spec-conformance.sh`, which delegates to this repo’s
`scripts/run-conformance.sh` with:

- `INTENTPROOF_SPEC_ROOT` pointing to this checkout
- `INTENTPROOF_CONFORMANCE_JSON=1`
- `INTENTPROOF_REPLAY_VERIFY=1`
- `INTENTPROOF_SDK_ID` (and optional SDK metadata env vars)
- `INTENTPROOF_SDK_NAME`, `INTENTPROOF_SDK_LANGUAGE`, `INTENTPROOF_SDK_VERSION`
  for standardized SDK identity fields in the report

`run-conformance.sh` computes phase results, runs replay comparison, and emits a
validated `conformance-report.json`.

## CI validation requirements

Conformance CI should fail when any of the following occurs:

- `conformance-report.json` is missing
- report does not validate against `conformance_report.v1` schema
- any `results.*` value is not `pass`

SDK CI should upload `conformance-report.json` as a build artifact for
cross-run auditing and future certificate workflows.

## Future certificate issuance

`conformance-report.json` is designed as the canonical input artifact for
certificate issuance in a future phase:

- deterministic spec fingerprint binds report to normative spec content
- replay/canonical hashes bind report to cross-SDK output equivalence
- structured phase results support policy-based issuance gates
