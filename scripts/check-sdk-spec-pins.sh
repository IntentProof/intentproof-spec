#!/usr/bin/env bash
# Canonical SDK pin contract: spec version + immutable spec commit must match the spec checkout.
# Usage:
#   bash scripts/check-sdk-spec-pins.sh SDK_ROOT SPEC_ROOT
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: check-sdk-spec-pins.sh SDK_ROOT SPEC_ROOT" >&2
  exit 2
fi

sdk_root="$(cd "$1" && pwd)"
spec_root="$(cd "$2" && pwd)"

if [[ ! -f "${spec_root}/spec.json" ]]; then
  echo "check-sdk-spec-pins: not a spec checkout (missing spec.json): ${spec_root}" >&2
  exit 2
fi

if ! git -C "$spec_root" rev-parse HEAD >/dev/null 2>&1; then
  echo "check-sdk-spec-pins: spec_root is not a git checkout: ${spec_root}" >&2
  exit 2
fi

spec_version="$(python3 -c "import json, pathlib, sys; print(json.loads(pathlib.Path(sys.argv[1]).read_text())['version'])" "${spec_root}/spec.json")"
head_sha="$(git -C "$spec_root" rev-parse HEAD)"

if [[ ! "$head_sha" =~ ^[a-f0-9]{40}$ ]]; then
  echo "check-sdk-spec-pins: unexpected git rev-parse output: ${head_sha}" >&2
  exit 2
fi

fail_pin() {
  echo "check-sdk-spec-pins: $*" >&2
  exit 1
}

if [[ -f "${sdk_root}/packages/sdk/package.json" ]]; then
  export IP_SDK_ROOT_JSON="${sdk_root}/package.json"
  export IP_SDK_PKG_JSON="${sdk_root}/packages/sdk/package.json"
  _pin_tmp="$(mktemp)"
  node - <<'NODE' >"${_pin_tmp}"
const fs = require("node:fs");
const root = JSON.parse(fs.readFileSync(process.env.IP_SDK_ROOT_JSON, "utf8"));
const pkg = JSON.parse(fs.readFileSync(process.env.IP_SDK_PKG_JSON, "utf8"));
if (!root.intentproofSpecVersion || !root.intentproofSpecCommit) process.exit(2);
if (!pkg.intentproofSpecVersion || !pkg.intentproofSpecCommit) process.exit(3);
process.stdout.write(
  `${root.intentproofSpecVersion}\n${root.intentproofSpecCommit}\n${pkg.intentproofSpecVersion}\n${pkg.intentproofSpecCommit}\n`,
);
NODE
  ec=$?
  mapfile -t vers <"${_pin_tmp}"
  rm -f "${_pin_tmp}"
  unset IP_SDK_ROOT_JSON IP_SDK_PKG_JSON
  if [[ "$ec" -eq 2 ]]; then
    fail_pin "root package.json must declare intentproofSpecVersion and intentproofSpecCommit (40-char hex SHA)"
  fi
  if [[ "$ec" -eq 3 ]]; then
    fail_pin "packages/sdk/package.json must declare intentproofSpecVersion and intentproofSpecCommit (40-char hex SHA)"
  fi
  if [[ "$ec" -ne 0 ]]; then
    fail_pin "node failed reading package.json pins (exit ${ec})"
  fi
  root_ver="${vers[0]}"
  root_commit="${vers[1]}"
  pkg_ver="${vers[2]}"
  pkg_commit="${vers[3]}"
  if [[ "$root_ver" != "$spec_version" ]]; then
    fail_pin "root package.json intentproofSpecVersion=${root_ver} but spec.json version=${spec_version}"
  fi
  if [[ "$pkg_ver" != "$spec_version" ]]; then
    fail_pin "packages/sdk/package.json intentproofSpecVersion=${pkg_ver} but spec.json version=${spec_version}"
  fi
  if [[ "$root_commit" != "$pkg_commit" ]]; then
    fail_pin "root intentproofSpecCommit (${root_commit}) !== packages/sdk intentproofSpecCommit (${pkg_commit})"
  fi
  if [[ "$root_commit" != "$head_sha" ]]; then
    fail_pin "declared intentproofSpecCommit=${root_commit} but spec checkout HEAD=${head_sha}"
  fi
  if [[ ! "$root_commit" =~ ^[a-f0-9]{40}$ ]]; then
    fail_pin "intentproofSpecCommit must be a 40-character lowercase hex SHA"
  fi
