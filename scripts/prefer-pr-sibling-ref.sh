#!/usr/bin/env bash
# Prefer a same-named branch in a sibling checkout during PR ecosystem pin checks.
set -euo pipefail

repo_dir="${1:?repo directory required}"
branch="${2:-}"

if [[ -z "$branch" ]]; then
  exit 0
fi

git -C "$repo_dir" fetch origin "$branch" 2>/dev/null || exit 0
git -C "$repo_dir" checkout FETCH_HEAD
