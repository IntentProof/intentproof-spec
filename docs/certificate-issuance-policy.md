# Certificate issuance policy (draft)

**Status:** draft — Stage 2  
**Companion:** [Certification RFC](certification-rfc.md)

## Goal

Document **when** an IntentProof **conformance certificate** may be issued and
**when issuance must be denied**, so CI and humans apply the same bar. Evidence is
**`conformance-report.v1`**; the normative certificate shape default is **`conformance_certificate.v2`**
(see **`spec.json` → `schemas.conformance_certificate`**).

## Preconditions (all required unless noted)

Issuance is **allowed** only if:

1. **Oracle run:** `scripts/run-conformance.sh` completed in CI (or an equivalent
   documented harness) with `INTENTPROOF_CONFORMANCE_JSON=1`.
2. **Valid report:** `conformance-report.json` validates against
   `schema/conformance_report.v1.schema.json`.
3. **Phase results:** In `results`, **`schemaValidation`**, **`semanticValidation`**,
   and **`goldenTests`** are **`pass`**. **`replayParity`** is **`pass`** when
   `INTENTPROOF_REPLAY_VERIFY=1` is set for that run; if replay is intentionally
   skipped, the policy must record an explicit **`skip`** allowance in the RFC/CI
   contract (not yet defined — default is **no certificate** if replay is skip).
4. **Spec binding:** `specVersion` and `specFingerprint` in the report match the
   **`intentproof-spec` checkout** used for that run (same rules as SDK pin checks).
5. **Identity:** `sdk` in the report is populated (`name`, `language`, `version`)
   per environment contract in [`conformance-report.md`](conformance-report.md).

## Denial conditions

Issuance **must be denied** (no certificate, CI must fail if emission is attempted) when:

- Any required phase is **`fail`**, or the report is missing/invalid.
- Schema integrity / signed manifest steps for the spec tree failed in the same pipeline.
- The report was produced from a **non-pinned** or **dirty** spec checkout when
  the pipeline claims a production or release attestation (exact git clean rules TBD in CI).

## Staged rollout

| Phase | Behavior |
|-------|----------|
| **Active** | **`spec.json`** indexes **`conformance_certificate.v2`**. Emit/validate defaults to **`INTENTPROOF_CERTIFICATE_SCHEMA_VERSION=v2`**. **`conformance-attestation.yml`** and adopted **`cross-sdk-parity.yml`** rows sign certificates when **`INTENTPROOF_CERTIFICATE_SIGNING_KEY_PEM`** is set ( **`intentproof-spec`** secrets), run **`npm run validate:conformance-certificate`** with **`INTENTPROOF_CERTIFICATE_REQUIRE_SIGNATURE=1`**, and upload **`conformance-artifacts`** / **`conformance-artifacts-<sdk>`**. Fail-fast if PEM secrets are missing. Pull-request **`ci.yml`** does **not** perform signed certificate attestation. |
| **Stage 2 exit** | Published verification evidence (e.g. trusted workflow run transcripts with **`INTENTPROOF_CERTIFICATE_REQUIRE_SIGNATURE=1`**) plus rotation procedures in this doc set. |

Prior text (“optional signature”) applies only to **local** runs without signing keys; **trusted repo CI** requires signatures as above.

## References

- [Certification RFC](certification-rfc.md)
- [`docs/conformance-report.md`](conformance-report.md)
