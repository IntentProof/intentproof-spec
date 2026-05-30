# Ecosystem Pin Contract

This document is the canonical reference for cross-repository pin discipline
in the IntentProof federated layout. It complements the compatibility matrix
procedure in [`README.md`](README.md).

Machine-readable pins live in [`pins.v1.json`](pins.v1.json). Verify with:

```bash
make compatibility-pins-verify
```

## Minimum verified tuple

The minimum offline conformance tuple for Stage 1–2 work is:

| Component | Role |
|-----------|------|
| `intentproof-spec` | Schemas, golden fixtures, conformance oracle |
| `intentproof-tools` | Verifier, policy compiler, developer CLI |
| `intentproof-core` | Hosted ingest / flow-builder services that consume spec |

SDK and dashboard repositories join the tuple in later drift phases.

## Pin locations

| Repository | File | Pin kind | Purpose |
|------------|------|----------|---------|
| `intentproof-tools` | `SPEC_REF` | `spec_ref` | CI checks out this spec commit for conformance, golden demo, and fuzz corpora |
| `intentproof-core` | `SPEC_REF` | `spec_ref` | CI checks out this spec commit for policy compiler and reference-policy conformance |
| `intentproof-tools` | `contrib/oss-fuzz/intentproof/pins.env` | `tools_ref`, `spec_ref`, `core_ref` | OSS-Fuzz Docker build SHAs |
| `intentproof-spec` | `compatibility/pins.v1.json` | manifest | Signed record of the current tuple (`spec_ref` + consumer pins) |
| `intentproof-spec` | `compatibility/matrix.v1.json` | matrix row | Release-compatible version tuples (bootstrap today; living rows in Phase 2) |

`SPEC_REF` must be a full 40-character lowercase git SHA pointing at an
`intentproof-spec` commit.

## Invariants

1. **`intentproof-tools` and `intentproof-core` `SPEC_REF` values must be
   identical.** CI enforces this via `scripts/check-ecosystem-pins.sh`.
2. **`pins.v1.json` `spec_ref` must match both consumer `SPEC_REF` files.**
3. **OSS-Fuzz `SPEC_REF` in `pins.env` must match the consumer `SPEC_REF`.**
4. **Any change to `pins.v1.json` or `pins.v1.schema.json` requires
   regenerating the signed integrity manifest** (see [`../integrity/README.md`](../integrity/README.md)).

## When to bump pins

Update pins in a **coordinated PR set** when any of the following change:

| Trigger | Update |
|---------|--------|
| Golden fixtures under `intentproof-spec/golden/` | `SPEC_REF` in tools **and** core; `pins.v1.json`; OSS-Fuzz `SPEC_REF` |
| Fuzz corpora under `intentproof-spec/golden/fuzz-corpora/` | Same as golden fixtures |
| Spec schemas referenced by tools/core compilers | Same as golden fixtures |
| Tools surfaces exported to OSS-Fuzz | `TOOLS_REF` in `pins.env` + manifest entry |
| Core ingest parser exported to OSS-Fuzz | `CORE_REF` in `pins.env` + manifest entry |

### Bump order

1. Merge the **`intentproof-spec`** change first (fixtures/schemas).
2. Open companion PRs in **tools** and **core** that bump `SPEC_REF` to the
   new spec commit **in the same change set** when possible.
3. Update **`compatibility/pins.v1.json`** in spec (same PR as manifest regen
   or immediate follow-up).
4. Refresh the **`"current": true`** row in **`compatibility/matrix.v1.json`**
   (spec/tools/core SHAs must match the pins manifest — see
   [`README.md`](README.md) Path A).
5. Regenerate **`integrity/manifest.v1.json`** when inventoried spec files
   changed.
6. Update **OSS-Fuzz `pins.env`** when fuzz surfaces or spec corpora changed.
7. Run **`scripts/check-ecosystem-pins.sh`** from a workspace checkout before
   pushing.

## Local verification

From a workspace with sibling repositories:

```bash
cd intentproof-spec
INTENTPROOF_TOOLS_DIR=../intentproof-tools \
INTENTPROOF_CORE_DIR=../intentproof-core \
  bash scripts/check-ecosystem-pins.sh
```

From CI, each consumer workflow checks out spec plus sibling repos at `main`
(or the PR head) and runs the same script.

## Related documents

- [`README.md`](README.md) — compatibility matrix update procedure (Path A/B)
- [`compatibility-tuple-follow-up.md`](compatibility-tuple-follow-up.md) — spec follow-up PR checklist
- [`../integrity/README.md`](../integrity/README.md) — manifest signing
- [`../golden/fuzz-corpora/README.md`](../golden/fuzz-corpora/README.md) — fuzz corpus bump notes
