# Migration Notes

`dispute-evidence` requires dispute opening and evidence submission events.

## Required Instrumentation

- Emit `payments.dispute.open` when a dispute is opened.
- Emit `payments.dispute.evidence.submit` when evidence is submitted.
- Set `status: ok` on successful dispute and evidence events.
- Preserve correlation IDs across dispute and evidence events.

## Rollout

Start with dispute-open observability, then activate this pack once evidence
submission emits stable correlated events.
