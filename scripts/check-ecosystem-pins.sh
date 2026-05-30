#!/usr/bin/env bash
# Verify cross-repo SPEC_REF alignment and pins manifest consistency.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

resolve_dir() {
  local env_name="$1"
  local env_val="${!env_name:-}"
  if [[ -n "$env_val" && -f "$env_val/SPEC_REF" ]]; then
    printf '%s\n' "$(cd "$env_val" && pwd)"
    return 0
  fi
  if [[ -n "$env_val" && -f "$env_val/contrib/oss-fuzz/intentproof/pins.env" ]]; then
    printf '%s\n' "$(cd "$env_val" && pwd)"
    return 0
  fi
  local candidate
  for candidate in \
    "$ROOT/../$2" \
    "$ROOT/$2"; do
    if [[ -f "$candidate/SPEC_REF" || -f "$candidate/contrib/oss-fuzz/intentproof/pins.env" ]]; then
      printf '%s\n' "$(cd "$candidate" && pwd)"
      return 0
    fi
  done
  return 1
}

TOOLS_DIR=""
CORE_DIR=""
if TOOLS_DIR="$(resolve_dir INTENTPROOF_TOOLS_DIR intentproof-tools)"; then :; else
  echo "intentproof-tools checkout not found; set INTENTPROOF_TOOLS_DIR" >&2
  exit 2
fi
if CORE_DIR="$(resolve_dir INTENTPROOF_CORE_DIR intentproof-core)"; then :; else
  echo "intentproof-core checkout not found; set INTENTPROOF_CORE_DIR" >&2
  exit 2
fi

export INTENTPROOF_TOOLS_DIR="$TOOLS_DIR"
export INTENTPROOF_CORE_DIR="$CORE_DIR"

echo "Ecosystem pins check (tools=$TOOLS_DIR core=$CORE_DIR)..."

npm run --silent compatibility-pins-verify

echo "PASS: ecosystem pins aligned."
