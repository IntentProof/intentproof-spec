# Conformance certificate v2 migration (draft)

This checklist tracks migration from `conformance_certificate.v1` to
`conformance_certificate.v2`.

## Why v2

- `v2` requires `signature.keyId` when `signature` is present.
- This is a contract-breaking tightening and must roll out as a coordinated
  major-schema migration.

## Rollout phases

1. **Cutover (active)**
   - `spec.json` now indexes `conformance_certificate.v2`.
   - Emit/validate tooling defaults to `INTENTPROOF_CERTIFICATE_SCHEMA_VERSION=v2`.
   - `spec.json.version` moved to `spec-v2.0.0`.

2. **SDK adoption**
   - Update Node/Python/Java pins to `spec-v2.0.0` + matching commit.
   - Add explicit v2 env in SDK spec-conformance CI jobs for clarity.

3. **Stabilization**
   - Run parity and release train against v2 target and ensure all adopted SDKs pass.
   - Keep `v1` schema files as compatibility references only; no v1 default paths.

## SDK repository checklist

- [ ] `intentproof-sdk-node`: add v2 conformance lane and lock green.
- [ ] `intentproof-sdk-python`: add v2 conformance lane and lock green.
- [ ] `intentproof-sdk-java`: add v2 conformance lane and lock green.
- [ ] Cross-SDK parity run against v2 target spec ref passes for all adopted SDKs.

