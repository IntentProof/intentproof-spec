# Compatibility matrix

`matrix.v1.json` records which OSS repository commits were verified together.
`pins.v1.json` holds the current `spec_ref` and related consumer SHAs.

Pin discipline: [`PINS.md`](PINS.md).

## OSS tuple (today)

The living product is **spec + tools + SDKs**, verified via golden bundles and
conformance runners.

At most one row sets `"current": true`. CI checks that row against
`pins.v1.json` where configured.

## Drift protection (CI)

Cross-repo drift is blocked in GitHub Actions:

| Repo | Gate |
|------|------|
| `intentproof-spec` | `scripts/check-ecosystem-pins.sh` — `pins.spec_ref` matches `HEAD`, tools `SPEC_REF` matches pins, matrix schema |
| `intentproof-tools` | Checkout spec at `SPEC_REF`; `scripts/check-spec-conformance.sh` after `go test` |
| SDK repos | `SOURCE_REF` must match `HEAD`; spec CI checks all SDK `SOURCE_REF` vs pins/matrix; tests use spec at tools `SPEC_REF`; `check-sdk-signing-fixtures-sync.sh` |

Local parity:

```bash
# From intentproof-spec (sibling intentproof-tools required)
bash scripts/check-ecosystem-pins.sh
```

## Update (source-verified)

1. Merge the driving change (usually spec fixtures/schemas first).
2. Bump `SPEC_REF` in tools when spec moved.
3. Update `pins.v1.json` and the `"current": true` row in `matrix.v1.json`.
4. Run `make compatibility-matrix-verify` and `make compatibility-pins-verify`.
5. Regenerate the signed integrity manifest when inventoried files changed.

## Verify

```bash
make compatibility-matrix-verify
make compatibility-pins-verify
```

Optional sibling checkout checks (when present):

```bash
INTENTPROOF_TOOLS_DIR=../intentproof-tools npx ts-node compatibility/verify_pins.ts
```
