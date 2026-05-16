# Migration Notes

`etl-completeness` requires extract, load, and reconciliation completion events
for ETL batch flows.

## Required Instrumentation

- Emit `data.etl.extract` when the source batch is extracted.
- Emit `data.etl.load` when the batch is loaded into the target system.
- Emit `data.etl.reconcile` when source and loaded records are reconciled.
- Set `status: ok` on successful extract, load, and reconciliation events.
- Preserve correlation IDs across orchestration, warehouse, and reconciliation
  systems.

## Rollout

Start by emitting extract and load events from the orchestrator, then activate
this pack once reconciliation completion is reliably recorded for each batch.
