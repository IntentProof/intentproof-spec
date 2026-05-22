# Fuzz seed corpora

Version-controlled seed inputs for continuous fuzzing of IntentProof attack
surfaces. Each subdirectory holds raw fuzz inputs for one target; CI and
OSS-Fuzz sync these files into Go `testdata/fuzz/<FuzzName>/` before running
native fuzz tests.

## Layout

| Directory | Fuzz target | Owning repo |
|-----------|-------------|-------------|
| `canon/` | `FuzzMarshalRaw` (JCS canonicalizer) | `intentproof-tools/pkg/canon` |
| `verifier/` | `FuzzVerify` (evaluator inputs) | `intentproof-tools/pkg/verifier` |
| `bundle/` | `FuzzBundleVerify` (`.proof.tar.zst` bytes) | `intentproof-tools/pkg/bundle` |
| `policy/` | `FuzzCompile` (YAML policy source) | `intentproof-tools/pkg/policy` |
| `ingest/` | `FuzzParseExecutionEvent` (execution event JSON bodies) | `intentproof-core/pkg/ingest` |

## File format

- `canon/` and `verifier/`: JSON documents (verifier cases wrap `flow`, `policy`, and `attestations`).
- `ingest/`: JSON execution event bodies accepted by the hosted ingest parser.
- `bundle/`: raw binary inputs (`.bin`).
- `policy/`: YAML policy documents (`.yaml` / `.yml`).

Consuming repos load these files directly via `INTENTPROOF_SPEC_DIR` during CI
(`TestMarshalRawSpecCorpus` in `intentproof-tools/pkg/canon`) and copy them
into Go `testdata/fuzz/<FuzzName>/` when preparing OSS-Fuzz builds.

## Adding seeds

1. Add a new file under the target directory.
2. Land the change in `intentproof-spec`.
3. Bump the consuming repo's `SPEC_REF` pin after merge.
4. Re-run the fuzz gate in the owning repo to confirm deterministic replay.
