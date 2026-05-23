# Contributing to intentproof-spec

Thanks for your interest in IntentProof.

## Issues welcome

Please report bugs, schema ambiguities, and conformance gaps via
[GitHub Issues](https://github.com/IntentProof/intentproof-spec/issues).
That is the primary way to help right now.

We do **not** accept unsolicited pull requests from outside the
maintainer team. If you are a customer or partner with a change that
must land upstream, contact IntentProof, Inc. before opening a PR.

Maintainer commits use the Developer Certificate of Origin (DCO) below.

## Developer Certificate of Origin (DCO)

Merged commits in this repository use the
[Developer Certificate of Origin 1.1](https://developercertificate.org/).

Every commit must carry a `Signed-off-by:` trailer matching the
author email. The easiest way to do this is to pass `-s` to `git
commit`:

```bash
git commit -s -m "..."
```

You can also retroactively sign off the last commit with:

```bash
git commit --amend --no-edit -s
```

Then force-push the amended branch:

```bash
git push --force-with-lease
```

Commits that do not include a valid `Signed-off-by` trailer will
be rejected by CI.

## Trademark

"IntentProof" and "Verified by IntentProof" are trademarks of
IntentProof, Inc. Apache 2.0 grants a copyright license; it does not grant a
trademark license. See [`TRADEMARK.md`](TRADEMARK.md).

## License

By contributing as a maintainer, you agree your commits are licensed
under the Apache License 2.0 (see `LICENSE`).
