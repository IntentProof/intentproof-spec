# Golden demo Stripe webhook fixtures

Canonical recorded Stripe webhook bytes for offline `stripe@demo` replay.
These fixtures exercise the production `stripe@webhook` adapter verify,
canonicalization, and subject-extraction path without network egress.

## Demo HMAC secret

```
STRIPE_DEMO_HMAC_SECRET=whsec_intentproof_demo_golden_v1
```

This secret is **demo-only**. Production tenants must reject attestations
signed with it. The attestation gateway accepts it only for source id
`stripe@demo` on tenants whose environment label is `demo`.

## Fixtures

| File | Description |
|------|-------------|
| `refund-created.bytes` | Raw HTTP body for a `refund.updated` event |
| `refund-created.headers.json` | Request headers including `Stripe-Signature` |
| `refund-created.sha256.txt` | SHA-256 of the raw body bytes |

The signature timestamp is fixed at `1704067200` (2024-01-01T00:00:00Z).
Replay environments use the signature timestamp as the verification clock for
`stripe@demo` so bytes remain valid offline.

## Provenance

Generated for IntentProof golden demo Path 1 (`intentproof demo refund`).
Do not rotate without updating dependent conformance and demo harness tests.
