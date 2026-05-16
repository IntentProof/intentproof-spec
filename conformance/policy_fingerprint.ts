import * as crypto from 'crypto';
import { canonicalize } from 'json-canonicalize';

export function computePolicyFingerprint(policy: Record<string, unknown>): string {
  const copy = JSON.parse(JSON.stringify(policy)) as Record<string, unknown>;
  delete copy.policy_fingerprint;
  delete copy.signed_at;
  delete copy.signature;
  return 'sha256:' + crypto.createHash('sha256').update(canonicalize(copy)).digest('hex');
}
