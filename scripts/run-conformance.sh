#!/usr/bin/env bash
# Executable specification oracle for IntentProof SDK CI.
# Spec entrypoint: spec.json (schemas, goldens, semantics paths).
# Requires Node.js 22+ and npm on PATH (see repo .nvmrc / package.json engines).
#
# Usage:
#   bash scripts/run-conformance.sh                    # from repo root, or any cwd
#   bash path/to/intentproof-spec/scripts/run-conformance.sh
#   bash scripts/run-conformance.sh /abs/path/to/intentproof-spec
#
# Steps: npm ci|install → spec version pin → typecheck → Vitest (schema, semantics,
# goldens, canonicalization) → validate-event smoke → optional replay equivalence →
# optional machine-readable JSON report.
#
# Environment:
#   INTENTPROOF_SPEC_ROOT            Absolute path to this repository (overrides cwd / argv).
#   INTENTPROOF_SPEC_SKIP_INSTALL=1  Skip npm ci/install (requires existing node_modules).
#   INTENTPROOF_SPEC_SKIP_SMOKE=1    Skip validate:event on examples after Vitest.
#   INTENTPROOF_REPLAY_VERIFY=1      Run tools/replay/compare-streams.ts (see below).
#   INTENTPROOF_REPLAY_STREAMS       Colon-separated list of JSONL files (same line count);
#                                    each line is one JSON value; compared post-canonicalization.
#                                    Default: self-check using golden/canonicalization_cases.jsonl twice.
#   INTENTPROOF_CONFORMANCE_JSON=1   Emit validated conformance-report.json and conformance-certificate.json.
#   INTENTPROOF_CERTIFICATE_ALLOW_REPLAY_SKIP=1  Allow certificate when replayParity is skip (local only).
#   INTENTPROOF_CERTIFICATE_VERSION   Certificate artifact version string (default cert-v0.1.0).
#   INTENTPROOF_CERT_ISSUER          Issuer id (default intentproof-ci).
#   INTENTPROOF_CERTIFICATE_SIGNING_KEY_PEM      PEM private key (Ed25519) to sign conformance certificate.
#   INTENTPROOF_CERTIFICATE_SIGNING_KEY_ID       Signature key identifier (default intentproof-ci-ed25519-v1).
#   INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PEM    PEM public key for spec-integrity verify.
#   INTENTPROOF_SPEC_INTEGRITY_PUBLIC_KEY_PATH   Path to public key PEM (alternative to *_PEM).
#   INTENTPROOF_SDK_ID               sdk field when emitting JSON (default: spec).

set -euo pipefail

resolve_root() {
  if [[ -n "${INTENTPROOF_SPEC_ROOT:-}" ]]; then
    cd "$INTENTPROOF_SPEC_ROOT" && pwd
    return
  fi
  if [[ "${1:-}" != "" ]]; then
    cd "$1" && pwd
    return
  fi
  local here
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$here/.." && pwd
}

SPEC_ROOT="$(resolve_root "${1:-}")"
cd "$SPEC_ROOT"

if [[ ! -f package.json ]] || [[ ! -f spec.json ]] || [[ ! -d schema ]] || [[ ! -d golden ]]; then
  echo "run-conformance.sh: '$SPEC_ROOT' does not look like an IntentProof specification checkout (missing package.json, spec.json, schema/, or golden/)." >&2
  exit 2
fi

if ! command -v node >/dev/null 2>&1; then
  echo "run-conformance.sh: 'node' not found on PATH (Node 22+ required)." >&2
  exit 127
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "run-conformance.sh: 'npm' not found on PATH." >&2
  exit 127
fi

node_major="$(node -p "parseInt(process.version.slice(1).split('.')[0], 10)")"
if [[ -z "$node_major" || "$node_major" -lt 22 ]]; then
  echo "run-conformance.sh: Node.js 22 or newer required (found $(node --version))." >&2
  exit 1
fi

echo "==> IntentProof specification oracle @ $SPEC_ROOT"

failed=0
schema_validation_result="skip"
semantic_validation_result="skip"
golden_tests_result="skip"
replay_parity_result="skip"

