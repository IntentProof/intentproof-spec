#!/usr/bin/env bash
# CI-parity coverage gate for local checkpoints and manual runs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
exec npm run test:coverage:check
