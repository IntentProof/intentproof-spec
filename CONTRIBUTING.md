# Contributing to intentproof-spec

Thank you for helping improve IntentProof.

## How to help

We welcome [GitHub Issues](https://github.com/IntentProof/intentproof-spec/issues)
and pull requests — schema clarifications, golden fixtures, conformance fixes,
and documentation.

- **Small fixes:** open a PR with a short summary and test plan.
- **Schema or golden changes:** open an issue or PR that explains downstream
  impact on tools and SDKs; coordinated bumps may be needed.

## Pull requests

- Run `npx ts-node conformance/runner.ts` and the `make compatibility-*-verify`
  targets when you touch schemas, fixtures, or compatibility files.
- Regenerate the signed integrity manifest when inventoried files change — see
  [`integrity/README.md`](integrity/README.md).

## License

By contributing, you agree your contributions are licensed under the MIT
License (see `LICENSE`).
