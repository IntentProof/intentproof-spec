# Customer SLA

Reference ID: `reference.notifications.customer-sla.v1`

`customer-sla` verifies that a customer-impacting case is opened, the customer
is notified, and the notification happens within the declared SLA window.

## When To Use

Use this pack when support, incident, or operations teams need proof that
customers were notified promptly after a customer-impacting event.

## Fixtures

- `within-sla`: case open and customer notification are present within the SLA
  window.
- `late-notification`: case open and customer notification are present, but the
  notification is outside the SLA window.
