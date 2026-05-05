#!/usr/bin/env bash
# Executable specification oracle for IntentProof SDK CI.
# Spec entrypoint: spec.json (schemas, goldens, semantics paths).
# Requires Node.js 18+ and npm on PATH.
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
#   INTENTPROOF_CONFORMANCE_JSON=1   Emit one JSON object (specVersion, sdk, result, commit, timestamp).
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
  echo "run-conformance.sh: 'node' not found on PATH (Node 18+ required)." >&2
  exit 127
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "run-conformance.sh: 'npm' not found on PATH." >&2
  exit 127
fi

node_major="$(node -p "parseInt(process.version.slice(1).split('.')[0], 10)")"
if [[ -z "$node_major" || "$node_major" -lt 18 ]]; then
  echo "run-conformance.sh: Node.js 18 or newer required (found $(node --version))." >&2
  exit 1
fi

echo "==> IntentProof specification oracle @ $SPEC_ROOT"

failed=0

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
npm run typecheck || failed=1
npm test || failed=1

if [[ "${INTENTPROOF_SPEC_SKIP_SMOKE:-0}" != "1" ]]; then
  echo "==> CLI smoke (example ExecutionEvents)"
  npm run validate:event -- examples/success_event.json || failed=1
  npm run validate:event -- examples/error_event.json || failed=1
fi

if [[ "${INTENTPROOF_REPLAY_VERIFY:-0}" == "1" ]]; then
  echo "==> Replay (canonical stream equivalence)"
  if [[ -n "${INTENTPROOF_REPLAY_STREAMS:-}" ]]; then
    IFS=':' read -r -a replay_paths <<< "${INTENTPROOF_REPLAY_STREAMS}"
    npm exec -- tsx tools/replay/compare-streams.ts "${replay_paths[@]}" || failed=1
  else
    npm exec -- tsx tools/replay/compare-streams.ts \
      "${SPEC_ROOT}/golden/canonicalization_cases.jsonl" \
      "${SPEC_ROOT}/golden/canonicalization_cases.jsonl" || failed=1
  fi
fi

if [[ "${INTENTPROOF_CONFORMANCE_JSON:-0}" == "1" ]]; then
  npm exec -- tsx tools/conformance-report.ts "$failed" || true
fi

if [[ "$failed" -ne 0 ]]; then
  echo "==> conformance FAILED" >&2
  exit 1
fi

echo "==> conformance OK"
