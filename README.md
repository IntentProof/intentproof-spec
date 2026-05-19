# intentproof-spec

Canonical schemas, fixtures, and conformance tooling for IntentProof.

## Scope

- JSON Schemas in `schema/`
- Golden fixtures in `golden/` (including `golden/multi-agent/` delegation cases)
- Cross-repository compatibility matrix in `compatibility/`
- Conformance runner in `conformance/runner.ts`
- Integrity manifest/signature tooling in `integrity/`

## Quick start

1. Install deps: `npm install`
2. Run conformance: `npx ts-node conformance/runner.ts`
3. Verify compatibility matrix updates: `make compatibility-matrix-verify`
4. Regenerate integrity artifacts when needed:
   `npx ts-node integrity/generate_manifest.ts` (requires
   `secrets/spec-integrity-private.pem`).

Reserved multi-agent delegation attributes on execution events are documented
in `golden/multi-agent/README.md` (`intentproof.delegation.*` on
`attributes`). Flow grouping and approval policies will consume them in later
platform work.

## License

Apache License 2.0 (`LICENSE`).
