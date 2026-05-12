import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

function main() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

    const manifest: any = { files: {} };
    const schemaDir = path.join(__dirname, '../schema');
    const goldenDir = path.join(__dirname, '../golden');
    
    for (const dir of [schemaDir, goldenDir]) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') || f.endsWith('.jsonl'));
        for (const f of files) {
            const content = fs.readFileSync(path.join(dir, f));
            manifest.files[f] = `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
        }
    }

    const manifestContent = Buffer.from(JSON.stringify(manifest, null, 2));
    const sig = crypto.sign(null, manifestContent, privateKey);

    fs.writeFileSync(path.join(__dirname, 'manifest.v1.json'), manifestContent);
    fs.writeFileSync(path.join(__dirname, 'manifest.v1.json.sig'), sig);
    
    const pubKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
    fs.writeFileSync(path.join(__dirname, '../well-known-keys/spec-integrity.pem'), pubKeyPem);

    console.log("Manifest created and signed.");
    
    // verify
    const isVerified = crypto.verify(null, manifestContent, publicKey, sig);
    console.log("Verified:", isVerified);
}
main();
