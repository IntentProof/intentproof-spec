import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { listManifestFiles } from './manifest_files';

export const COSIGN_SIG_SUFFIX = '.cosign.sig';
export const COSIGN_BUNDLE_SUFFIX = '.cosign.sigstore.json';

export type GenerateManifestOptions = {
  projectRoot: string;
  publicKeyPath: string;
  privateKeyPath: string;
  manifestPath: string;
  sigPath: string;
  generateIfMissing?: boolean;
};

export type GenerateManifestResult = {
  ok: boolean;
  messages: string[];
  verified?: boolean;
};

export function generateManifest(options: GenerateManifestOptions): GenerateManifestResult {
  const messages: string[] = [];
  const {
    projectRoot,
    publicKeyPath,
    privateKeyPath,
    manifestPath,
    sigPath,
    generateIfMissing = true,
  } = options;

  let privateKey: crypto.KeyObject;
  let publicKey: crypto.KeyObject;

  if (fs.existsSync(privateKeyPath)) {
    const privKeyPem = fs.readFileSync(privateKeyPath, 'utf-8');
    privateKey = crypto.createPrivateKey(privKeyPem);
    publicKey = crypto.createPublicKey(privateKey);
    if (!fs.existsSync(publicKeyPath)) {
      fs.mkdirSync(path.dirname(publicKeyPath), { recursive: true });
      fs.writeFileSync(publicKeyPath, publicKey.export({ type: 'spki', format: 'pem' }));
    }
  } else if (fs.existsSync(publicKeyPath)) {
    messages.push('Public key exists but private key is missing.');
    return { ok: false, messages };
  } else if (!generateIfMissing) {
    messages.push('Neither public nor private key exists.');
    return { ok: false, messages };
  } else {
    const kp = crypto.generateKeyPairSync('ed25519');
    privateKey = kp.privateKey;
    publicKey = kp.publicKey;
    fs.mkdirSync(path.dirname(privateKeyPath), { recursive: true });
    fs.writeFileSync(privateKeyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }), {
      mode: 0o600,
    });
    fs.mkdirSync(path.dirname(publicKeyPath), { recursive: true });
    fs.writeFileSync(publicKeyPath, publicKey.export({ type: 'spki', format: 'pem' }));
  }

  const manifest: { files: Record<string, string> } = { files: {} };
  for (const filePath of listManifestFiles(projectRoot)) {
    const content = fs.readFileSync(filePath);
    const relativeKey = path.relative(projectRoot, filePath).split(path.sep).join('/');
    manifest.files[relativeKey] = `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
  }

  const manifestContent = Buffer.from(JSON.stringify(manifest, null, 2));
  const sig = crypto.sign(null, manifestContent, privateKey);

  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, manifestContent);
  fs.writeFileSync(sigPath, sig);

  messages.push('Manifest created and signed.');
  const verified = crypto.verify(null, manifestContent, publicKey, sig);
  messages.push(`Verified: ${verified}`);
  return { ok: true, messages, verified };
}

function resolvePrivateKeyPath(projectRoot: string): { path: string; isTemp: boolean } {
  const envKey = process.env.SPEC_INTEGRITY_PRIVATE_KEY?.trim();
  if (envKey) {
    const keyPath = path.join(os.tmpdir(), `spec-integrity-private-${process.pid}.pem`);
    fs.writeFileSync(keyPath, `${envKey}\n`, { mode: 0o600 });
    return { path: keyPath, isTemp: true };
  }
  return {
    path: path.join(projectRoot, 'secrets', 'spec-integrity-private.pem'),
    isTemp: false,
  };
}

export function runGenerateManifestCli(): GenerateManifestResult {
  const projectRoot = path.join(__dirname, '..');
  const { path: privateKeyPath, isTemp } = resolvePrivateKeyPath(projectRoot);
  try {
    return generateManifest({
      projectRoot,
      publicKeyPath: path.join(projectRoot, 'well-known-keys', 'spec-integrity.pem'),
      privateKeyPath,
      manifestPath: path.join(__dirname, 'manifest.v1.json'),
      sigPath: path.join(__dirname, 'manifest.v1.json.sig'),
    });
  } finally {
    if (isTemp) {
      try {
        fs.unlinkSync(privateKeyPath);
      } catch {
        // ignore missing file
      }
    }
  }
}

/* v8 ignore start */
if (require.main === module) {
  const result = runGenerateManifestCli();
  for (const msg of result.messages) {
    if (result.ok) {
      console.log(msg);
    } else {
      console.error(msg);
    }
  }
  process.exit(result.ok ? 0 : 1);
}
/* v8 ignore stop */
