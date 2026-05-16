# Refund Basic

Reference ID: `reference.payments.refund-basic.v1`

`refund-basic` is the least strict refund preset. It verifies that the
application emitted a successful refund execution event for a correlated refund
flow. It intentionally does not require ledger reconciliation or customer
notification; stricter packs add those controls.

## When To Use

Use this pack when a team is first adopting refund integrity checks and only
has application-level refund events instrumented.

## Fixtures

- `happy-path`: a successful refund execution is present and the policy passes.
- `missing-refund`: no refund execution is present and the required rule fails.