elif [[ -f "${sdk_root}/pyproject.toml" ]]; then
  _pin_tmp="$(mktemp)"
  python3 - <<PY >"${_pin_tmp}"
import tomllib
from pathlib import Path
p = Path("${sdk_root}/pyproject.toml")
data = tomllib.loads(p.read_text(encoding="utf-8"))
ip = data.get("tool", {}).get("intentproof", {})
ver = ip.get("spec-version")
commit = ip.get("spec-commit")
if not ver or not commit:
    raise SystemExit(2)
print(ver)
print(commit)
PY
  ec=$?
  mapfile -t pv <"${_pin_tmp}"
  rm -f "${_pin_tmp}"
  if [[ "$ec" -eq 2 ]]; then
    fail_pin "pyproject.toml [tool.intentproof] must declare spec-version and spec-commit (40-char hex SHA)"
  fi
  if [[ "$ec" -ne 0 ]]; then
    fail_pin "python failed reading pyproject pins (exit ${ec})"
  fi
  py_ver="${pv[0]}"
  py_commit="${pv[1]}"
  if [[ "$py_ver" != "$spec_version" ]]; then
    fail_pin "pyproject spec-version=${py_ver} but spec.json version=${spec_version}"
  fi
  if [[ "$py_commit" != "$head_sha" ]]; then
    fail_pin "declared spec-commit=${py_commit} but spec checkout HEAD=${head_sha}"
  fi
  if [[ ! "$py_commit" =~ ^[a-f0-9]{40}$ ]]; then
    fail_pin "spec-commit must be a 40-character lowercase hex SHA"
  fi
elif [[ -f "${sdk_root}/build.gradle.kts" ]]; then
  props="${sdk_root}/gradle.properties"
  if [[ ! -f "$props" ]]; then
    fail_pin "Java SDK missing gradle.properties"
  fi
  _pin_tmp="$(mktemp)"
  python3 - <<PY >"${_pin_tmp}"
import re
from pathlib import Path
props = Path("${props}")
text = props.read_text(encoding="utf-8")

def get(key: str):
    m = re.search(rf"^{re.escape(key)}=(.*)$", text, re.MULTILINE)
    return m.group(1).strip() if m else None

ver = get("intentproofSpecVersion")
commit = get("intentproofSpecCommit")
if not ver or not commit:
    raise SystemExit(2)
print(ver)
print(commit)
PY
  ec=$?
  mapfile -t jv <"${_pin_tmp}"
  rm -f "${_pin_tmp}"
  if [[ "$ec" -eq 2 ]]; then
    fail_pin "gradle.properties must declare intentproofSpecVersion and intentproofSpecCommit (40-char hex SHA)"
  fi
  if [[ "$ec" -ne 0 ]]; then
    fail_pin "python failed reading gradle.properties pins (exit ${ec})"
  fi
  jver="${jv[0]}"
  jcommit="${jv[1]}"
  if [[ "$jver" != "$spec_version" ]]; then
    fail_pin "gradle.properties intentproofSpecVersion=${jver} but spec.json version=${spec_version}"
  fi
  if [[ "$jcommit" != "$head_sha" ]]; then
    fail_pin "declared intentproofSpecCommit=${jcommit} but spec checkout HEAD=${head_sha}"
  fi
  if [[ ! "$jcommit" =~ ^[a-f0-9]{40}$ ]]; then
    fail_pin "intentproofSpecCommit must be a 40-character lowercase hex SHA"
  fi
else
  echo "check-sdk-spec-pins: could not detect SDK type under ${sdk_root}" >&2
  exit 2
fi

echo "SDK spec pins OK (version=${spec_version} commit=${head_sha})"
