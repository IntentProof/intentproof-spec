# Production Deploy

Reference ID: `reference.access.production-deploy.v1`

`production-deploy` verifies that a production deployment records approval,
peer review, and approval-before-merge ordering in the same correlated flow.

## When To Use

Use this pack when platform and security teams need change-management evidence
for production deployments.

## Fixtures

- `deploy-with-approval`: approval, peer review, and merge events are present
  in the expected order.
- `deploy-without-approval`: peer review and merge events are present, but
  deployment approval is absent.
