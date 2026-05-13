import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

function main() {
    const keyPath = path.join(__dirname, '../well-known-keys/spec-integrity.pem');
    const privateKeyPath = path.join(__dirname, '../secrets/spec-integrity-private.pem');
    let privateKey: crypto.KeyObject;
    let publicKey: crypto.KeyObject;

    if (fs.existsSync(privateKeyPath)) {
        // Load existing private key and derive the matching public key.
        const privKeyPem = fs.readFileSync(privateKeyPath, 'utf-8');
        privateKey = crypto.createPrivateKey(privKeyPem);
        publicKey = crypto.createPublicKey(privateKey);
        // Ensure public key is also written (e.g. if it was deleted).
        if (!fs.existsSync(keyPath)) {
            fs.mkdirSync(path.dirname(keyPath), { recursive: true });
            fs.writeFileSync(keyPath, publicKey.export({ type: 'spki', format: 'pem' }));
        }
    } else if (fs.existsSync(keyPath)) {
        // Public key exists but private key is missing. Fail fast to prevent
        // silent key rotation that would invalidate existing signatures.
        const pubKeyPem = fs.readFileSync(keyPath, 'utf-8');
        publicKey = crypto.createPublicKey(pubKeyPem);
        console.error("Public key exists but private key is missing.");
        console.error(`Expected private key at: ${privateKeyPath}`);
        console.error("Regenerating would break existing signatures. Either restore the private key or delete the public key to generate a fresh pair.");
        process.exit(1);
    } else {
        // Neither key exists — generate a fresh pair.
        const kp = crypto.generateKeyPairSync('ed25519');
        privateKey = kp.privateKey;
        publicKey = kp.publicKey;
        // Persist private key with restrictive permissions before writing public key.
        fs.mkdirSync(path.dirname(privateKeyPath), { recursive: true });
        fs.writeFileSync(privateKeyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
        fs.writeFileSync(keyPath, publicKey.export({ type: 'spki', format: 'pem' }));
    }

    const manifest: any = { files: {} };
    const schemaDir = path.join(__dirname, '../schema');
    const goldenDir = path.join(__dirname, '../golden');
    const projectRoot = path.join(__dirname, '..');
    
    for (const dir of [schemaDir, goldenDir]) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') || f.endsWith('.jsonl'));
        for (const f of files) {
            const filePath = path.join(dir, f);
            const content = fs.readFileSync(filePath);
            const relativeKey = path.relative(projectRoot, filePath).split(path.sep).join('/');
            manifest.files[relativeKey] = `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
        }
    }

    const manifestContent = Buffer.from(JSON.stringify(manifest, null, 2));
    const sig = crypto.sign(null, manifestContent, privateKey);

    fs.writeFileSync(path.join(__dirname, 'manifest.v1.json'), manifestContent);
    fs.writeFileSync(path.join(__dirname, 'manifest.v1.json.sig'), sig);

    console.log("Manifest created and signed.");
    
    // verify
    const isVerified = crypto.verify(null, manifestContent, publicKey, sig);
    console.log("Verified:", isVerified);
}
main();
