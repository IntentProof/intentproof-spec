# Reference Policy Library

Reference policies are curated, versioned policy packs that can be forked into
a tenant workspace and tested locally before activation.

## Layout

Each pack lives at:

```text
reference-policies/<domain>/<pack>/v<major>/
```

The canonical reference ID is dotted:

```text
reference.<domain>.<pack>.v<major>
```

For example, the template pack in this repository is:

```text
reference.templates.minimal-required.v1
```

## Required Files

```text
README.md
pack.json
policy.json
fixtures/<fixture-id>/flow.json
fixtures/<fixture-id>/attestations.jsonl
fixtures/<fixture-id>/expected-run.json
```

`pack.json` declares the pack identity, human-facing summary, and fixture
catalog. `policy.json` is canonical policy JSON for the current schema. CLI
forking commands may render YAML later, but this repository keeps canonical
JSON fixtures so schema validation and fingerprint checks are deterministic.

## Fixture Convention

Each fixture directory name must match an entry in `pack.json.fixtures`.
Fixture IDs use lower-case letters, numbers, and hyphens. A fixture contains:

- `flow.json`: the flow input for verification.
- `attestations.jsonl`: source attestations used by the verifier. Empty files
  are allowed when a policy has no attestation dependency.
- `expected-run.json`: the expected `intentproof.run.v1` shape for conformance
  and future policy-test commands.

## Validation

Run:

```bash
npx ts-node reference-policies/validate.ts
```

The validator enforces directory naming, required files, manifest consistency,
policy schema validity, policy fingerprint correctness, and expected-run schema
validity.
