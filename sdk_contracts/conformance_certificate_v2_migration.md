# Conformance certificate v2 cutover (reference)

**Status:** cutover complete for **`intentproof-spec`** **`spec-v2.0.0`** and SDK pins aligned to that commit.

Normative schema: **`spec.json` → `schemas.conformance_certificate`** → **`schema/conformance_certificate.v2.schema.json`**. **`v1`** remains under **`schema/`** for compatibility-only validation.

## Why v2

- **`v2`** requires **`signature.keyId`** when **`signature`** is present (stricter than **`v1`**).

## What landed

1. **`spec.json`** indexes **`conformance_certificate.v2`**; **`INTENTPROOF_CERTIFICATE_SCHEMA_VERSION`** defaults to **`v2`** in emit/validate tooling.
2. Node / Python / Java SDK pins target **`spec-v2.0.0`** + matching commit (verify SHAs in each SDK repo when adopting).
3. **`conformance-attestation.yml`** and adopted **`cross-sdk-parity.yml`** rows validate with **`INTENTPROOF_CERTIFICATE_REQUIRE_SIGNATURE=1`** (**certificate PEM secrets on `intentproof-spec` only**).

## SDK checklist (maintenance)

- [x] **`intentproof-sdk-node`**: **`INTENTPROOF_CERTIFICATE_SCHEMA_VERSION=v2`** in conformance CI aligned with **`spec-v2.0.0`** adoption.
- [x] **`intentproof-sdk-python`**: same.
- [x] **`intentproof-sdk-java`**: same.
- [ ] Periodic **cross-sdk-parity** run green for all **adopted** SDKs against the active **`spec-v*`** target (scheduled weekly + manual **`workflow_dispatch`**).
