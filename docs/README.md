# Documentation (`docs/`)

Human-facing guides for conformance artifacts and certification (Stage 2). **Normative schemas and semantics** remain under `schema/`, `semantics/`, `constraints/`, and `spec.json`.

| Document | Contents |
|----------|----------|
| [**conformance-report.md**](conformance-report.md) | Machine-readable **`conformance-report.json`** (`conformance_report.v1`): fields, SDK emission, CI expectations. |
| [**certificate-issuance-policy.md**](certificate-issuance-policy.md) | When **`conformance-certificate.json`** may be issued or denied; rollout and signing. |
| [**certification-rfc.md**](certification-rfc.md) | Certificate artifact family: goals, trust model, relationship to the report (draft; schema is normative in `schema/`). |

**SDK-oriented contracts** (pins, drift, types): [`../sdk_contracts/README.md`](../sdk_contracts/README.md).

**Contributing** (secrets, terminology, PR policy): [`../CONTRIBUTING.md`](../CONTRIBUTING.md).
