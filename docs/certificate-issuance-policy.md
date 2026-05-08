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

## Signing key custody (trusted CI)

| Role | Where | Notes |
|------|--------|--------|
| **Private key (Ed25519)** | GitHub secret **`INTENTPROOF_CERTIFICATE_SIGNING_KEY_PEM`** on **`intentproof-spec`** only | Used by **`conformance-attestation.yml`** and adopted **`cross-sdk-parity.yml`** rows to sign **`conformance-certificate.json`**. Never commit; generate off-repo. |
| **Public key** | GitHub secret **`INTENTPROOF_CERTIFICATE_PUBLIC_KEY_PEM`** on **`intentproof-spec`** | Required for **`npm run validate:conformance-certificate`** when the certificate carries a **`signature`**. |
| **`keyId`** | Workflow env / certificate field (default **`intentproof-ci-ed25519-v1`**) | **`conformance_certificate.v2`** requires **`signature.keyId`** when **`signature`** is present. Verifiers treat **`keyId`** as the stable name for “which public key applies.” |

**Who may rotate:** org maintainers with permission to edit **`intentproof-spec`** repository secrets and merge workflow changes. Record rotation dates in this file’s **Change log** (informal bullet in repo **`CHANGELOG.md`** is enough for Stage 2).

## Rotation

1. **Generate** a new Ed25519 keypair off-repo (do not store the private key under the spec checkout).
2. **Update secrets** on **`intentproof-spec`**: set **`INTENTPROOF_CERTIFICATE_SIGNING_KEY_PEM`** and **`INTENTPROOF_CERTIFICATE_PUBLIC_KEY_PEM`** to the new pair in a single coordinated change.
3. **Bump `keyId`** in trusted workflows (e.g. **`intentproof-ci-ed25519-v2`**) and ensure **`INTENTPROOF_CERTIFICATE_SIGNING_KEY_ID`** (if used) matches. New certificates will embed the new **`keyId`**.
4. **Document** the rotation in **`CHANGELOG.md`** (Unreleased → release) and add a dated line under **Retired keys** below.
5. **Overlap (optional):** keep the **previous** public key PEM in runbooks or internal docs only long enough to verify **historical** artifacts; CI validates only the **current** repository secret.

**`conformance_certificate.v2`:** the **`signature.keyId`** field in each artifact tells verifiers which key material to use. Schema shape does not change when **`keyId`** string changes.

## Revocation and emergency disable

| Situation | Action |
|-----------|--------|
| **Suspected private-key compromise** | Rotate immediately (see above); replace **`INTENTPROOF_CERTIFICATE_SIGNING_KEY_PEM`**. Treat certificates signed with the old key as **not trustworthy** for new attestation after the rotation timestamp. |
| **Stop issuance without a new key yet** | Remove or clear **`INTENTPROOF_CERTIFICATE_SIGNING_KEY_PEM`** (or revoke workflow access): trusted jobs **fail fast** at the PEM presence step—no silent unsigned validation. |
| **Verifier-only emergency** | If **`INTENTPROOF_CERTIFICATE_PUBLIC_KEY_PEM`** is wrong or missing, **`validate:conformance-certificate`** fails when a signature is present; fix the secret before re-running. |

**Retired `keyId` values:** *(append a row per retirement: date, former `keyId`, reason — e.g. routine rotation vs incident).*

## Operator verification (local or CI artifact)

After a conformance run has produced **`conformance-report.json`** and **`conformance-certificate.json`** in the **`intentproof-spec`** repo root (e.g. from **`INTENTPROOF_CONFORMANCE_JSON=1`** or downloaded **conformance-artifacts**):

```bash
cd /path/to/intentproof-spec
export INTENTPROOF_CERTIFICATE_SCHEMA_VERSION=v2   # default if omitted
export INTENTPROOF_CERTIFICATE_REQUIRE_SIGNATURE=1
export INTENTPROOF_CERTIFICATE_PUBLIC_KEY_PEM="$(cat /path/to/certificate-signing.public.pem)"
npm run validate:conformance-certificate
```

**Expected success:** the process exits **0** and prints **`OK`** (no further stdout). Failures print **`validate-conformance-certificate:`** … to stderr (schema, digest mismatch, missing signature when required, or Ed25519 verify failure).

**CI:** the same command runs in **`conformance-attestation.yml`** and adopted **`cross-sdk-parity.yml`** rows with secrets injected by GitHub Actions (do not paste private key material into logs).

## References

- [Certification RFC](certification-rfc.md)
- [`docs/conformance-report.md`](conformance-report.md)
