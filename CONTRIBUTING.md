# Contributing to intentproof-spec

Thanks for your interest in contributing to the IntentProof specification.

## Developer Certificate of Origin (DCO)

This repository accepts contributions under the
[Developer Certificate of Origin 1.1](https://developercertificate.org/).
We deliberately use DCO instead of a Contributor License Agreement
for the Apache repositories so the contribution path stays
frictionless.

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
