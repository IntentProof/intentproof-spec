# Migration Notes

`capture-settlement` requires capture and settlement events for payment capture
flows.

## Required Instrumentation

- Emit `payments.capture.execute` when a payment capture succeeds.
- Emit `settlement.capture.record` when the capture is recorded for settlement.
- Set `status: ok` on successful capture and settlement events.
- Preserve correlation IDs across capture and settlement events.

## Rollout

Start with capture-only observability in shadow mode, then activate this pack
once settlement recording emits stable correlated events.
