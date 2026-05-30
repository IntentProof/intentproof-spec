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

Legacy repository names in older matrix rows are placeholders until the
compatibility schema is trimmed.

## Pin files

| Repository | File | Purpose |
|------------|------|---------|
| `intentproof-tools` | `SPEC_REF` | Spec commit used in tools CI |
| `intentproof-tools` | `contrib/oss-fuzz/intentproof/pins.env` | Optional fuzz build SHAs |
| `intentproof-spec` | `compatibility/pins.v1.json` | Signed manifest of current SHAs |
| `intentproof-spec` | `compatibility/matrix.v1.json` | Tuple history |

`SPEC_REF` must be a full 40-character lowercase git SHA.

## When to bump

Bump together when golden fixtures, schemas, or verifier behavior changes:

1. Merge the **spec** change first.
2. Bump **`SPEC_REF`** in **tools** (and regenerate pins/matrix when required).
3. Refresh SDK conformance as needed.
4. Regenerate the integrity manifest when inventoried spec files change — see
   [`../integrity/README.md`](../integrity/README.md).

Matrix update procedure: [`README.md`](README.md).
