#!/usr/bin/env bash
# Verify tools SPEC_REF, SDK SOURCE_REF, and matrix alignment against pins.v1.json.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

resolve_repo_dir() {
  local env_name="$1"
  local sibling="$2"
  local ref_file="$3"
  local env_val="${!env_name:-}"
  if [[ -n "$env_val" && -d "$env_val" ]]; then
    printf '%s\n' "$(cd "$env_val" && pwd)"
    return 0
  fi
  local candidate
  for candidate in "$ROOT/../$sibling" "$ROOT/$sibling"; do
    if [[ -d "$candidate/.git" ]]; then
      printf '%s\n' "$(cd "$candidate" && pwd)"
      return 0
    fi
  done
  return 1
}

TOOLS_DIR=""
SDK_NODE_DIR=""
SDK_PYTHON_DIR=""
SDK_GO_DIR=""

if ! TOOLS_DIR="$(resolve_repo_dir INTENTPROOF_TOOLS_DIR intentproof-tools SPEC_REF)"; then
  echo "intentproof-tools checkout not found; set INTENTPROOF_TOOLS_DIR" >&2
  exit 2
fi
for pair in \
  "INTENTPROOF_SDK_NODE_DIR intentproof-sdk-node SOURCE_REF" \
  "INTENTPROOF_SDK_PYTHON_DIR intentproof-sdk-python SOURCE_REF" \
  "INTENTPROOF_SDK_GO_DIR intentproof-sdk-go SOURCE_REF"; do
  set -- $pair
  if ! dir="$(resolve_repo_dir "$1" "$2" "$3")"; then
    echo "$2 checkout not found; set $1" >&2
    exit 2
  fi
  case "$2" in
    intentproof-sdk-node) SDK_NODE_DIR="$dir" ;;
    intentproof-sdk-python) SDK_PYTHON_DIR="$dir" ;;
    intentproof-sdk-go) SDK_GO_DIR="$dir" ;;
  esac
done

export INTENTPROOF_TOOLS_DIR="$TOOLS_DIR"
export INTENTPROOF_SDK_NODE_DIR="$SDK_NODE_DIR"
export INTENTPROOF_SDK_PYTHON_DIR="$SDK_PYTHON_DIR"
export INTENTPROOF_SDK_GO_DIR="$SDK_GO_DIR"

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

echo "Ecosystem pins check (pins_ref=$PINS_REF HEAD=$HEAD)..."
npm run --silent compatibility-pins-verify
npm run --silent compatibility-matrix-verify
echo "PASS: ecosystem pins aligned."
