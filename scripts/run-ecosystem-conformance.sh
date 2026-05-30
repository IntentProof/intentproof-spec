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

require_cmd npm
require_cmd go

PINS="${ROOT}/compatibility/pins.v1.json"
MATRIX="${ROOT}/compatibility/matrix.v1.json"

if [[ ! -f "$PINS" || ! -f "$MATRIX" ]]; then
  echo "missing pins or matrix manifest under ${ROOT}/compatibility" >&2
  exit 2
fi

TOOLS_DIR="${INTENTPROOF_TOOLS_DIR:-}"
CORE_DIR="${INTENTPROOF_CORE_DIR:-}"
SDK_NODE_DIR="${INTENTPROOF_SDK_NODE_DIR:-}"
SDK_PYTHON_DIR="${INTENTPROOF_SDK_PYTHON_DIR:-}"
SDK_GO_DIR="${INTENTPROOF_SDK_GO_DIR:-}"

abs_sibling_dir() {
  local dir="$1"
  if [[ -z "$dir" ]]; then
    return 1
  fi
  if [[ "$dir" != /* ]]; then
    dir="${ROOT}/${dir}"
  fi
  cd "$dir" && pwd
}

TOOLS_DIR="$(abs_sibling_dir "$TOOLS_DIR" || true)"
CORE_DIR="$(abs_sibling_dir "$CORE_DIR" || true)"
SDK_NODE_DIR="$(abs_sibling_dir "$SDK_NODE_DIR" || true)"
SDK_PYTHON_DIR="$(abs_sibling_dir "$SDK_PYTHON_DIR" || true)"
SDK_GO_DIR="$(abs_sibling_dir "$SDK_GO_DIR" || true)"

missing=0
for name_dir in \
  "INTENTPROOF_TOOLS_DIR:${TOOLS_DIR}" \
  "INTENTPROOF_CORE_DIR:${CORE_DIR}" \
  "INTENTPROOF_SDK_NODE_DIR:${SDK_NODE_DIR}" \
  "INTENTPROOF_SDK_PYTHON_DIR:${SDK_PYTHON_DIR}" \
  "INTENTPROOF_SDK_GO_DIR:${SDK_GO_DIR}"; do
  name="${name_dir%%:*}"
  dir="${name_dir#*:}"
  if [[ -z "$dir" || ! -d "$dir" ]]; then
    echo "set ${name} to a sibling repository checkout" >&2
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
(
  cd "$TOOLS_DIR"
  INTENTPROOF_SPEC_DIR="$ROOT" bash ./scripts/check-spec-conformance.sh
)

echo "== core spec conformance =="
(
  cd "$CORE_DIR"
  INTENTPROOF_SPEC_DIR="$ROOT" bash ./scripts/check-spec-conformance.sh
)

echo "== node sdk signing golden =="
(
  cd "$SDK_NODE_DIR"
  npm ci
  npm run build
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
  # jcs-differential-fuzz uses INTENTPROOF_{NODE,PYTHON}_SDK_DIR (tools convention).
  export INTENTPROOF_NODE_SDK_DIR="$SDK_NODE_DIR"
  export INTENTPROOF_PYTHON_SDK_DIR="$SDK_PYTHON_DIR"
  go test -count=1 ./cmd/jcs-differential-fuzz/ \
    -run 'TestCompareGoldenSigningFixture|TestCompareGeneratedSeeds'
  go run ./cmd/jcs-differential-fuzz/ -iterations 64
)

echo "== stripe adapter conformance =="
require_cmd npx
npx ts-node "${ROOT}/conformance/stripe_demo_fixtures.ts"

(
  cd "$CORE_DIR"
  INTENTPROOF_SPEC_DIR="$ROOT" GOWORK=off go test ./cmd/attestation-gw/ \
    -run 'TestStripe.*' -count=1
)

(
  cd "$TOOLS_DIR"
  INTENTPROOF_SPEC_DIR="$ROOT" go test ./pkg/demo/ \
    -run 'TestStripeGoldenFixtureVerifyAndCanonicalize|TestReplayStripeDemoIntoStore' \
    -count=1
)

echo "== bundle verification profile gate =="
(
  cd "$TOOLS_DIR"
  bash ./scripts/check-bundle-verification-profile.sh "$ROOT"
)

echo "PASS: ecosystem conformance completed."
