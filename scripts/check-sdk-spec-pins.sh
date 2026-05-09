#!/usr/bin/env bash
# Compatibility shim: forwards to scripts/check-consumer-spec-pins.sh (canonical).
set -euo pipefail
_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${_script_dir}/check-consumer-spec-pins.sh" "$@"
