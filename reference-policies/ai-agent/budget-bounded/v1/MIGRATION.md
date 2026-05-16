# Migration Notes

`budget-bounded` requires budget allocation, spend, and remaining-budget
confirmation events for agent runs.

## Required Instrumentation

- Emit `ai.budget.allocate` when a budget is assigned to an agent run.
- Emit `ai.budget.spend` when the agent consumes budget.
- Emit `ai.budget.remaining` after spend is recorded and checked.
- Set `status: ok` on successful allocation, spend, and remaining-budget events.
- Preserve correlation IDs across all budget events.

## Rollout

Start by recording allocations and spend, then activate this pack once remaining
budget checks are consistently emitted after spend.
