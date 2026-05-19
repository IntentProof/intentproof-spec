import { canonicalize } from 'json-canonicalize';
import { vectors } from './jcs_vectors';
import * as crypto from 'crypto';
import { computePolicyFingerprint } from './policy_fingerprint';

export function runJcsConformanceTests(
  customVectors: typeof vectors = vectors,
  hooks: {
    canonicalizeImpl?: typeof canonicalize;
    fingerprintImpl?: typeof computePolicyFingerprint;
    hashHex?: string;
  } = {},
): { ok: boolean; messages: string[] } {
  const canonicalizeImpl = hooks.canonicalizeImpl ?? canonicalize;
  const fingerprintImpl = hooks.fingerprintImpl ?? computePolicyFingerprint;
  const messages: string[] = [];
  let hasError = false;

  for (let i = 0; i < customVectors.length; i++) {
    const v = customVectors[i];
    const got = canonicalizeImpl(v.input);
    if (got !== v.expected) {
      messages.push(
        `[FAIL] JCS vector ${i + 1}: expected ${JSON.stringify(v.expected)}, got ${JSON.stringify(got)}`,
      );
      hasError = true;
    } else {
      messages.push(`[PASS] JCS vector ${i + 1}`);
    }
  }

  const policyStub = {
    schema: 'intentproof.policy.v1',
    policy_id: 'tnt.test',
    policy_version: 1,
    tenant_id: 'tnt',
    spec_version: '1.0.0',
    scope: { any_event_action_in: ['a'] },
    rules: [{ id: 'r1', category: 'required', severity: 'high', spec: { action: 'a' } }],
    policy_fingerprint: 'sha256:should-be-excluded',
    signed_at: '2026-01-01T00:00:00Z',
    signature: { alg: 'ed25519', key_id: 'k1', value: 'base64' },
  };

  const policyForFingerprint = { ...policyStub };
  delete (policyForFingerprint as Record<string, unknown>).policy_fingerprint;
  delete (policyForFingerprint as Record<string, unknown>).signed_at;
  delete (policyForFingerprint as Record<string, unknown>).signature;

  const canonical = canonicalizeImpl(policyForFingerprint);
  const parsed = JSON.parse(canonical) as Record<string, unknown>;
  if (parsed.policy_fingerprint || parsed.signed_at || parsed.signature) {
    messages.push('[FAIL] JCS canonicalization did not exclude fingerprint fields');
    hasError = true;
  } else {
    messages.push('[PASS] JCS excludes fingerprint fields from canonical form');
  }

  const hash = hooks.hashHex ?? crypto.createHash('sha256').update(canonical).digest('hex');
  const expectedHash = '7ffa54b2f15b9ab936a94eb3926a79bde8f66b0a81d0fee69b6c9d2c6a2fb07b';
  if (hash !== expectedHash) {
    messages.push(`[FAIL] Policy fingerprint mismatch: expected ${expectedHash}, got ${hash}`);
    hasError = true;
  } else {
    messages.push('[PASS] Policy fingerprint matches expected SHA-256');
  }

  const fingerprint = fingerprintImpl(policyStub as Record<string, unknown>);
  if (!fingerprint.startsWith('sha256:')) {
    messages.push('[FAIL] computePolicyFingerprint did not return sha256 prefix');
    hasError = true;
  }

  if (!hasError) {
    messages.push('All JCS conformance checks passed.');
  }
  return { ok: !hasError, messages };
}

export function runJcsConformanceCli(): number {
  const result = runJcsConformanceTests();
  for (const msg of result.messages) {
    console.log(msg);
  }
  return result.ok ? 0 : 1;
}

/* v8 ignore start */
if (require.main === module) {
  process.exit(runJcsConformanceCli());
}
/* v8 ignore stop */
