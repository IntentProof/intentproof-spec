#!/usr/bin/env bash
# Verify intentproof-verify stdout for the counterparty golden bundle.
set -euo pipefail

ROOT="${1:-.}"
ROOT="$(cd "$ROOT" && pwd)"
BUNDLE="${ROOT}/golden/counterparty/counterparty-refund.proof.tar.zst"
EXPECTED="${ROOT}/golden/counterparty/expected-verify-stdout-sha256.txt"
TOOLS_DIR="${INTENTPROOF_TOOLS_DIR:-../intentproof-tools}"

if [[ ! -f "$BUNDLE" ]]; then
  echo "Missing golden bundle: $BUNDLE" >&2
  exit 1
fi
if [[ ! -f "$EXPECTED" ]]; then
  echo "Missing expected stdout hash: $EXPECTED" >&2
  exit 1
fi
if [[ ! -d "$TOOLS_DIR" ]]; then
  echo "Set INTENTPROOF_TOOLS_DIR to intentproof-tools checkout" >&2
  exit 1
fi

(
  cd "$TOOLS_DIR"
  INTENTPROOF_SPEC_DIR="$ROOT" \
    go test ./cmd/intentproof-verify -run TestGoldenCounterpartyVerifyStdout -count=1
)

echo "PASS: counterparty golden verify stdout matches expected sha256."
