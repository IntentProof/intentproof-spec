# Eval Gate

Reference ID: `reference.ai-agent.eval-gate.v1`

`eval-gate` verifies that an AI-agent release or behavior change records an
evaluation run, a passing evaluation result, and a gate approval before rollout.

## When To Use

Use this pack when agent changes must pass a deterministic evaluation gate
before deployment, activation, or exposure to a broader user population.

## Fixtures

- `happy-path`: evaluation run, pass result, and gate approval are present.
- `missing-pass`: evaluation run is present, but a passing result and approval
  are absent.
