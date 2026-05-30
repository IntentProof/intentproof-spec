# Ecosystem pins (OSS)

Cross-repo pins keep `intentproof-spec`, `intentproof-tools`, and the SDKs on
the same fixture and schema commit during coordinated changes.

Machine-readable state: [`pins.v1.json`](pins.v1.json). Verify:

```bash
make compatibility-pins-verify
```

## Active components

| Repository | Role |
|------------|------|
| `intentproof-spec` | Schemas, golden fixtures, conformance oracle |
| `intentproof-tools` | Verifier, policy compiler, developer CLI |
| `intentproof-sdk-node` | Node signing SDK |
| `intentproof-sdk-python` | Python signing SDK |
| `intentproof-sdk-go` | Go signing SDK |

## Pin files

| Repository | File | Purpose |
|------------|------|---------|
| `intentproof-tools` | `SPEC_REF` | Spec commit used in tools CI |
| `intentproof-sdk-*` | `SOURCE_REF` | That SDK repo commit in the current tuple |
| `intentproof-spec` | `compatibility/pins.v1.json` | Manifest of current SHAs |
| `intentproof-spec` | `compatibility/matrix.v1.json` | Tuple history |

`SPEC_REF` and `SOURCE_REF` must be full 40-character lowercase git SHAs.
Each SDK runs `scripts/check-source-ref.sh` to catch commits on `main` that
forgot to bump `SOURCE_REF`. Spec CI checks out each SDK at the pinned
`source_ref` SHA and verifies `git rev-parse HEAD` matches pins; when
`SOURCE_REF` is present it must match that same SHA (tuple tip commit).

## When to bump

Bump together when golden fixtures, schemas, or verifier behavior changes:

1. Merge the **spec** change first.
2. Bump **`SPEC_REF`** in **tools** (and regenerate pins/matrix when required).
3. Refresh SDK conformance as needed.
4. Regenerate the integrity manifest when inventoried spec files change — see
   [`../integrity/README.md`](../integrity/README.md).

Matrix update procedure: [`README.md`](README.md).
