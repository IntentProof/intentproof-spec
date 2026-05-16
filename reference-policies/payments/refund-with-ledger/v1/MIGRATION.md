# Migration Notes

`refund-with-ledger` extends `refund-basic` by requiring a ledger record for the
refund.

## Required Instrumentation

- Emit `payments.refund.execute` for each refund attempt.
- Emit `ledger.refund.record` after the refund is recorded in the ledger.
- Set `status: ok` on successful refund and ledger events.
- Preserve correlation IDs across the refund and ledger events.

## Upgrading

- Use `reference.payments.refund-basic.v1` until ledger write events are
  reliably instrumented.
- Move to `reference.payments.refund-with-notification.v1` when customer
  notification events are instrumented.
