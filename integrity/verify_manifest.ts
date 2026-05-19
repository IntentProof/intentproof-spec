import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { listManifestFiles } from './manifest_files';

export type VerifyManifestResult = {
  ok: boolean;
  messages: string[];
};

export function verifyManifest(projectRoot: string): VerifyManifestResult {
  const messages: string[] = [];
  let hasError = false;
  const fail = (msg: string): void => {
    messages.push(`[FAIL] ${msg}`);
    hasError = true;
  };

  const manifestPath = path.join(projectRoot, 'integrity', 'manifest.v1.json');
  const sigPath = path.join(projectRoot, 'integrity', 'manifest.v1.json.sig');
  const pubKeyPath = path.join(projectRoot, 'well-known-keys', 'spec-integrity.pem');

  if (!fs.existsSync(manifestPath)) {
    fail(`Manifest file not found: ${manifestPath}`);
    return { ok: false, messages };
  }
  if (!fs.existsSync(sigPath)) {
    fail(`Signature file not found: ${sigPath}`);
    return { ok: false, messages };
  }
  if (!fs.existsSync(pubKeyPath)) {
    fail(`Public key file not found: ${pubKeyPath}`);
    return { ok: false, messages };
  }

  const manifestContent = fs.readFileSync(manifestPath);
  const sig = fs.readFileSync(sigPath);
  const pubKeyPem = fs.readFileSync(pubKeyPath, 'utf-8');
  const pubKey = crypto.createPublicKey(pubKeyPem);

  const isVerified = crypto.verify(null, manifestContent, pubKey, sig);
  if (!isVerified) {
    fail('Manifest signature verification failed');
    return { ok: false, messages };
  }
  messages.push('[PASS] Manifest signature verified');

  const manifest = JSON.parse(manifestContent.toString('utf-8')) as {
    files?: Record<string, string>;
  };
  if (!manifest.files || typeof manifest.files !== 'object') {
    fail('Manifest missing files object');
    return { ok: false, messages };
  }

  for (const filePath of listManifestFiles(projectRoot)) {
    const content = fs.readFileSync(filePath);
    const expectedHash = `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
    const relativeKey = path.relative(projectRoot, filePath).split(path.sep).join('/');
    const manifestHash = manifest.files[relativeKey];

    if (!manifestHash) {
      fail(`File ${relativeKey} not found in manifest`);
      continue;
    }

    if (manifestHash !== expectedHash) {
      fail(`File ${relativeKey} hash mismatch: manifest=${manifestHash}, actual=${expectedHash}`);
    } else {
      messages.push(`[PASS] File ${relativeKey} hash verified`);
    }
  }

  for (const f of Object.keys(manifest.files)) {
    const fullPath = path.join(projectRoot, f);
    if (!fs.existsSync(fullPath)) {
      fail(`Manifest references missing file: ${f}`);
    }
  }

  if (hasError) {
    messages.push('[FAIL] Integrity verification completed with errors');
    return { ok: false, messages };
  }

  messages.push('[PASS] All integrity checks passed');
  return { ok: true, messages };
}

export function runVerifyManifestCli(): number {
  const projectRoot = path.join(__dirname, '..');
  const result = verifyManifest(projectRoot);
  for (const msg of result.messages) {
    console.log(msg);
  }
  return result.ok ? 0 : 1;
}

/* v8 ignore start */
if (require.main === module) {
  process.exit(runVerifyManifestCli());
}
/* v8 ignore stop */
