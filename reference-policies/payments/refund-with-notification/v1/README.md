# Refund With Notification

Reference ID: `reference.payments.refund-with-notification.v1`

`refund-with-notification` is the strictest refund preset. It verifies that a
refund flow contains successful refund execution, ledger recording, and customer
notification events.

## When To Use

Use this pack when refund execution, ledger recording, and customer notification
are all instrumented and should be checked as one refund integrity flow.

## Fixtures

- `happy-path`: refund execution, ledger recording, and notification are present.
- `missing-notification`: refund execution and ledger recording are present, but
  customer notification is absent.
