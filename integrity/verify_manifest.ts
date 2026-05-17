import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

function main() {
  const manifestPath = path.join(__dirname, 'manifest.v1.json');
  const sigPath = path.join(__dirname, 'manifest.v1.json.sig');
  const pubKeyPath = path.join(__dirname, '../well-known-keys/spec-integrity.pem');
  const projectRoot = path.join(__dirname, '..');
  const manifestDirs = [
    path.join(projectRoot, 'schema'),
    path.join(projectRoot, 'golden'),
    path.join(projectRoot, 'compatibility'),
  ];

  if (!fs.existsSync(manifestPath)) {
    console.error('[FAIL] Manifest file not found:', manifestPath);
    process.exit(1);
  }
  if (!fs.existsSync(sigPath)) {
    console.error('[FAIL] Signature file not found:', sigPath);
    process.exit(1);
  }
  if (!fs.existsSync(pubKeyPath)) {
    console.error('[FAIL] Public key file not found:', pubKeyPath);
    process.exit(1);
  }

  const manifestContent = fs.readFileSync(manifestPath);
  const sig = fs.readFileSync(sigPath);
  const pubKeyPem = fs.readFileSync(pubKeyPath, 'utf-8');

  const pubKey = crypto.createPublicKey(pubKeyPem);

  // Verify manifest signature.
  const isVerified = crypto.verify(null, manifestContent, pubKey, sig);
  if (!isVerified) {
    console.error('[FAIL] Manifest signature verification failed');
    process.exit(1);
  }
  console.log('[PASS] Manifest signature verified');

  // Verify file hashes.
  const manifest = JSON.parse(manifestContent.toString('utf-8'));
  if (!manifest.files || typeof manifest.files !== 'object') {
    console.error('[FAIL] Manifest missing files object');
    process.exit(1);
  }

  let hasError = false;
  for (const dir of manifestDirs) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') || f.endsWith('.jsonl'));
    for (const f of files) {
      const filePath = path.join(dir, f);
      const content = fs.readFileSync(filePath);
      const expectedHash = `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
      const relativeKey = path.relative(projectRoot, filePath).split(path.sep).join('/');
      const manifestHash = manifest.files[relativeKey];

      if (!manifestHash) {
        console.error(`[FAIL] File ${relativeKey} not found in manifest`);
        hasError = true;
        continue;
      }

      if (manifestHash !== expectedHash) {
        console.error(`[FAIL] File ${relativeKey} hash mismatch: manifest=${manifestHash}, actual=${expectedHash}`);
        hasError = true;
      } else {
        console.log(`[PASS] File ${relativeKey} hash verified`);
      }
    }
  }

  // Check for extra files in manifest not on disk.
  for (const f of Object.keys(manifest.files)) {
    const fullPath = path.join(projectRoot, f);
    if (!fs.existsSync(fullPath)) {
      console.error(`[FAIL] Manifest references missing file: ${f}`);
      hasError = true;
    }
  }

  if (hasError) {
    console.error('[FAIL] Integrity verification completed with errors');
    process.exit(1);
  }

  console.log('[PASS] All integrity checks passed');
}

main();
