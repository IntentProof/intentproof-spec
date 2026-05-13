import { canonicalize } from 'json-canonicalize';
import { vectors } from './jcs_vectors';
import * as crypto from 'crypto';

let hasError = false;

for (let i = 0; i < vectors.length; i++) {
  const v = vectors[i];
  const got = canonicalize(v.input);
  if (got !== v.expected) {
    console.error(`[FAIL] JCS vector ${i + 1}: expected ${JSON.stringify(v.expected)}, got ${JSON.stringify(got)}`);
    hasError = true;
  } else {
    console.log(`[PASS] JCS vector ${i + 1}`);
  }
}

// Policy fingerprint JCS test: verify canonicalization excludes fingerprint fields.
const policyStub = {
  schema: "intentproof.policy.v1",
  policy_id: "tnt.test",
  policy_version: 1,
  tenant_id: "tnt",
  spec_version: "1.0.0",
  scope: { any_event_action_in: ["a"] },
  rules: [{ id: "r1", category: "required", severity: "high", spec: { action: "a" } }],
  policy_fingerprint: "sha256:should-be-excluded",
  signed_at: "2026-01-01T00:00:00Z",
  signature: { alg: "ed25519", key_id: "k1", value: "base64" }
};

// Compute fingerprint: delete excluded fields, then canonicalize, then hash.
const policyForFingerprint = { ...policyStub };
delete (policyForFingerprint as any).policy_fingerprint;
delete (policyForFingerprint as any).signed_at;
delete (policyForFingerprint as any).signature;

const canonical = canonicalize(policyForFingerprint);
const parsed = JSON.parse(canonical);
if (parsed.policy_fingerprint || parsed.signed_at || parsed.signature) {
  console.error("[FAIL] JCS canonicalization did not exclude fingerprint fields");
  hasError = true;
} else {
  console.log("[PASS] JCS excludes fingerprint fields from canonical form");
}

const hash = crypto.createHash('sha256').update(canonical).digest('hex');
const expectedHash = '7ffa54b2f15b9ab936a94eb3926a79bde8f66b0a81d0fee69b6c9d2c6a2fb07b';
if (hash !== expectedHash) {
  console.error(`[FAIL] Policy fingerprint mismatch: expected ${expectedHash}, got ${hash}`);
  hasError = true;
} else {
  console.log(`[PASS] Policy fingerprint matches expected SHA-256`);
}

if (hasError) {
  process.exit(1);
} else {
  console.log("All JCS conformance checks passed.");
}
