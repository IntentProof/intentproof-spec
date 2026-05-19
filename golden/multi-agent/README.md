# Multi-agent delegation golden fixtures

Reserved optional attributes on `ExecutionEvent.attributes` link specialist
agent runs to a parent flow:

| Attribute key | Type | Meaning |
|---------------|------|---------|
| `intentproof.delegation.parent_correlation_id` | string | Correlation id of the delegating run |
| `intentproof.delegation.parent_agent_id` | string | Stable id of the delegating agent |
| `intentproof.delegation.depth` | integer (0–8) | Handoff depth from the root agent |

Only these three keys may use the `intentproof.delegation.*` prefix; the schema
and conformance runner reject any other key under that prefix.

## Flow grouping (documentation only)

Events materialize into **one** execution flow when either:

1. They share the same `correlation_id`, or
2. A later event carries `intentproof.delegation.parent_correlation_id` (or
   `parent_agent_id` with tenant policy) that resolves to an existing flow.

Tenant policy may split or merge flows beyond these defaults; the spec does not
define evaluator behavior here. Flow-builder grouping and approval reference
policies will consume these fields in later platform work.

## Downstream consumers

- Flow closure and superseded-run UX: flow-builder / query API work.
- Agent approval reference pack: high-stakes tool use policy fixtures.
