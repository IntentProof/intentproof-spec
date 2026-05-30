# Tiered coverage policy (intentproof-spec)

| Tier | Minimum | Scope |
|------|---------|--------|
| **Total** | 90% | All vitest-measured statements |
| **Critical** | 95% | `conformance/`, `integrity/`, `semantics/` |

Reference policy and golden validators outside those trees count toward total
only.

Configuration: `scripts/coverage-tiers.conf`.
