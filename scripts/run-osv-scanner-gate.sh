#!/usr/bin/env bash
# Run OSV-Scanner and fail only on CRITICAL or HIGH findings.
# MEDIUM and LOW are reported but non-blocking per SECURITY-PROCESS.md.
set -euo pipefail

ROOT="${1:-.}"
CONFIG="${2:-.osv-scanner.toml}"
if (( $# > 2 )); then
  EXTRA_LOCKFILES=("${@:3}")
else
  EXTRA_LOCKFILES=()
fi
OSV_VERSION="${OSV_SCANNER_VERSION:-v2.2.2}"

if ! command -v osv-scanner >/dev/null 2>&1; then
  arch=linux_amd64
  case "$(uname -m)" in
    aarch64 | arm64) arch=linux_arm64 ;;
    x86_64 | amd64) arch=linux_amd64 ;;
  esac
  tmp="$(mktemp)"
  curl -sSfL \
    "https://github.com/google/osv-scanner/releases/download/${OSV_VERSION}/osv-scanner_${arch}" \
    -o "$tmp"
  chmod +x "$tmp"
  sudo install -m 755 "$tmp" /usr/local/bin/osv-scanner
  rm -f "$tmp"
fi

args=(scan source --format=table --no-call-analysis=all --allow-no-lockfiles)
if [[ -f "$CONFIG" ]]; then
  args+=(--config="$CONFIG")
fi

if ((${#EXTRA_LOCKFILES[@]} > 0)); then
  for lockfile in "${EXTRA_LOCKFILES[@]}"; do
    args+=(--lockfile="$lockfile")
  done
else
  args+=(--recursive "$ROOT")
fi

output_file="$(mktemp)"
trap 'rm -f "$output_file"' EXIT

set +e
osv-scanner "${args[@]}" >"$output_file" 2>&1
status=$?
set -e

cat "$output_file"

if [[ "$status" -eq 128 ]] && grep -q "No package sources found" "$output_file"; then
  echo "PASS: no scannable dependency manifests (OSV skipped)"
  exit 0
fi

if [[ "$status" -gt 1 ]]; then
  echo "osv-scanner failed unexpectedly (exit $status)" >&2
  exit "$status"
fi

python3 - "$output_file" <<'PY'
import re
import sys

with open(sys.argv[1], encoding="utf-8") as fh:
    text = fh.read()

if "No issues found" in text:
    print("PASS: no OSV findings")
    raise SystemExit(0)

match = re.search(
    r"\((\d+) Critical, (\d+) High, (\d+) Medium, (\d+) Low",
    text,
)
if not match:
    if re.search(r"\b(GHSA-[a-z0-9-]+|GO-\d{4}-\d+|CVE-\d{4}-\d+)\b", text):
        print(
            "FAIL: OSV findings present but severity summary missing",
            file=sys.stderr,
        )
        raise SystemExit(1)
    print("PASS: no parseable HIGH/CRITICAL OSV findings")
    raise SystemExit(0)

critical = int(match.group(1))
high = int(match.group(2))
if critical or high:
    print(
        f"FAIL: OSV found {critical} Critical and {high} High findings",
        file=sys.stderr,
    )
    raise SystemExit(1)

print(
    "PASS: OSV gate "
    f"(Critical={critical}, High={high}; Medium/Low non-blocking)"
)
PY
