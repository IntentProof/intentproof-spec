# IntentProof Compatibility Matrix

`matrix.v1.json` is the canonical compatibility record for independently
versioned IntentProof repositories. Each row states which versions of the spec,
tools, core services, SDKs, and dashboard were verified together.

Cross-repository **pin discipline** (`SPEC_REF`, OSS-Fuzz SHAs) is documented in
[`PINS.md`](PINS.md) and recorded in [`pins.v1.json`](pins.v1.json).

Each matrix entry may include optional `tuple_id` and `current` fields. At most
one row should set `"current": true` to mark the active HEAD tuple used for
ecosystem drift checks.

## Updating The Matrix

Update the matrix whenever any listed repository publishes a release that
changes an API, schema, verifier behavior, SDK signing behavior, or dashboard
workflow that depends on another IntentProof repository.

1. Publish the component release in its owning repository.
2. Add a matrix row with the released component versions and source refs.
3. Set `release_status` to `released` only when every component in the row has
   a GitHub Release matching its `version`.
4. Record the CI run that verified the tuple in `ci_run`.
5. Run `make compatibility-matrix-verify`.
6. Regenerate and sign `integrity/manifest.v1.json` so the matrix and schema
   are covered by the integrity manifest.
7. Include the matrix update in the same release PR or in the follow-up spec PR
   that documents the release compatibility.

The initial row is marked `source-verified` because the repositories have not
published their first GitHub Releases yet. Future release rows should use
`released`.

## Verification

Run:

```bash
make compatibility-matrix-verify
```

The verifier validates `matrix.v1.json` against
`matrix.v1.schema.json`. Each component `source_ref` must be a full 40-character
git SHA. For rows with `release_status: "released"`, it also
confirms that each referenced component version exists as a GitHub Release in
the corresponding `IntentProof/*` repository.
