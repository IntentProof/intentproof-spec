import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { canonicalize } from 'json-canonicalize';

export function verifyWebhookFindingEnvelope(
  envelope: Record<string, unknown>,
  publicKey: crypto.KeyObject,
): boolean {
  const signature = envelope.signature as Record<string, unknown> | undefined;
  if (signature?.alg !== 'ed25519' || signature?.key_id !== 'platform@webhook-signer-2026q2') {
    return false;
  }
  const signedPayload = JSON.parse(JSON.stringify(envelope)) as Record<string, unknown>;
  delete signedPayload.signature;
  return crypto.verify(
    null,
    Buffer.from(canonicalize(signedPayload)),
    publicKey,
    Buffer.from(String(signature.value), 'base64'),
  );
}

export function runWebhookFindingTests(
  casesPath: string,
  publicKeyPath: string,
): { ok: boolean; messages: string[] } {
  const messages: string[] = [];
  let hasError = false;
  const publicKey = crypto.createPublicKey(fs.readFileSync(publicKeyPath, 'utf-8'));
  const lines = fs.readFileSync(casesPath, 'utf-8').split('\n').filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const fixture = JSON.parse(lines[i]) as Record<string, unknown>;
    if (!fixture.shouldValidate) {
      continue;
    }
    const envelope = fixture.webhook_finding as Record<string, unknown>;
    if (!verifyWebhookFindingEnvelope(envelope, publicKey)) {
      messages.push(`[FAIL] ${path.basename(casesPath)}:${i + 1} signature verification failed`);
      hasError = true;
    } else {
      messages.push(`[PASS] ${path.basename(casesPath)}:${i + 1} signature verified`);
    }
  }

  if (!hasError) {
    messages.push('All webhook finding signature checks passed.');
  }
  return { ok: !hasError, messages };
}

export function runWebhookFindingsCli(): number {
  const casesPath = path.join(__dirname, '..', 'golden', 'webhook-finding_cases.jsonl');
  const publicKeyPath = path.join(__dirname, '..', 'well-known-keys', 'webhook-signer-2026q2.pem');
  const result = runWebhookFindingTests(casesPath, publicKeyPath);
  for (const msg of result.messages) {
    console.log(msg);
  }
  return result.ok ? 0 : 1;
}

/* v8 ignore start */
if (require.main === module) {
  process.exit(runWebhookFindingsCli());
}
/* v8 ignore stop */
