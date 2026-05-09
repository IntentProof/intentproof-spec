#!/usr/bin/env bash
# Print the consumer-declared immutable intentproof-spec git SHA (40-char lowercase hex).
# Same discovery rules as scripts/check-consumer-spec-pins.sh (stdout is ONLY the SHA).
# Usage: read-consumer-spec-commit.sh /absolute/path/to/consumer-repo
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: read-consumer-spec-commit.sh /path/to/consumer-repo" >&2
  exit 2
fi

consumer_root="$(cd "$1" && pwd)"

if [[ -f "${consumer_root}/packages/sdk/package.json" ]]; then
  export IP_SDK_ROOT_JSON="${consumer_root}/package.json"
  export IP_SDK_PKG_JSON="${consumer_root}/packages/sdk/package.json"
  node - <<'NODE'
const fs = require("node:fs");
const root = JSON.parse(fs.readFileSync(process.env.IP_SDK_ROOT_JSON, "utf8"));
const pkg = JSON.parse(fs.readFileSync(process.env.IP_SDK_PKG_JSON, "utf8"));
const a = root.intentproofSpecCommit;
const b = pkg.intentproofSpecCommit;
if (!a || !b || a !== b) process.exit(2);
if (!/^[a-f0-9]{40}$/.test(a)) process.exit(3);
process.stdout.write(a + "\n");
NODE
  ec=$?
  unset IP_SDK_ROOT_JSON IP_SDK_PKG_JSON
  if [[ "$ec" -eq 2 ]]; then
    echo "read-consumer-spec-commit: root and packages/sdk package.json must declare matching intentproofSpecCommit" >&2
    exit 2
  fi
  if [[ "$ec" -eq 3 ]]; then
    echo "read-consumer-spec-commit: intentproofSpecCommit must be 40-char lowercase hex" >&2
    exit 2
  fi
  if [[ "$ec" -ne 0 ]]; then
    echo "read-consumer-spec-commit: failed reading Node package.json pins (exit ${ec})" >&2
    exit "$ec"
  fi
  exit 0
fi

if [[ -f "${consumer_root}/pyproject.toml" ]]; then
  python3 - "${consumer_root}/pyproject.toml" <<'PY'
import re
import sys
import tomllib
from pathlib import Path
p = Path(sys.argv[1])
data = tomllib.loads(p.read_text(encoding="utf-8"))
ip = data.get("tool", {}).get("intentproof", {})
commit = ip.get("spec-commit")
if not commit or not re.fullmatch(r"[a-f0-9]{40}", commit):
    sys.exit(2)
print(commit)
PY
  exit $?
fi

if [[ -f "${consumer_root}/build.gradle.kts" ]]; then
  props="${consumer_root}/gradle.properties"
  if [[ ! -f "$props" ]]; then
    echo "read-consumer-spec-commit: gradle.properties missing for Java consumer layout" >&2
    exit 2
  fi
  python3 - "${props}" <<'PY'
import re
import sys
from pathlib import Path
text = Path(sys.argv[1]).read_text(encoding="utf-8")
m = re.search(r"^intentproofSpecCommit=(.+)$", text, re.MULTILINE)
if not m:
    sys.exit(2)
commit = m.group(1).strip()
if not re.fullmatch(r"[a-f0-9]{40}", commit):
    sys.exit(2)
print(commit)
PY
  exit $?
fi

echo "read-consumer-spec-commit: could not detect consumer repository layout under ${consumer_root}" >&2
exit 2
