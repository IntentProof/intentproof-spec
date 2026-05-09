#!/usr/bin/env bash
# Audits consumer repositories (SDK language packs, API service, etc.) for spec drift hardening controls.
# Usage:
#   bash scripts/check-consumer-hardening.sh /path/to/intentproof-sdk-node
#   bash scripts/check-consumer-hardening.sh /path/to/intentproof-api
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: check-consumer-hardening.sh /absolute/path/to/consumer-repo" >&2
  exit 2
fi

consumer_root="$(cd "$1" && pwd)"
spec_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail=0
note() { echo "[hardening] $*"; }
err() {
  echo "[hardening][FAIL] $*" >&2
  fail=1
}

require_file() {
  local p="$1"
  if [[ ! -f "${consumer_root}/${p}" ]]; then
    err "missing file: ${p}"
  fi
}

require_pin_wrapper() {
  if [[ -f "${consumer_root}/scripts/check-consumer-spec-pin.sh" ]]; then
    require_file "scripts/check-consumer-spec-pin.sh"
  elif [[ -f "${consumer_root}/scripts/check-spec-pin.sh" ]]; then
    require_file "scripts/check-spec-pin.sh"
  elif [[ -f "${consumer_root}/scripts/check-sdk-spec-pin.sh" ]]; then
    require_file "scripts/check-sdk-spec-pin.sh"
  else
    err "missing scripts/check-consumer-spec-pin.sh, check-spec-pin.sh, or check-sdk-spec-pin.sh (thin wrapper to intentproof-spec pin checker)"
  fi
}

require_match() {
  local p="$1"
  local regex="$2"
  local why="$3"
  if ! python3 - "$consumer_root/$p" "$regex" <<'PY'
import re,sys
path, pattern = sys.argv[1], sys.argv[2]
with open(path, "r", encoding="utf-8") as f:
    data = f.read()
sys.exit(0 if re.search(pattern, data, re.MULTILINE) else 1)
PY
  then
    err "${p}: ${why}"
  fi
}

note "auditing ${consumer_root}"
require_file "scripts/check-no-bundled-schema.sh"
require_pin_wrapper
require_file "scripts/check-no-handwritten-model-types.sh"
require_match "scripts/check-no-handwritten-model-types.sh" 'check-(consumer|sdk)-no-handwritten-model-types\.sh' "must delegate to spec shared no-handwritten checker"

pin_validate() {
  if ! bash "${spec_root}/scripts/check-consumer-spec-pins.sh" "${consumer_root}" "${spec_root}"; then
    err "spec pin validation failed (run: bash ${spec_root}/scripts/check-consumer-spec-pins.sh ${consumer_root} ${spec_root})"
  fi
}

if [[ -f "${consumer_root}/packages/sdk/package.json" ]]; then
  note "detected Node workspace layout"
  require_file "scripts/verify-generated-types.sh"
  require_file "packages/sdk/package.json"
  require_match "package.json" '"intentproofSpecCommit"\s*:\s*"[a-f0-9]{40}"' "root package.json must declare intentproofSpecCommit (40-char hex SHA)"
  require_match "packages/sdk/package.json" '"intentproofSpecCommit"\s*:\s*"[a-f0-9]{40}"' "packages/sdk/package.json must declare intentproofSpecCommit (40-char hex SHA)"
  node_gen_ver="$(IP_NODE_PKG_JSON="${consumer_root}/packages/sdk/package.json" node -e "const p=require(process.env.IP_NODE_PKG_JSON); process.stdout.write((p.devDependencies||{})['json-schema-to-typescript']||'');")"
  if [[ ! "${node_gen_ver}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    err "packages/sdk/package.json: json-schema-to-typescript must be exact-pinned (found '${node_gen_ver:-<missing>}')"
  fi
  require_match "packages/sdk/package.json" 'verify-generated-types\.sh' "verify:types script must run drift check"
elif [[ -f "${consumer_root}/pyproject.toml" ]]; then
  note "detected Python pyproject layout"
  require_file "scripts/verify-generated-types.sh"
  require_match "pyproject.toml" 'spec-commit\s*=\s*"[a-f0-9]{40}"' "pyproject.toml [tool.intentproof] must declare spec-commit (40-char hex SHA)"
  require_match "pyproject.toml" 'datamodel-code-generator==[0-9]+\.[0-9]+\.[0-9]+' "datamodel-code-generator must be exact-pinned"
  require_match "tox.ini" 'verify-generated-types\.sh' "tox static must run generated drift check"
  require_match "tox.ini" 'check-no-handwritten-model-types\.sh' "tox static must run delegated no-handwritten checker"
elif [[ -f "${consumer_root}/build.gradle.kts" ]]; then
  note "detected Gradle Kotlin DSL layout"
  require_file "scripts/verify-generated-pojos.sh"
  require_match "gradle.properties" '^intentproofSpecVersion=' "gradle.properties must declare intentproofSpecVersion"
  require_match "gradle.properties" 'intentproofSpecCommit=[a-f0-9]{40}' "gradle.properties must declare intentproofSpecCommit (40-char hex SHA)"
  require_match "gradle/libs.versions.toml" '^jsonschema2pojo\s*=\s*"[0-9]+\.[0-9]+\.[0-9]+"' "jsonschema2pojo must be exact-pinned"
  require_match ".github/workflows/ci.yml" 'verify-generated-pojos\.sh' "CI must run verify-generated-pojos.sh"
else
  err "could not detect consumer repository layout (expected Node workspace, pyproject.toml, or Gradle Kotlin DSL)"
fi

if [[ -f "${consumer_root}/packages/sdk/package.json" ]] || [[ -f "${consumer_root}/pyproject.toml" ]] || [[ -f "${consumer_root}/build.gradle.kts" ]]; then
  pin_validate
fi

if [[ "${fail}" -ne 0 ]]; then
  echo "[hardening] FAILED" >&2
  exit 1
fi

note "OK"
note "tip: run this check in consumer CI with INTENTPROOF_SPEC_ROOT=${spec_root}"
