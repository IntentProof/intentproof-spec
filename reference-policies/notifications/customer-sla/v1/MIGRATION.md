# Migration Notes

`customer-sla` requires case-open and customer-notification events for
customer-impacting workflows.

## Required Instrumentation

- Emit `notifications.customer_sla.open` when a customer-impacting case opens.
- Emit `notifications.customer_sla.notify` when the customer notification is sent.
- Set `status: ok` on successful case-open and notification events.
- Preserve correlation IDs across incident, support, and notification systems.
- Capture event timestamps accurately enough to evaluate the SLA window.

## Rollout

Start by emitting case-open events from the system of record, then activate this
pack once customer notifications are reliably correlated to the same flow.
