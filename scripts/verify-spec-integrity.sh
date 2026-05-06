#!/usr/bin/env bash
# Verify signed spec schema integrity manifest (artifacts + signing/*.public.pem).
# Usage:
#   bash scripts/verify-spec-integrity.sh [SPEC_ROOT]
# Defaults SPEC_ROOT to INTENTPROOF_SPEC_ROOT or this repository.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
spec_root="${1:-${INTENTPROOF_SPEC_ROOT:-$here/..}}"
spec_root="$(cd "$spec_root" && pwd)"

if [[ ! -f "${spec_root}/package.json" ]] || [[ ! -f "${spec_root}/tools/spec-integrity.ts" ]]; then
  echo "verify-spec-integrity: not an intentproof-spec checkout: ${spec_root}" >&2
  exit 2
fi

cd "$spec_root"
if [[ ! -d node_modules ]]; then
  if [[ -f package-lock.json ]]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
fi
npm exec -- tsx tools/spec-integrity.ts verify
