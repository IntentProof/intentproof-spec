#!/usr/bin/env bash
# Validate .github/codeql-allowlist.yml expiry dates.
exec "$(dirname "$0")/check-allowlist-expiry.sh" "${1:-.github/codeql-allowlist.yml}" rule_id
