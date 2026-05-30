# IntentProof Compatibility Matrix

`matrix.v1.json` is the canonical compatibility record for independently
versioned IntentProof repositories. Each row states which versions of the spec,
tools, core services, SDKs, and dashboard were verified together.

Cross-repository **pin discipline** (`SPEC_REF`, OSS-Fuzz SHAs) is documented in
[`PINS.md`](PINS.md) and recorded in [`pins.v1.json`](pins.v1.json).

Each matrix entry may include optional `tuple_id` and `current` fields. At most
one row should set `"current": true` to mark the active tuple used for ecosystem
drift checks. CI asserts that row's spec/tools/core `source_ref` values match
`pins.v1.json`.

## Update paths

Two update paths exist until every component publishes GitHub Releases.

### Path A — Rolling source-verified tuple (default today)

Use this on **intentional ecosystem bumps**: golden fixture changes, fuzz corpus
updates, OSS-Fuzz pin refreshes, or coordinated `SPEC_REF` bumps.

1. Merge the driving change (usually `intentproof-spec` fixtures/schemas first).
2. Open companion PRs in **tools** and **core** when `SPEC_REF` or OSS-Fuzz
   pins change (see [`PINS.md`](PINS.md) bump order).
3. In **spec**, update **`pins.v1.json`** to record the new consumer SHAs.
4. Refresh the **`"current": true`** row in **`matrix.v1.json`**:
   - `spec_version.source_ref` → `pins.v1.json` `spec_ref`
   - `tools_version.source_ref` → `oss_fuzz_tools_ref` in pins manifest
   - `core_version.source_ref` → `oss_fuzz_core_ref` in pins manifest
   - SDK/dashboard `source_ref` → full 40-char git SHA at verification time
   - Set `release_status` to **`source-verified`**
   - Record the verifying CI run in `ci_run`
5. Run verification (below) and regenerate the signed integrity manifest when
   inventoried compatibility files changed.
6. Use [`compatibility-tuple-follow-up.md`](compatibility-tuple-follow-up.md) as
   the spec PR template.

**Manual exercise (2026-05-30):** Tuple refreshed across D.4 matrix schema work,
D.5 pin alignment (#98), and OSS-Fuzz pin follow-up (#96/#91).

### Path B — Released tuple row (when GitHub Releases exist)

Use this after a component publishes a semver GitHub Release that other repos
were verified against.

1. Publish the component release in its owning repository.
2. **Append** a new matrix row (keep historical rows; do not delete prior tuples).
3. Set each component `version` to the released tag and `source_ref` to the
   release commit SHA (40 characters).
4. Set `release_status` to **`released`** only when **every** component in the
   row has a matching GitHub Release for its `version`.
5. Record the CI run that verified the tuple in `ci_run`.
6. Optionally set `"current": true` on the new row and clear `current` on the
   prior row when this tuple becomes the active drift gate.
7. Run verification and regenerate the integrity manifest when compatibility
   JSON files changed.

Until Path B is routine, keep Path A as the living HEAD tuple and treat Path B
rows as historical release snapshots.

## Verification

```bash
make compatibility-matrix-verify
make compatibility-pins-verify
# alias:
make compatibility-tuple-verify
```

From a workspace with sibling repositories:

```bash
INTENTPROOF_TOOLS_DIR=../intentproof-tools \
INTENTPROOF_CORE_DIR=../intentproof-core \
  bash scripts/check-ecosystem-pins.sh
```

The matrix verifier validates `matrix.v1.json` against
`matrix.v1.schema.json`. Each component `source_ref` must be a full 40-character
git SHA. The pins verifier confirms the current matrix row matches
[`pins.v1.json`](pins.v1.json) for spec, tools, and core. For rows with
`release_status: "released"`, the matrix verifier also confirms that each
referenced component version exists as a GitHub Release in the corresponding
`IntentProof/*` repository.

Spec CI runs `compatibility-pins-verify` on every PR; ecosystem workflows run
the full cross-repo script when tools and core are checked out.

## Related documents

- [`PINS.md`](PINS.md) — pin locations and bump order
- [`compatibility-tuple-follow-up.md`](compatibility-tuple-follow-up.md) — spec PR checklist
- [`../integrity/README.md`](../integrity/README.md) — manifest signing
