# Certification RFC (draft)

**Status:** draft — Stage 2 (normative schema **`conformance_certificate.v2`** is in **`spec.json`**; tooling and CI implement this RFC’s trust boundaries)

## Purpose

Define a **versioned certification artifact** that **attests**, in a machine-readable
way, that a given **conformance run** satisfied IntentProof’s oracle for a **pinned
spec revision**. This sits **above** [`conformance-report.v1`](conformance-report.md):
the report is the raw outcome; the certificate is the **normative claim** suitable
for audit and CI gates.

## Scope

- **Data model:** Normative JSON Schema at **`schema/conformance_certificate.v2.schema.json`**
  (indexed from **`spec.json` → `schemas.conformance_certificate`**). **`conformance_certificate.v1`**
  remains in **`schema/`** for compatibility reference only.
- **Runner:** `tools/conformance-certificate.ts` (from `run-conformance.sh` when
  **`INTENTPROOF_CONFORMANCE_JSON=1`**) writes **`conformance-certificate.json`** (defaults to **v2** via
  **`INTENTPROOF_CERTIFICATE_SCHEMA_VERSION`**).
- **Verifier:** `tools/validate-conformance-certificate.ts` (**`npm run validate:conformance-certificate`**).

### CI trust split (**`intentproof-spec`**)

| Workflow | Certificate validation |
|----------|------------------------|
| **`conformance-attestation.yml`** | Runs after **`run-conformance.sh`**; **`INTENTPROOF_CERTIFICATE_REQUIRE_SIGNATURE=1`**; repository secrets **`INTENTPROOF_CERTIFICATE_*`**; artifact **`conformance-artifacts`**. |
| **`cross-sdk-parity.yml`** (adopted SDKs) | Same bar from **`intentproof-spec`** checkout; artifact **`conformance-artifacts-<sdk>`**. |
| **`ci.yml`** (pull requests) | **No** signed certificate path — PR jobs run Vitest/schema gates without certificate PEM secrets. |

**Signing:** Ed25519 via **`INTENTPROOF_CERTIFICATE_SIGNING_KEY_PEM`** / verification via **`INTENTPROOF_CERTIFICATE_PUBLIC_KEY_PEM`** (**`intentproof-spec`** repository secrets). SDK repos do not require those secrets for current CI.

## Relationship to conformance

- **Input:** a validated **`conformance-report.json`** per **`conformance_report.v1`** with required phases **`pass`** (or an explicitly enumerated policy for allowed **`skip`** — see [`certificate-issuance-policy.md`](certificate-issuance-policy.md)).
- **Binding:** the certificate references **`specVersion`**, **`specFingerprint`**, and **`sdk`** identity from that report (and **`conformanceReportDigest`**) so the attestation cannot be replayed against a different spec or binary.

## Proposed core fields (informative)

Field names and shapes are **normative** in **`schema/conformance_certificate.v2.schema.json`**.

| Concept | Intent |
|--------|--------|
| `certificateVersion` | Artifact version string (e.g. **`cert-v0.1.0`**). |
| `issuer` | Opaque issuer id (e.g. **`intentproof-ci`**). |
| `issuedAt` | RFC 3339 timestamp. |
| Subject / **sdk** | SDK name, language, version. |
| **spec** | **`specVersion`** + **`specFingerprint`** (+ optional git SHA). |
| **conformanceReportDigest** | Digest of the source report. |
| **signature** | **`v2`** requires **`keyId`** when **`signature`** is present. |

## Trust model (draft)

- **Issuer:** CI / org-controlled automation that emits only after a passing conformance job ([`certificate-issuance-policy.md`](certificate-issuance-policy.md)).
- **Verifier:** any party with the spec schemas, the certificate schema, and the issuer **public** key material for signature verification.
- **Key lifecycle:** rotation, custody, revocation, and operator **`npm run validate:conformance-certificate`** steps are normative for operators in [`certificate-issuance-policy.md`](certificate-issuance-policy.md) (**Signing key custody**, **Rotation**, **Revocation and emergency disable**, **Operator verification**).

## Versioning

Certificate schema bumps follow the same contract SemVer discipline as **`spec-v`*** tags (**MAJOR** = breaking for verifiers).

## Open questions

1. Embed full report vs digest-only (size vs transparency).
2. Single global issuer vs per-tenant issuer in later stages.
3. Alignment with future Stage 7 signed proof bundles.

## References

- [`docs/conformance-report.md`](conformance-report.md)
- [`docs/certificate-issuance-policy.md`](certificate-issuance-policy.md)
- [`docs/README.md`](README.md)
