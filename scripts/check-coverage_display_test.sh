#!/usr/bin/env bash
# Regression test: displayed percent must not round up past a failing gate.
set -euo pipefail

pct="$(awk -v c=9399 -v t=10000 'BEGIN {
  if (t == 0) { print "0.0"; exit }
  printf "%.1f", int(1000 * c / t) / 10
}')"

if [[ "$pct" != "93.9" ]]; then
  echo "FAIL: expected truncated display 93.9%, got ${pct}%" >&2
  exit 1
fi

if awk -v c=9399 -v t=10000 -v min=94 \
  'BEGIN { exit !(t > 0 && c * 100 >= t * min) }'; then
  echo "FAIL: expected integer gate to fail at 9399/10000 min 94%" >&2
  exit 1
fi

echo "PASS: display percent matches integer gate semantics"
