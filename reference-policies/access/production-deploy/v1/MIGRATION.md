# Migration Notes

`production-deploy` requires approval, peer review, and merge events for
production deployment flows.

## Required Instrumentation

- Emit `access.production_deploy.approve` when production deployment approval is recorded.
- Emit `access.production_deploy.peer_review` when peer review is completed.
- Emit `access.production_deploy.merge` when the approved change merges for deployment.
- Set `status: ok` on successful approval, peer review, and merge events.
- Preserve correlation IDs across pull request, deployment, and approval events.

## Rollout

Start by emitting merge and peer-review events from source control webhooks,
then activate this pack once production approval events are reliably correlated
to the same deployment flow.
