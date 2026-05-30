# intentproof-spec

[![CI](https://github.com/IntentProof/intentproof-spec/actions/workflows/ci.yml/badge.svg)](https://github.com/IntentProof/intentproof-spec/actions/workflows/ci.yml)

Normative schemas, golden fixtures, and cross-language conformance tooling for
the local-first IntentProof stack.

## Contents

- [v0.1 local contract](docs/v0.1-local-contract.md)
- JSON Schemas in `schema/`
- Golden fixtures in `golden/` (including counterparty bundles)
- Conformance runner in `conformance/`
- Compatibility records in `compatibility/` (OSS repos only; legacy matrix
  fields for retired repos are placeholders until the next tuple refresh)

## Verify locally

```bash
npm install
npx ts-node conformance/runner.ts
make compatibility-matrix-verify
make compatibility-pins-verify
```

Integrity manifest verification: [`integrity/README.md`](integrity/README.md).

## Support

[GitHub Issues](https://github.com/IntentProof/intentproof-spec/issues) —
see [CONTRIBUTING.md](CONTRIBUTING.md). Security reports:
`security@intentproof.io` or a private GitHub Security Advisory.

## License

MIT — see [LICENSE](LICENSE).
