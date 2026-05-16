# Break Glass

Reference ID: `reference.access.break-glass.v1`

`break-glass` verifies that emergency privileged access records a request,
an approval, and a closure event in the same correlated flow.

## When To Use

Use this pack when operators may need temporary privileged access to production
systems and auditors need evidence that the access was explicitly authorized.

## Fixtures

- `break-glass-with-approval`: request, approval, and closure events are
  present.
- `break-glass-without-approval`: request and closure events are present, but
  the approval event is absent.
