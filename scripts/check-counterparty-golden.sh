#!/usr/bin/env bash
# Verify intentproof-verify stdout for the counterparty golden bundle.
set -euo pipefail

ROOT="${1:-.}"
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

mapfile -t want < "$EXPECTED"
if [[ ${#want[@]} -ne 1 ]]; then
  echo "Expected exactly one hash line in $EXPECTED" >&2
  exit 1
fi

stdout="$(
  cd "$TOOLS_DIR" && go run ./cmd/intentproof-verify "$BUNDLE"
)"
got="$(printf '%s' "$stdout" | sha256sum | awk '{print $1}')"
if [[ "$got" != "${want[0]}" ]]; then
  echo "counterparty golden stdout drift: got $got want ${want[0]}" >&2
  exit 1
fi
echo "PASS: counterparty golden verify stdout matches expected sha256."
