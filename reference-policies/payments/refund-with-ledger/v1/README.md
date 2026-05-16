# Refund With Ledger

Reference ID: `reference.payments.refund-with-ledger.v1`

`refund-with-ledger` is the middle refund preset. It verifies that a refund flow
contains both a successful refund execution event and a successful ledger record
event. It is stricter than `refund-basic` but does not require customer
notification.

## When To Use

Use this pack when refund execution and ledger recording are both instrumented,
but customer notification has not yet been wired into the refund integrity flow.

## Fixtures

- `happy-path`: refund execution and ledger recording are present.
- `missing-ledger`: refund execution is present, but the ledger record is absent.
