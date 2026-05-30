#!/usr/bin/env bash
# Verify tools SPEC_REF and matrix alignment against pins.v1.json.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

resolve_tools_dir() {
  local candidate
  if [[ -n "${INTENTPROOF_TOOLS_DIR:-}" && -f "${INTENTPROOF_TOOLS_DIR}/SPEC_REF" ]]; then
    printf '%s\n' "$(cd "${INTENTPROOF_TOOLS_DIR}" && pwd)"
    return 0
  fi
  for candidate in "$ROOT/../intentproof-tools" "$ROOT/intentproof-tools"; do
    if [[ -f "$candidate/SPEC_REF" ]]; then
      printf '%s\n' "$(cd "$candidate" && pwd)"
      return 0
    fi
  done
  return 1
}

TOOLS_DIR=""
if ! TOOLS_DIR="$(resolve_tools_dir)"; then
  echo "intentproof-tools checkout not found; set INTENTPROOF_TOOLS_DIR" >&2
  exit 2
fi
export INTENTPROOF_TOOLS_DIR="$TOOLS_DIR"

HEAD="$(git rev-parse HEAD)"
PINS_REF="$(node -e "const p=require('./compatibility/pins.v1.json'); process.stdout.write(p.spec_ref)")"

if ! git cat-file -e "${PINS_REF}^{commit}" 2>/dev/null; then
  echo "FAIL: pins.spec_ref ($PINS_REF) is not a commit in this repository" >&2
  exit 1
fi

if ! git merge-base --is-ancestor "$PINS_REF" HEAD; then
  echo "FAIL: pins.spec_ref ($PINS_REF) is not an ancestor of HEAD ($HEAD)" >&2
  exit 1
fi

# Paths that define the spec revision consumers (tools/SDKs) must pin.
PINNED_PATHS=(schema golden reference-policies)
if git diff --name-only "$PINS_REF" HEAD -- "${PINNED_PATHS[@]}" | grep -q .; then
  if [[ "$HEAD" != "$PINS_REF" ]]; then
    echo "FAIL: spec content under ${PINNED_PATHS[*]} changed since pins.spec_ref" >&2
    echo "  pins.spec_ref=$PINS_REF" >&2
    echo "  HEAD=$HEAD" >&2
    echo "Bump pins.v1.json, matrix, integrity manifest, and intentproof-tools/SPEC_REF." >&2
    exit 1
  fi
fi

echo "Ecosystem pins check (pins_ref=$PINS_REF HEAD=$HEAD tools=$TOOLS_DIR)..."
npm run --silent compatibility-pins-verify
npm run --silent compatibility-matrix-verify
echo "PASS: ecosystem pins aligned."
