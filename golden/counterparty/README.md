# Counterparty golden bundle

Offline verification fixture for third-party auditors and buyers. A reader
with no IntentProof account can verify this bundle using only the published
`intentproof-verify` binary (or `intentproof verify` for JSON output).

| File | Purpose |
|------|---------|
| `counterparty-refund.proof.tar.zst` | Deterministic refund bundle with verification_profile (fixed clock) |
| `expected-verify-stdout-sha256.txt` | SHA-256 of `intentproof-verify` human stdout |

Regenerate from `intentproof-tools`:

```bash
go run ./scripts/generate-counterparty-golden ./out
cp out/counterparty-refund.proof.tar.zst out/expected-verify-stdout-sha256.txt golden/counterparty/
```

Playbook: [`intentproof-tools/docs/counterparty-verification.md`](https://github.com/IntentProof/intentproof-tools/blob/main/docs/counterparty-verification.md).
