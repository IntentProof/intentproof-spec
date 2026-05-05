# Changelog

Repository: [IntentProof specification (`intentproof-spec`)](https://github.com/IntentProof/intentproof-spec).

All notable changes to this specification repository are documented here. Versioning follows Git tags `spec-vMAJOR.MINOR.PATCH` (see README).

## Unreleased

- Add cross-SDK hardening checklist (`sdk_contracts/drift_hardening_checklist.md`) and tighten type-generation policy to require exact-pinned generator versions.
- Add SDK hardening contract audit script (`scripts/check-sdk-hardening.sh`) and wire parity/audit automation (`.github/workflows/cross-sdk-parity.yml`).
- Add deterministic schema fingerprint tooling (`tools/spec-fingerprint.ts`, `npm run spec:fingerprint`) and manifest registration (`spec.json` tools map).
- Docs: README now covers hardening audit usage, cross-SDK parity workflow, and schema fingerprint command.
- **IntentProof branding:** README and this changelog's repository link text; `semantics/lifecycle_model.md` and `constraints/validation_rules.md`; v1 schema `$comment` lines (`execution_event`, `wrap_options`, `intentproof_config`); `package.json` **IntentProof** npm keyword; `scripts/run-conformance.sh` validation and progress messages; `tests/runners/sdk_test_harness.ts` module header. Public GitHub paths remain `github.com/IntentProof/…`; wire identifiers unchanged.
- Document canonical GitHub URL across README, NOTICE, scripts, and harness; add `homepage` in `package.json`.
- Upgrade Vitest to **4.1.5** (aligned Vite/esbuild chain) so `npm audit` reports **0** vulnerabilities on a fresh install.
- README: schema raw URL table, pin-tag reminder, `$id` clarification; schema `$comment` pointers to GitHub (normative tree URLs); validation rules link and Ajv spelling.

## 1.0.0 — 2026-05-04

- Initial public layout: JSON Schemas (v1), semantics and constraints, golden JSONL oracles, Vitest conformance suite, SDK harness, CLI tools, and `scripts/run-conformance.sh` for cross-language CI.
