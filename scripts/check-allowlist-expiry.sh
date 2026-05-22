#!/usr/bin/env bash
# Validate allowlist YAML expiry dates (minimal parser, no PyYAML).
# Usage: check-allowlist-expiry.sh [file] [id-field...]
set -euo pipefail

ALLOWLIST_FILE="${1:-.github/codeql-allowlist.yml}"
shift || true
ID_FIELDS=("$@")
if ((${#ID_FIELDS[@]} == 0)); then
  ID_FIELDS=(rule_id)
fi

if [[ ! -f "$ALLOWLIST_FILE" ]]; then
  echo "No allowlist file at $ALLOWLIST_FILE; skipping expiry check."
  exit 0
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to validate $ALLOWLIST_FILE" >&2
  exit 1
fi

python3 - "$ALLOWLIST_FILE" "${ID_FIELDS[*]}" <<'PY'
import datetime
import re
import sys

path = sys.argv[1]
id_fields = sys.argv[2].split()
patterns = {
    "rule_id": re.compile(r"rule_id:\s*(\S+)"),
    "cve_id": re.compile(r"cve_id:\s*(\S+)"),
    "id": re.compile(r"(?:^|\s)id:\s*(\S+)"),
}


def extract_id(text, anchored=False):
    for field in id_fields:
        pattern = patterns.get(field)
        if pattern is None:
            continue
        match = pattern.match(text) if anchored else pattern.search(text)
        if match:
            return match.group(1)
    return None


text = open(path, encoding="utf-8").read()
entries = []
current = None
for line in text.splitlines():
    stripped = line.strip()
    if stripped.startswith("- "):
        if current is not None:
            entries.append(current)
        current = {}
        item = stripped[2:].strip()
        entry_id = extract_id(item, anchored=False)
        if entry_id:
            current["id"] = entry_id
        match = re.search(r"expires:\s*(\S+)", item)
        if match:
            current["expires"] = match.group(1)
        continue
    if current is None:
        continue
    match = re.match(r"expires:\s*(\S+)", stripped)
    if match:
        current["expires"] = match.group(1)
    entry_id = extract_id(stripped, anchored=True)
    if entry_id:
        current["id"] = entry_id
if current is not None:
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
        entry_id = entry.get("id", "<unknown>")
        expired.append(f"{entry_id} (expired {expires.isoformat()})")

if expired:
    print("Allowlist expired; contact security on-call to extend or remove:", file=sys.stderr)
    for item in expired:
        print(f"  - {item}", file=sys.stderr)
    sys.exit(1)

print(f"PASS: {len(entries)} allowlist entries are current.")
PY
