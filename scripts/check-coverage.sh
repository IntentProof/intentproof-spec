#!/usr/bin/env bash
# Verify total statement coverage from vitest coverage-final.json.
# Usage: check-coverage.sh [coverage_json] [min_percent]
# Default json: coverage/coverage-final.json. Default minimum: 95%.

set -euo pipefail

COVERAGE_JSON="${1:-coverage/coverage-final.json}"
MIN_COVERAGE="${2:-95}"

if [[ ! -f "$COVERAGE_JSON" ]]; then
  echo "coverage json not found: $COVERAGE_JSON" >&2
  exit 2
fi

read -r COVERED TOTAL <<EOF
$(node -e "
const cov = require('./${COVERAGE_JSON}');
let covered = 0;
let total = 0;
for (const file of Object.values(cov)) {
  for (const count of Object.values(file.s)) {
    total += 1;
    if (count > 0) covered += 1;
  }
}
process.stdout.write(String(covered) + ' ' + String(total));
")
EOF

if [[ -z "$TOTAL" || "$TOTAL" -eq 0 ]]; then
  echo "unable to read total coverage from $COVERAGE_JSON" >&2
  exit 2
fi

DISPLAY_PERCENT="$(awk -v c="$COVERED" -v t="$TOTAL" 'BEGIN { printf "%.1f", 100*c/t }')"

echo "Total coverage: ${DISPLAY_PERCENT}% (${COVERED}/${TOTAL} statements)"
echo "Minimum required: ${MIN_COVERAGE}%"

if awk -v c="$COVERED" -v t="$TOTAL" -v min="$MIN_COVERAGE" \
  'BEGIN { exit !(c * 100 >= t * min) }'; then
  echo "PASS: coverage threshold met"
  exit 0
fi

echo "FAIL: coverage threshold not met" >&2
exit 1
