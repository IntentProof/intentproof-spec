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
  output="$(
    INTENTPROOF_SPEC_DIR="$ROOT" \
      go test ./cmd/intentproof-verify -run '^TestGoldenCounterpartyVerifyStdout$' -count=1 -v 2>&1
  )" || {
    echo "$output" >&2
    exit 1
  }
  if echo "$output" | grep -qE 'testing: warning: no tests to run|no tests to run'; then
    echo "counterparty golden test missing in intentproof-tools checkout" >&2
    exit 1
  fi
  if echo "$output" | grep -q '^--- SKIP: TestGoldenCounterpartyVerifyStdout'; then
    echo "counterparty golden test skipped; check bundle path and INTENTPROOF_SPEC_DIR" >&2
    echo "$output" >&2
    exit 1
  fi
  if ! echo "$output" | grep -q '^--- PASS: TestGoldenCounterpartyVerifyStdout'; then
    echo "counterparty golden verify test did not pass" >&2
    echo "$output" >&2
    exit 1
  fi
)

echo "PASS: counterparty golden verify stdout matches expected sha256."
