# Spec follow-up PR — compatibility tuple update

Use this checklist when opening a spec PR after a component release or an
intentional ecosystem pin bump. Copy the sections below into the PR body.

## Summary

- [ ] Updated `compatibility/pins.v1.json` (when consumer or OSS-Fuzz pins changed)
- [ ] Updated `compatibility/matrix.v1.json` current row or appended a release row
- [ ] Regenerated `integrity/manifest.v1.json` when inventoried compatibility files changed

## Tuple kind

- [ ] **Source-verified rolling tuple** — refreshed `"current": true` row SHAs
- [ ] **Released tuple** — appended row with `release_status: "released"` and GitHub Release tags for every component

## Test plan

```bash
cd intentproof-spec
make compatibility-matrix-verify
make compatibility-pins-verify
# When sibling repos are checked out:
INTENTPROOF_TOOLS_DIR=../intentproof-tools \
INTENTPROOF_CORE_DIR=../intentproof-core \
  bash scripts/check-ecosystem-pins.sh
```

- [ ] `npm test` / CI build-test green
- [ ] `IntentProof CI: Ecosystem Pins` green (when tools/core PRs are coordinated)

## Coordinated repos (when pins changed)

| Repo | Files |
|------|-------|
| `intentproof-tools` | `SPEC_REF`, `contrib/oss-fuzz/intentproof/pins.env`, root `CORE_REF` when applicable |
| `intentproof-core` | `SPEC_REF` |
| `intentproof-spec` | `pins.v1.json`, `matrix.v1.json`, integrity manifest |

Use the same branch name across repos when ecosystem CI must compare sibling PR heads.
