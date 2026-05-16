# High-Stakes Tool Use

Reference ID: `reference.ai-agent.high-stakes-tool-use.v1`

`high-stakes-tool-use` verifies that a high-impact agent tool call records the
request, approval, and execution events in the same correlated flow.

## When To Use

Use this pack when an AI agent can trigger consequential actions, such as
payments, account changes, production operations, or external notifications, and
the team needs proof that approval was recorded before execution.

## Fixtures

- `happy-path`: tool request, approval, and execution are present.
- `missing-approval`: tool request and execution are present, but approval is
  absent.
