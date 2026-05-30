# Fuzz seed corpora

Version-controlled seed inputs for Go fuzz tests in `intentproof-tools`. Each
subdirectory holds raw inputs for one target; tools sync these files into
`testdata/fuzz/<FuzzName>/` during local fuzz runs and CI.

## Layout

| Directory | Fuzz target | Owning package |
|-----------|-------------|----------------|
| `canon/` | `FuzzMarshalRaw` (JCS canonicalizer) | `intentproof-tools/pkg/canon` |
| `verifier/` | `FuzzVerify` (evaluator inputs) | `intentproof-tools/pkg/verifier` |
| `bundle/` | `FuzzBundleVerify` (`.proof.tar.zst` bytes) | `intentproof-tools/pkg/bundle` |
| `policy/` | `FuzzCompile` (YAML policy source) | `intentproof-tools/pkg/policy` |

## File format

- `canon/` and `verifier/`: JSON documents (verifier cases wrap `flow`, `policy`, and `attestations`).
- `bundle/`: raw binary inputs (`.bin`).
- `policy/`: YAML policy documents (`.yaml` / `.yml`).

Tools load these files via `INTENTPROOF_SPEC_DIR` during CI (for example
`TestMarshalRawSpecCorpus` in `intentproof-tools/pkg/canon`).

## Adding seeds

1. Add a new file under the target directory.
2. Land the change in `intentproof-spec`.
3. Bump `SPEC_REF` in tools after merge.
4. Re-run fuzz tests in the owning package to confirm deterministic replay.
