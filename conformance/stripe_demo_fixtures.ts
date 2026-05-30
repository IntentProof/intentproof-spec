import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export const STRIPE_DEMO_HMAC_SECRET = 'whsec_intentproof_demo_golden_v1';

export type StripeDemoFixture = {
  name: string;
  body: Buffer;
  headers: Record<string, string>;
  bodySHA256: string;
};

export function loadStripeDemoFixtures(stripeDemoDir: string): StripeDemoFixture[] {
  const names = ['refund-created'];
  const fixtures: StripeDemoFixture[] = [];
  for (const name of names) {
    const bodyPath = path.join(stripeDemoDir, `${name}.bytes`);
    const headersPath = path.join(stripeDemoDir, `${name}.headers.json`);
    const shaPath = path.join(stripeDemoDir, `${name}.sha256.txt`);
    const body = fs.readFileSync(bodyPath);
    const headers = JSON.parse(fs.readFileSync(headersPath, 'utf-8')) as Record<string, string>;
    const bodySHA256 = fs.readFileSync(shaPath, 'utf-8').trim();
    fixtures.push({ name, body, headers, bodySHA256 });
  }
  return fixtures;
}

export function verifyStripeDemoSignature(
  secret: string,
  headers: Record<string, string>,
  body: Buffer,
  verifyAtUnix: number,
): boolean {
  const sigHeader = headers['stripe-signature'];
  if (!sigHeader) {
    return false;
  }
  let timestamp = 0;
  const signatures: string[] = [];
  for (const part of sigHeader.split(',')) {
    const [key, value] = part.trim().split('=');
    if (key === 't') {
      timestamp = Number.parseInt(value, 10);
    } else if (key === 'v1') {
      signatures.push(value);
    }
  }
  if (!timestamp || signatures.length === 0) {
    return false;
  }
  const delta = verifyAtUnix - timestamp;
  if (delta < -300 || delta > 300) {
    return false;
  }
  const signedPayload = `${timestamp}.${body.toString('utf-8')}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return signatures.some((got) => {
    if (got.length !== expected.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  });
}

export function runStripeDemoFixtureTests(stripeDemoDir: string): { ok: boolean; messages: string[] } {
  const messages: string[] = [];
  let hasError = false;
  const fixtures = loadStripeDemoFixtures(stripeDemoDir);

  for (const fixture of fixtures) {
    const gotSHA = crypto.createHash('sha256').update(fixture.body).digest('hex');
    if (gotSHA !== fixture.bodySHA256) {
      messages.push(`[FAIL] ${fixture.name}.bytes sha256 mismatch`);
      hasError = true;
      continue;
    }
    messages.push(`[PASS] ${fixture.name}.bytes sha256 matches fingerprint`);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(fixture.body.toString('utf-8')) as Record<string, unknown>;
    } catch {
      messages.push(`[FAIL] ${fixture.name}.bytes is not valid JSON`);
      hasError = true;
      continue;
    }
    if (typeof parsed.id !== 'string' || typeof parsed.type !== 'string') {
      messages.push(`[FAIL] ${fixture.name}.bytes missing stripe event id/type`);
      hasError = true;
      continue;
    }

    const tsHeader = fixture.headers['stripe-signature'] ?? '';
    const tsMatch = /(?:^|,)t=(\d+)/.exec(tsHeader);
    const verifyAt = tsMatch ? Number.parseInt(tsMatch[1], 10) : 0;
    if (!verifyStripeDemoSignature(STRIPE_DEMO_HMAC_SECRET, fixture.headers, fixture.body, verifyAt)) {
      messages.push(`[FAIL] ${fixture.name} stripe-signature verification failed`);
      hasError = true;
      continue;
    }
    messages.push(`[PASS] ${fixture.name} stripe-signature verified with demo HMAC`);
  }

  if (!hasError) {
    messages.push('All stripe@demo golden fixture checks passed.');
  }
  return { ok: !hasError, messages };
}

export function runStripeDemoFixturesCli(): number {
  const stripeDemoDir = path.join(__dirname, '..', 'golden', 'demo', 'stripe');
  const result = runStripeDemoFixtureTests(stripeDemoDir);
  for (const msg of result.messages) {
    console.log(msg);
  }
  return result.ok ? 0 : 1;
}

if (require.main === module) {
  process.exit(runStripeDemoFixturesCli());
}
