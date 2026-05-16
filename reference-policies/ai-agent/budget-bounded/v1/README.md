# Budget Bounded

Reference ID: `reference.ai-agent.budget-bounded.v1`

`budget-bounded` verifies that an AI-agent run records a budget allocation,
spend event, and budget-remaining confirmation in the same correlated flow.

## When To Use

Use this pack when an agent can consume paid model, tool, or infrastructure
budget and the team needs proof that spend stayed inside an explicit bound.

## Fixtures

- `happy-path`: budget allocation, spend, and remaining-budget confirmation are
  present.
- `missing-remaining`: budget allocation and spend are present, but remaining
  budget confirmation is absent.
