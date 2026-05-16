import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { canonicalize } from 'json-canonicalize';

const casesPath = path.join(__dirname, '..', 'golden', 'webhook-finding_cases.jsonl');
const publicKeyPath = path.join(__dirname, '..', 'well-known-keys', 'webhook-signer-2026q2.pem');

const publicKey = crypto.createPublicKey(fs.readFileSync(publicKeyPath, 'utf-8'));
const lines = fs.readFileSync(casesPath, 'utf-8').split('\n').filter(Boolean);

let hasError = false;
for (let i = 0; i < lines.length; i++) {
  const fixture = JSON.parse(lines[i]) as Record<string, any>;
  if (!fixture.shouldValidate) {
    continue;
  }

  const envelope = fixture.webhook_finding;
  const signature = envelope?.signature;
  if (signature?.alg !== 'ed25519' || signature?.key_id !== 'platform@webhook-signer-2026q2') {
    console.error(`[FAIL] webhook-finding_cases.jsonl:${i + 1} missing webhook-signer signature metadata`);
    hasError = true;
    continue;
  }

  const signedPayload = JSON.parse(JSON.stringify(envelope));
  delete signedPayload.signature;
  const ok = crypto.verify(
    null,
    Buffer.from(canonicalize(signedPayload)),
    publicKey,
    Buffer.from(signature.value, 'base64'),
  );

  if (!ok) {
    console.error(`[FAIL] webhook-finding_cases.jsonl:${i + 1} signature verification failed`);
    hasError = true;
  } else {
    console.log(`[PASS] webhook-finding_cases.jsonl:${i + 1} signature verified`);
  }
}

if (hasError) {
  process.exit(1);
}

console.log('All webhook finding signature checks passed.');
