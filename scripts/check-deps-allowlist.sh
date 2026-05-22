#!/usr/bin/env bash
# Validate .github/deps-allowlist.yml expiry dates.
exec "$(dirname "$0")/check-allowlist-expiry.sh" "${1:-.github/deps-allowlist.yml}" rule_id cve_id id
