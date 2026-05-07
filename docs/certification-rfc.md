# Certification RFC (draft)

**Status:** draft — Stage 2 kickoff  
**Artifact family:** `conformance-certificate` (version TBD; working label `cert-v0.1-draft`)

## Purpose

Define a **versioned certification artifact** that **attests**, in a machine-readable
way, that a given **conformance run** satisfied IntentProof’s oracle for a **pinned
spec revision**. This sits **above** [`conformance-report.v1`](conformance-report.md):
the report is the raw outcome; the certificate is the **normative claim** suitable
for audit, CI gates, and (later) signing.

## Scope (this draft)

- **In scope:** data model goals, required concepts, relationship to
  `conformance-report.v1`, versioning rules, trust boundaries (who issues, who
  verifies).
- **In repo:** normative JSON Schema at `schema/conformance_certificate.v1.schema.json`
  (indexed from `spec.json` → `schemas.conformance_certificate`).
- **In runner:** `tools/conformance-certificate.ts` (invoked from `run-conformance.sh`
  when `INTENTPROOF_CONFORMANCE_JSON=1`) writes `conformance-certificate.json`.
- **In CI (spec repo):** `ci.yml` validates with `tools/validate-conformance-certificate.ts`
  and uploads `conformance-artifacts` (report + certificate).
- **In parity CI:** adopted SDK matrix jobs validate and upload per-SDK
  **`conformance-artifacts-<sdk>`** from the spec checkout.
- **Signing support (Stage 2):** `tools/conformance-certificate.ts` can sign with
  Ed25519 (`INTENTPROOF_CERTIFICATE_SIGNING_KEY_PEM`), and
  `tools/validate-conformance-certificate.ts` verifies against
  `INTENTPROOF_CERTIFICATE_PUBLIC_KEY_PEM`.

## Relationship to conformance

- **Input:** a validated `conformance-report.json` produced per
  `schema/conformance_report.v1.schema.json` with all required phases **`pass`**
  (or an explicitly enumerated policy for allowed `skip`).
- **Binding:** the certificate MUST reference **`specVersion`**, **`specFingerprint`**,
  and **`sdk`** identity from that report (or a hash of the canonical report bytes)
  so the attestation cannot be replayed against a different spec or binary.

## Proposed core fields (informative)

| Concept | Intent |
|--------|--------|
| `certificateVersion` | SemVer or `cert-vMAJOR.MINOR.PATCH` aligned with schema releases. |
| `issuer` | Opaque issuer id (e.g. `intentproof-ci`, org slug); later may be a DID or key id. |
| `issuedAt` | RFC 3339 timestamp. |
| `subject` | SDK name + language + version (mirror report `sdk`). |
| `spec` | `specVersion` + `specFingerprint` + optional pinned git commit SHA. |
| `conformanceReportDigest` | SHA-256 over canonical bytes of the source report (or embedded report id). |
| `claims` | Minimal structured claims, e.g. `{ "oracle": "intentproof-spec/run-conformance", "allPhasesPass": true }`. |
| `signature` | Optional object carrying `{ alg, keyId, value }`; in `v1`, `keyId` is optional for compatibility and is planned to be required in `v2`. |

Field names and shapes are normative in
`schema/conformance_certificate.v1.schema.json` (evolve with RFC revisions).

## Trust model (draft)

- **Issuer:** initially **CI / org-controlled automation** that only emits after a
  passing conformance job (policy in `certificate-issuance-policy.md`).
- **Verifier:** any party with the spec schemas, the certificate schema, and (when
  present) the issuer public key material.
- **Non-goals (v0):** third-party accreditation, legal “compliance certification,”
  or replacing SDK-local tests.

## Versioning

- Certificate schema bumps follow the same **contract SemVer discipline** as
  `spec-v*` (PATCH = additive/non-breaking, MAJOR = breaking for verifiers).

## Open questions

1. Embed full report vs digest-only (size vs transparency).
2. Single global issuer vs per-tenant issuer in later stages.
3. Alignment with future Stage 7 signed proof bundles.

## References

- [`docs/conformance-report.md`](conformance-report.md)
- `schema/conformance_report.v1.schema.json`
- [`docs/certificate-issuance-policy.md`](certificate-issuance-policy.md)
