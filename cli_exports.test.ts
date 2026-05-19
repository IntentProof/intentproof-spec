import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { runConformanceCli } from './conformance/runner';
import { runJcsConformanceCli } from './conformance/jcs_conformance';
import { runAgentManifestTestsCli } from './conformance/agent_manifest_test';
import { runWebhookFindingsCli } from './conformance/webhook_findings';
import { runVerifyManifestCli } from './integrity/verify_manifest';
import { runGenerateManifestCli } from './integrity/generate_manifest';
import { runVerifyCompatibilityMatrixCli } from './compatibility/verify_matrix';
import { runValidateReasonsCli } from './semantics/validate_reasons';
import { runValidateProvenanceClassesCli } from './semantics/validate_provenance_classes';
import { runValidateReferencePoliciesCli } from './reference-policies/validate';

describe('in-process CLI runners', () => {
  it('runs exported CLI helpers successfully', async () => {
    expect(runConformanceCli()).toBe(0);
    expect(runJcsConformanceCli()).toBe(0);
    expect(runAgentManifestTestsCli()).toBe(0);
    expect(runWebhookFindingsCli()).toBe(0);
    expect(runVerifyManifestCli()).toBe(0);
    expect(await runVerifyCompatibilityMatrixCli()).toBe(0);
    expect(runValidateReasonsCli()).toBe(0);
    expect(runValidateProvenanceClassesCli()).toBe(0);
    expect(runValidateReferencePoliciesCli()).toBe(0);

    const privateKeyPath = path.join(__dirname, 'secrets/spec-integrity-private.pem');
    if (fs.existsSync(privateKeyPath)) {
      expect(runGenerateManifestCli().ok).toBe(true);
    }
  });
});
