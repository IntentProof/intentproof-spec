# Spec follow-up PR — compatibility tuple update

Use this checklist when opening a spec PR after an intentional OSS pin bump.

## Summary

- [ ] Updated `compatibility/pins.v1.json` when consumer pins changed
- [ ] Updated `compatibility/matrix.v1.json` current row
- [ ] Regenerated `integrity/manifest.v1.json` when inventoried files changed

## Test plan

```bash
cd intentproof-spec
make compatibility-matrix-verify
make compatibility-pins-verify
# Optional when tools is checked out:
INTENTPROOF_TOOLS_DIR=../intentproof-tools npx ts-node compatibility/verify_pins.ts
```

## Coordinated repos (when spec fixtures changed)

| Repo | Files |
|------|-------|
| `intentproof-tools` | `SPEC_REF`, optional `contrib/oss-fuzz/intentproof/pins.env` |
| `intentproof-spec` | `pins.v1.json`, `matrix.v1.json`, integrity manifest |
| SDK repos | Conformance / release tags as needed |
