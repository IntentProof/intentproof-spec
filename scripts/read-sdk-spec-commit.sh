#!/usr/bin/env bash
# Compatibility shim: forwards to scripts/read-consumer-spec-commit.sh (canonical).
set -euo pipefail
_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${_script_dir}/read-consumer-spec-commit.sh" "$@"
