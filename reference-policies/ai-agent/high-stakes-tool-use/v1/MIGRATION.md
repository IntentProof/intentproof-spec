# Migration Notes

`high-stakes-tool-use` requires request, approval, and execution events for
high-impact agent tool calls.

## Required Instrumentation

- Emit `ai.tool.request` when the agent requests a high-stakes tool call.
- Emit `ai.tool.approve` when the tool call is approved.
- Emit `ai.tool.execute` when the tool call executes.
- Set `status: ok` on successful request, approval, and execution events.
- Preserve correlation IDs across all events for the tool call.

## Rollout

Start by instrumenting tool requests and executions, then activate this pack
once approval events are stable and correlated.
