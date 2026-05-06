# SDK contracts (`sdk_contracts/`)

Normative cross-language policy and references for **IntentProof** SDKs and **`intentproof-spec`**. Start here when changing schemas, goldens, pins, or CI behavior.

| Document | Purpose |
|----------|---------|
| [**single_source_policy.md**](single_source_policy.md) | No competing schema or handwritten wire models; artifacts must trace to **`spec.json`**. |
| [**spec_version_pinning.md**](spec_version_pinning.md) | **`intentproofSpecVersion`** / **`spec-commit`** / **`gradle.properties`** fields vs **`spec.json`** and **`git HEAD`**. |
| [**drift_hardening_checklist.md**](drift_hardening_checklist.md) | Review checklist: pins, codegen drift, conformance, parity. |
| [**conformance_reality.md**](conformance_reality.md) | What the spec repo’s oracle proves vs what each SDK must test natively. |
| [**type_generation.md**](type_generation.md) | Expectations for generated types from JSON Schema. |
| [**node.contract.ts**](node.contract.ts), [**python.contract.py**](python.contract.py), [**java.contract.java**](java.contract.java) | Non-executable reference snippets for public API shape (not standalone libraries). |

Repository-level contributor guide (terminology table, PR expectations): [**`../CONTRIBUTING.md`**](../CONTRIBUTING.md).
