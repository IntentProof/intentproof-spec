#!/usr/bin/env bash
# Tiered statement coverage from vitest coverage-final.json.
#
# Usage: check-coverage.sh [coverage_json]
# Default: coverage/coverage-final.json

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONF="${ROOT}/scripts/coverage-tiers.conf"
COVERAGE_JSON="${1:-coverage/coverage-final.json}"

if [[ ! -f "$CONF" ]]; then
  echo "coverage tiers config not found: $CONF" >&2
  exit 2
fi

# shellcheck disable=SC1090
source "$CONF"

if [[ -z "${TOTAL_MIN:-}" ]]; then
  echo "coverage-tiers.conf must set TOTAL_MIN" >&2
  exit 2
fi

if [[ ! -f "$COVERAGE_JSON" ]]; then
  echo "coverage json not found: $COVERAGE_JSON" >&2
  exit 2
fi

rules_file="$(mktemp)"
trap 'rm -f "$rules_file"' EXIT
printf '%s\n' "${CRITICAL_RULES[@]}" >"$rules_file"

report_threshold() {
  local label="$1" covered="$2" total="$3" min="$4"
  local pct
  pct="$(awk -v c="$covered" -v t="$total" 'BEGIN { printf "%.1f", 100 * c / t }')"
  echo "${label}: ${pct}% (${covered}/${total} statements), minimum ${min}%"
  if awk -v c="$covered" -v t="$total" -v min="$min" \
    'BEGIN { exit !(t > 0 && c * 100 >= t * min) }'; then
    echo "  PASS"
    return 0
  fi
  echo "  FAIL" >&2
  return 1
}

read -r TOTAL_COVERED TOTAL_STMTS <<EOF
$(node -e "
const cov = require('${ROOT}/${COVERAGE_JSON}');
let covered = 0, total = 0;
for (const file of Object.values(cov)) {
  for (const count of Object.values(file.s)) {
    total += 1;
    if (count > 0) covered += 1;
  }
}
process.stdout.write(String(covered) + ' ' + String(total));
")
EOF

if [[ -z "$TOTAL_STMTS" || "$TOTAL_STMTS" -eq 0 ]]; then
  echo "unable to read total coverage from $COVERAGE_JSON" >&2
  exit 2
fi

fail=0
report_threshold "Total coverage" "$TOTAL_COVERED" "$TOTAL_STMTS" "$TOTAL_MIN" || fail=1

echo "Critical tiers:"
while IFS= read -r rule; do
  [[ -n "$rule" ]] || continue
  min="${rule%%:*}"
  prefix="${rule#*:}"
  read -r c t <<EOF
$(node -e "
const cov = require('${ROOT}/${COVERAGE_JSON}');
const prefix = process.argv[1];
let covered = 0, total = 0;
for (const [path, file] of Object.entries(cov)) {
  if (!path.includes(prefix)) continue;
  for (const count of Object.values(file.s)) {
    total += 1;
    if (count > 0) covered += 1;
  }
}
process.stdout.write(String(covered) + ' ' + String(total));
" "$prefix")
EOF
  if [[ "$t" -eq 0 ]]; then
    echo "  ${prefix} (min ${min}%): no statements in profile, skipped"
    continue
  fi
  report_threshold "  ${prefix}" "$c" "$t" "$min" || fail=1
done <"$rules_file"

if [[ "$fail" -ne 0 ]]; then
  echo "FAIL: coverage threshold not met" >&2
  exit 1
fi

echo "PASS: coverage thresholds met"
exit 0
