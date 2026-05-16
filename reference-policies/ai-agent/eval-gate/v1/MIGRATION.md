# Migration Notes

`eval-gate` requires evaluation run, passing result, and gate approval events.

## Required Instrumentation

- Emit `ai.eval.run` when an evaluation starts or completes.
- Emit `ai.eval.result` when the evaluation result is recorded.
- Emit `ai.eval.gate.approve` when the evaluation gate approves rollout.
- Set `status: ok` on successful run, result, and gate approval events.
- Preserve correlation IDs across evaluation and gate events.

## Rollout

Start by instrumenting evaluation runs and results, then activate this pack when
gate approvals are emitted consistently for passing evaluations.
