# Migration Notes

`refund-basic` is the entry-level refund reference pack. It can be activated
when the tenant emits a successful refund action event.

## Required Instrumentation

- Emit `payments.refund.execute` for each refund attempt.
- Set `status: ok` on successful refund execution events.
- Preserve correlation IDs across the request flow.

## Upgrading

- Move to `reference.payments.refund-with-ledger.v1` when ledger write events
  are instrumented.
- Move to `reference.payments.refund-with-notification.v1` when customer
  notification events are instrumented.
