# Migration Notes

`break-glass` requires request, approval, and closure events for emergency
privileged access flows.

## Required Instrumentation

- Emit `access.break_glass.request` when emergency access is requested.
- Emit `access.break_glass.approve` when the access is approved.
- Emit `access.break_glass.close` when the emergency access session is closed.
- Set `status: ok` on successful request, approval, and closure events.
- Preserve correlation IDs across identity provider, ticketing, and incident
  response systems.

## Rollout

Start with request and approval events, then activate this pack once access
closure events are reliably emitted for the same correlated flow.
