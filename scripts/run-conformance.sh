#!/usr/bin/env bash
# Language-agnostic conformance gate for IntentProof SDK CI.
# Spec source of truth: https://github.com/intentproof/intentproof-spec
# Requires Node.js 18+ and npm on PATH.
#
# Usage:
#   bash scripts/run-conformance.sh                    # from repo root, or any cwd
#   bash path/to/intentproof-spec/scripts/run-conformance.sh
#   bash scripts/run-conformance.sh /abs/path/to/intentproof-spec
#
# Steps: npm ci|install → npm run typecheck → npm test → validate-event (examples).
#
# Environment:
#   INTENTPROOF_SPEC_ROOT            Absolute path to this repository (overrides cwd / argv).
#   INTENTPROOF_SPEC_SKIP_INSTALL=1  Skip npm ci/install (requires existing node_modules).
#   INTENTPROOF_SPEC_SKIP_SMOKE=1    Skip validate:event on examples after Vitest.

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

if [[ ! -f package.json ]] || [[ ! -d schema ]] || [[ ! -d golden ]]; then
  echo "run-conformance.sh: '$SPEC_ROOT' does not look like intentproof-spec (missing package.json, schema/, or golden/)." >&2
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

echo "==> intentproof-spec conformance @ $SPEC_ROOT"

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

npm run typecheck
npm test

if [[ "${INTENTPROOF_SPEC_SKIP_SMOKE:-0}" != "1" ]]; then
  echo "==> CLI smoke (example ExecutionEvents)"
  npm run validate:event -- examples/success_event.json
  npm run validate:event -- examples/error_event.json
fi

echo "==> conformance OK"
