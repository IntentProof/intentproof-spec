# Dispute Evidence

Reference ID: `reference.payments.dispute-evidence.v1`

`dispute-evidence` verifies that a payment dispute flow records both the dispute
opening and a submitted evidence package.

## When To Use

Use this pack when a team needs evidence that chargeback or payment dispute
flows have a submitted evidence package before review or processor deadlines.

## Fixtures

- `happy-path`: dispute opening and evidence submission are present.
- `missing-evidence`: dispute opening is present, but evidence submission is
  absent.
