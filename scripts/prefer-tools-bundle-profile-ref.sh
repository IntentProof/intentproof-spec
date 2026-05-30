#!/usr/bin/env bash
# Prefer intentproof-tools bundle profile branch when gate not on main.
set -euo pipefail

TOOLS_DIR="${1:-intentproof-tools}"
BRANCH="${2:-phase4-bundle-verification-profile}"

if [[ -f "$TOOLS_DIR/scripts/check-bundle-verification-profile.sh" ]]; then
  exit 0
fi

git -C "$TOOLS_DIR" fetch origin "$BRANCH" 2>/dev/null || exit 0
git -C "$TOOLS_DIR" checkout FETCH_HEAD
