# intentproof-spec

[![CI](https://github.com/IntentProof/intentproof-spec/actions/workflows/ci.yml/badge.svg)](https://github.com/IntentProof/intentproof-spec/actions/workflows/ci.yml)

Canonical schemas, fixtures, and conformance tooling for IntentProof.

## Who uses this

SDK maintainers, verifier authors, and integrators who need the normative
JSON Schemas, golden fixtures, and cross-language conformance runner.

## Scope

- JSON Schemas in `schema/`
- Golden fixtures in `golden/` (including `golden/multi-agent/` delegation cases)
- Cross-repository compatibility matrix in `compatibility/`
- Ecosystem pin contract in `compatibility/PINS.md` and `compatibility/pins.v1.json`
- Conformance runner in `conformance/runner.ts`
- Integrity manifest/signature tooling in `integrity/`

## Install

```bash
npm install
```

## Verify

- Run the conformance runner (below) against golden fixtures.
- Verify compatibility matrix drift: `make compatibility-matrix-verify`
- Verify ecosystem pin manifest: `make compatibility-pins-verify`
- Dual-trust-root integrity verification (Ed25519 + Cosign/Rekor):
  [`integrity/README.md`](integrity/README.md)

Reserved multi-agent delegation attributes on execution events are documented
in `golden/multi-agent/README.md` (`intentproof.delegation.*` on
`attributes`). Flow grouping and approval policies will consume them in later
platform work.

## Test

```bash
npx ts-node conformance/runner.ts
make compatibility-matrix-verify
make compatibility-pins-verify
```

CI runs schema validation, conformance, and integrity checks.

## Release

Schema and fixture releases are tagged from this repository. Maintainer
integrity manifests are regenerated with
`npx ts-node integrity/generate_manifest.ts` (requires
`secrets/spec-integrity-private.pem`). See [`integrity/README.md`](integrity/README.md).

## Documentation hub

Per-repo README files plus
[`intentproof-infra`](https://github.com/IntentProof/intentproof-infra) for
self-host install and image verification. Docs site deferred — see
[`docs-hub-decision.md`](https://github.com/IntentProof/intentproof-infra/blob/main/docs/docs-hub-decision.md).

## Support

Report bugs, schema ambiguities, and conformance gaps via
[GitHub Issues](https://github.com/IntentProof/intentproof-spec/issues).
See [`CONTRIBUTING.md`](CONTRIBUTING.md). Security reports:
[`SECURITY.md`](SECURITY.md).

## License

Apache License 2.0 — see [`LICENSE`](LICENSE), [`NOTICE`](NOTICE), and
[`TRADEMARK.md`](TRADEMARK.md).
