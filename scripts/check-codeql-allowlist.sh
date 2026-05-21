#!/usr/bin/env bash
# Validate .github/codeql-allowlist.yml expiry dates.
# Expired entries fail with a clear message for security on-call follow-up.
set -euo pipefail

ALLOWLIST_FILE="${1:-.github/codeql-allowlist.yml}"

if [[ ! -f "$ALLOWLIST_FILE" ]]; then
  echo "No allowlist file at $ALLOWLIST_FILE; skipping expiry check."
  exit 0
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to validate $ALLOWLIST_FILE" >&2
  exit 1
fi

python3 - "$ALLOWLIST_FILE" <<'PY'
import datetime
import re
import sys

path = sys.argv[1]
text = open(path, encoding="utf-8").read()

# Minimal parser for our allowlist schema (no PyYAML dependency).
entries = []
current = None
for line in text.splitlines():
    stripped = line.strip()
    if stripped.startswith("- "):
        if current:
            entries.append(current)
        current = {}
        item = stripped[2:].strip()
        m = re.search(r"rule_id:\s*(\S+)", item)
        if m:
            current["rule_id"] = m.group(1)
        m = re.search(r"expires:\s*(\S+)", item)
        if m:
            current["expires"] = m.group(1)
        continue
    if current is None:
        continue
    m = re.match(r"expires:\s*(\S+)", stripped)
    if m:
        current["expires"] = m.group(1)
    m = re.match(r"rule_id:\s*(\S+)", stripped)
    if m:
        current["rule_id"] = m.group(1)
if current:
    entries.append(current)

today = datetime.date.today()
expired = []
for idx, entry in enumerate(entries):
    expires_raw = entry.get("expires")
    if not expires_raw:
        print(
            f"{path}: allowlist[{idx}] missing expires date "
            "(required for security on-call approval model)",
            file=sys.stderr,
        )
        sys.exit(1)
    try:
        expires = datetime.date.fromisoformat(str(expires_raw))
    except ValueError:
        print(
            f"{path}: allowlist[{idx}] has invalid expires date: {expires_raw!r}",
            file=sys.stderr,
        )
        sys.exit(1)
    if expires < today:
        rule_id = entry.get("rule_id", "<unknown>")
        expired.append(f"{rule_id} (expired {expires.isoformat()})")

if expired:
    print("Allowlist expired; contact security on-call to extend or remove:", file=sys.stderr)
    for item in expired:
        print(f"  - {item}", file=sys.stderr)
    sys.exit(1)

print(f"PASS: {len(entries)} allowlist entries are current.")
PY
