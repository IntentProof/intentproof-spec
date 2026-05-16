# Migration Notes

`refund-with-notification` extends `refund-with-ledger` by requiring customer
notification for the refund.

## Required Instrumentation

- Emit `payments.refund.execute` for each refund attempt.
- Emit `ledger.refund.record` after the refund is recorded in the ledger.
- Emit `customer.notify.refund` after the customer notification is sent.
- Set `status: ok` on successful refund, ledger, and notification events.
- Preserve correlation IDs across all refund flow events.

## Upgrading

- Use `reference.payments.refund-basic.v1` while only refund execution is
  instrumented.
- Use `reference.payments.refund-with-ledger.v1` until customer notification
  events are reliably instrumented.
