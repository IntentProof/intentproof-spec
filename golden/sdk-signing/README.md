# SDK signing golden fixtures

Cross-SDK signing and JCS golden bytes for wrap/sign regression tests.
Node, Python, and Go SDK CI read these files when `INTENTPROOF_SPEC_DIR`
points at an `intentproof-spec` checkout.

Local SDK repos may keep mirrored copies under `tests/fixtures` or
`testdata/fixtures` for offline development; CI runs
`scripts/check-sdk-signing-fixtures-sync.sh` to fail when mirrors drift
from this directory.
