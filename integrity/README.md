# Spec integrity manifest

The integrity manifest hashes inventoried files under `schema/`, `golden/`,
and `compatibility/` (`.json`, `.jsonl`, `.yaml`, `.yml`, and `.bin`).
Each release ships:

| Artifact | Trust root |
|----------|------------|
| `manifest.v1.json` | Content inventory (SHA-256 per file) |
| `manifest.v1.json.sig` | Ed25519 signature (`well-known-keys/spec-integrity.pem`) |
| `manifest.v1.json.cosign.sig` | Cosign keyless detached signature (Sigstore / Rekor) |
| `manifest.v1.json.cosign.sigstore.json` | Cosign Sigstore bundle (includes Rekor inclusion proof) |

Both signature paths must verify independently. A verifier should reject a
manifest when either path fails or when the file hashes do not match the
manifest body.

## Generate (maintainers)

Local generation requires `secrets/spec-integrity-private.pem` (gitignored).
CI release uses the `SPEC_INTEGRITY_PRIVATE_KEY` repository secret instead.

```bash
npm ci
npx ts-node integrity/generate_manifest.ts
```

Regenerate only on a release tag or when schema/golden/compatibility files
change. The release workflow runs generation automatically.

## Verify path 1 — Ed25519 spec signing key

```bash
npm ci
npx ts-node integrity/verify_manifest.ts
```

This checks:

1. `manifest.v1.json.sig` verifies against `well-known-keys/spec-integrity.pem`
2. Every inventoried file hash matches `manifest.v1.json`
3. The manifest does not reference missing files

## Verify path 2 — Cosign + Rekor (release workflow identity)

Install [Cosign](https://docs.sigstore.dev/cosign/system_config/installation/) v2+.

```bash
cosign verify-blob \
  --certificate-identity-regexp 'https://github.com/IntentProof/intentproof-spec/' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  --bundle integrity/manifest.v1.json.cosign.sigstore.json \
  --signature integrity/manifest.v1.json.cosign.sig \
  integrity/manifest.v1.json
```

A successful verification proves the manifest bytes were signed by the
`release-spec.yml` workflow in `IntentProof/intentproof-spec` and recorded in
the public Rekor log.

## Tamper detection

| Tamper | Ed25519 path | Cosign path |
|--------|--------------|-------------|
| Edit `manifest.v1.json` body | Fails signature or hash checks | Fails `verify-blob` |
| Replace `manifest.v1.json.sig` | Fails | Unaffected (Cosign still binds manifest bytes) |
| Replace Cosign bundle/sig | Unaffected (Ed25519 still binds manifest bytes) | Fails `verify-blob` |
| Edit an inventoried schema/golden file | Fails hash check in `verify_manifest.ts` | Passes Cosign (manifest bytes unchanged) — run path 1 |

Always run **both** paths before trusting a downloaded spec release bundle.

## Release workflow

Tag pushes matching `v*.*.*` run `.github/workflows/release-spec.yml`:

1. Conformance tests
2. Regenerate and Ed25519-sign the manifest
3. Cosign-sign the manifest (Rekor-backed on tag releases)
4. Upload manifest artifacts and a spec tarball to the GitHub Release

Dry-run without Rekor: dispatch `release-spec.yml` manually with
`attest_to_rekor=false`.