if [[ "${INTENTPROOF_SPEC_SKIP_INSTALL:-0}" == "1" ]]; then
  if [[ ! -d node_modules ]]; then
    echo "run-conformance.sh: INTENTPROOF_SPEC_SKIP_INSTALL=1 but node_modules/ is missing." >&2
    exit 3
  fi
else
  if [[ -f package-lock.json ]]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
fi

npm run check:spec-version || failed=1
npm run spec:integrity:verify || failed=1
npm run typecheck || failed=1

echo "==> Schema validation tests"
if npm exec -- vitest run tests/conformance/schema_validation.test.ts; then
  schema_validation_result="pass"
else
  schema_validation_result="fail"
  failed=1
fi

echo "==> Semantic validation tests"
if npm exec -- vitest run tests/conformance/semantics_validation.test.ts tests/conformance/correlation_tests.test.ts; then
  semantic_validation_result="pass"
else
  semantic_validation_result="fail"
  failed=1
fi

echo "==> Golden tests"
if npm exec -- vitest run tests/conformance/golden_event_tests.test.ts tests/conformance/wrap_behavior_golden.test.ts tests/conformance/canonicalization_golden.test.ts; then
  golden_tests_result="pass"
else
  golden_tests_result="fail"
  failed=1
fi

echo "==> Conformance meta tests"
npm exec -- vitest run tests/conformance/spec_manifest.test.ts tests/conformance/spec_version_contract.test.ts tests/conformance/canonical_json.test.ts tests/conformance/harness.test.ts || failed=1

if [[ "${INTENTPROOF_SPEC_SKIP_SMOKE:-0}" != "1" ]]; then
  echo "==> CLI smoke (example ExecutionEvents)"
  npm run validate:event -- examples/success_event.json || failed=1
  npm run validate:event -- examples/error_event.json || failed=1
fi

if [[ "${INTENTPROOF_REPLAY_VERIFY:-0}" == "1" ]]; then
  echo "==> Replay (canonical stream equivalence)"
  replay_ok=1
  if [[ -n "${INTENTPROOF_REPLAY_STREAMS:-}" ]]; then
    IFS=':' read -r -a replay_paths <<< "${INTENTPROOF_REPLAY_STREAMS}"
    npm exec -- tsx tools/replay/compare-streams.ts "${replay_paths[@]}" || replay_ok=0
  else
    npm exec -- tsx tools/replay/compare-streams.ts \
      "${SPEC_ROOT}/golden/canonicalization_cases.jsonl" \
      "${SPEC_ROOT}/golden/canonicalization_cases.jsonl" || replay_ok=0
  fi
  if [[ "$replay_ok" -eq 1 ]]; then
    replay_parity_result="pass"
  else
    replay_parity_result="fail"
    failed=1
  fi
fi

if [[ "${INTENTPROOF_CONFORMANCE_JSON:-0}" == "1" ]]; then
  export INTENTPROOF_RESULT_SCHEMA_VALIDATION="${schema_validation_result}"
  export INTENTPROOF_RESULT_SEMANTIC_VALIDATION="${semantic_validation_result}"
  export INTENTPROOF_RESULT_GOLDEN_TESTS="${golden_tests_result}"
  export INTENTPROOF_RESULT_REPLAY_PARITY="${replay_parity_result}"
  export INTENTPROOF_ENFORCE_REPORT_PASS="1"
  if [[ -z "${INTENTPROOF_SDK_NAME:-}" ]]; then
    export INTENTPROOF_SDK_NAME="${INTENTPROOF_SDK_ID:-intentproof-spec}"
  fi
  if [[ -z "${INTENTPROOF_SDK_LANGUAGE:-}" ]]; then
    export INTENTPROOF_SDK_LANGUAGE="${INTENTPROOF_SDK_ID:-spec}"
  fi
  if [[ -z "${INTENTPROOF_SDK_VERSION:-}" ]]; then
    sdk_version="$(node -p "require('./package.json').version")"
    export INTENTPROOF_SDK_VERSION="$sdk_version"
  fi
  npm exec -- tsx tools/conformance-report.ts || failed=1
  npm exec -- tsx tools/conformance-certificate.ts || failed=1
fi

if [[ "$failed" -ne 0 ]]; then
  echo "==> conformance FAILED" >&2
  exit 1
fi

echo "==> conformance OK"
