# intentproof-spec

Canonical schemas, fixtures, and conformance tooling for IntentProof.

## Scope

- JSON Schemas in `schema/`
- Golden fixtures in `golden/`
- Conformance runner in `conformance/runner.ts`
- Integrity manifest/signature tooling in `integrity/`

## Quick start

1. Install deps: `npm install`
2. Run conformance: `npx ts-node conformance/runner.ts`
3. Regenerate integrity artifacts when needed.

## License

Apache License 2.0 (`LICENSE`).
