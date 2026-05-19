import * as fs from 'fs';
import * as path from 'path';
import { canonicalize } from 'json-canonicalize';
import { projectAgentManifest } from './agent_manifest';

export function runAgentManifestTests(casesPath: string): { ok: boolean; messages: string[] } {
  const messages: string[] = [];
  let hasError = false;
  const lines = fs.readFileSync(casesPath, 'utf-8').split('\n').filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const fixture = JSON.parse(lines[i]) as Record<string, unknown>;
    if (!fixture.shouldValidate || !fixture.source_bundle) {
      continue;
    }

    const projected = projectAgentManifest(fixture.source_bundle as Record<string, unknown>);
    const actual = fixture.agent_manifest;
    if (canonicalize(projected) !== canonicalize(actual)) {
      messages.push(`[FAIL] ${path.basename(casesPath)}:${i + 1} projection mismatch`);
      hasError = true;
    } else {
      messages.push(`[PASS] ${path.basename(casesPath)}:${i + 1} projection verified`);
    }
  }

  if (!hasError) {
    messages.push('All agent manifest projection checks passed.');
  }
  return { ok: !hasError, messages };
}

export function runAgentManifestTestsCli(): number {
  const casesPath = path.join(__dirname, '..', 'golden', 'agent-manifest_cases.jsonl');
  const result = runAgentManifestTests(casesPath);
  for (const msg of result.messages) {
    console.log(msg);
  }
  return result.ok ? 0 : 1;
}

/* v8 ignore start */
if (require.main === module) {
  process.exit(runAgentManifestTestsCli());
}
/* v8 ignore stop */
