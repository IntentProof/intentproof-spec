# Capture Settlement

Reference ID: `reference.payments.capture-settlement.v1`

`capture-settlement` verifies that a payment capture flow records both the
successful capture and the corresponding settlement event.

## When To Use

Use this pack when a team needs evidence that captured payments are reconciled
into settlement tracking before downstream reporting or payout workflows rely on
them.

## Fixtures

- `happy-path`: capture and settlement events are present.
- `missing-settlement`: capture is present, but settlement is absent.
