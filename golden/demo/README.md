# Golden demo fixtures

Canonical offline fixtures for `intentproof demo refund` (Path 1). The
demo command loads this tree from `INTENTPROOF_SPEC_DIR/golden/demo/` (or
monorepo sibling `intentproof-spec`).

## Layout

| Path | Purpose |
|------|---------|
| `scenarios/refund.json` | Happy and divergent correlation ids, action chains |
| `policies/refund-with-notification.yaml` | Active demo policy |
| `stripe/` | Recorded `stripe@demo` webhook bytes |
| `fixtures/divergent-missing-notify/expected-bundle-sha256.txt` | Stable bundle fingerprint for CI |

Stripe webhook bytes are documented in [`stripe/README.md`](stripe/README.md).
