#!/usr/bin/env bash
# Compatibility shim: forwards to scripts/check-consumer-no-handwritten-model-types.sh (canonical).
set -euo pipefail
_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${_script_dir}/check-consumer-no-handwritten-model-types.sh" "$@"
