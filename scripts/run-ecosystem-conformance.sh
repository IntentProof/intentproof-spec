#!/usr/bin/env bash
# Run federated ecosystem conformance at the current pins/matrix tuple.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 2
  fi
}

require_cmd jq
require_cmd npm
require_cmd go

PINS="${ROOT}/compatibility/pins.v1.json"
MATRIX="${ROOT}/compatibility/matrix.v1.json"

if [[ ! -f "$PINS" || ! -f "$MATRIX" ]]; then
  echo "missing pins or matrix manifest under ${ROOT}/compatibility" >&2
  exit 2
fi

read_matrix_current() {
  jq -r "$1" "$MATRIX" | head -n 1
}

SDK_NODE_REF="$(read_matrix_current '.entries[] | select(.current==true) | .sdk_node_version.source_ref')"
SDK_PYTHON_REF="$(read_matrix_current '.entries[] | select(.current==true) | .sdk_python_version.source_ref')"
SDK_GO_REF="$(read_matrix_current '.entries[] | select(.current==true) | .sdk_go_version.source_ref')"

TOOLS_DIR="${INTENTPROOF_TOOLS_DIR:-}"
CORE_DIR="${INTENTPROOF_CORE_DIR:-}"
SDK_NODE_DIR="${INTENTPROOF_SDK_NODE_DIR:-}"
SDK_PYTHON_DIR="${INTENTPROOF_SDK_PYTHON_DIR:-}"
SDK_GO_DIR="${INTENTPROOF_SDK_GO_DIR:-}"

missing=0
for pair in \
  "INTENTPROOF_TOOLS_DIR:${TOOLS_DIR}" \
  "INTENTPROOF_CORE_DIR:${CORE_DIR}"; do
  name="${pair%%:*}"
  dir="${pair#*:}"
  if [[ -z "$dir" || ! -d "$dir" ]]; then
    echo "set ${name} to an intentproof-tools or intentproof-core checkout" >&2
    missing=1
  fi
done
for pair in \
  "INTENTPROOF_SDK_NODE_DIR:${SDK_NODE_DIR}:${SDK_NODE_REF}" \
  "INTENTPROOF_SDK_PYTHON_DIR:${SDK_PYTHON_DIR}:${SDK_PYTHON_REF}" \
  "INTENTPROOF_SDK_GO_DIR:${SDK_GO_DIR}:${SDK_GO_REF}"; do
  name="${pair%%:*}"
  rest="${pair#*:}"
  dir="${rest%%:*}"
  expected="${rest##*:}"
  if [[ -z "$dir" || ! -d "$dir" ]]; then
    echo "set ${name} to a checkout at ${expected}" >&2
    missing=1
    continue
  fi
  actual="$(git -C "$dir" rev-parse HEAD 2>/dev/null || true)"
  if [[ "$actual" != "$expected" ]]; then
    echo "${name} checkout ${actual:-unknown} != expected tuple ${expected}" >&2
    missing=1
  fi
done
if [[ "$missing" -ne 0 ]]; then
  exit 2
fi

echo "Ecosystem conformance (spec=${ROOT})..."

echo "== spec conformance oracle =="
npm run --silent test:legacy

echo "== ecosystem pins =="
export INTENTPROOF_TOOLS_DIR="$TOOLS_DIR"
export INTENTPROOF_CORE_DIR="$CORE_DIR"
bash "${ROOT}/scripts/check-ecosystem-pins.sh"

echo "== tools spec conformance =="
INTENTPROOF_SPEC_DIR="$ROOT" bash "${TOOLS_DIR}/scripts/check-spec-conformance.sh"

echo "== core spec conformance =="
INTENTPROOF_SPEC_DIR="$ROOT" bash "${CORE_DIR}/scripts/check-spec-conformance.sh"

echo "== node sdk signing golden =="
(
  cd "$SDK_NODE_DIR"
  npm ci
  INTENTPROOF_SPEC_DIR="$ROOT" npm test
  INTENTPROOF_SPEC_DIR="$ROOT" bash ./scripts/check-sdk-signing-fixtures-sync.sh
)

echo "== python sdk signing golden =="
(
  cd "$SDK_PYTHON_DIR"
  pip install -e ".[dev]"
  INTENTPROOF_SPEC_DIR="$ROOT" pytest tests/test_sdk.py::test_signing_golden_bytes -q
  INTENTPROOF_SPEC_DIR="$ROOT" bash ./scripts/check-sdk-signing-fixtures-sync.sh
)

echo "== go sdk signing golden =="
(
  cd "$SDK_GO_DIR"
  INTENTPROOF_SPEC_DIR="$ROOT" GOWORK=off go test ./intentproof -run TestSigningGoldenBytes -count=1
  INTENTPROOF_SPEC_DIR="$ROOT" bash ./scripts/check-sdk-signing-fixtures-sync.sh
)

echo "== jcs differential smoke =="
(
  cd "$TOOLS_DIR"
  export INTENTPROOF_SPEC_DIR="$ROOT"
  export INTENTPROOF_NODE_SDK_DIR="$SDK_NODE_DIR"
  export INTENTPROOF_PYTHON_SDK_DIR="$SDK_PYTHON_DIR"
  go test -count=1 ./cmd/jcs-differential-fuzz/
  go run ./cmd/jcs-differential-fuzz/ -iterations 64
)

echo "PASS: ecosystem conformance completed."
