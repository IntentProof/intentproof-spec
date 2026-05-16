# ETL Completeness

Reference ID: `reference.data.etl-completeness.v1`

`etl-completeness` verifies that an ETL batch records extract, load, and
reconciliation completion events in the same correlated flow.

## When To Use

Use this pack when data teams need proof that a batch was extracted, loaded, and
reconciled before downstream reporting or audit evidence depends on it.

## Fixtures

- `complete-batch`: extract, load, and reconciliation completion are present.
- `missing-reconciliation`: extract and load are present, but reconciliation
  completion is absent.
