import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { runConformance } from './conformance/runner';
import { runJcsConformanceTests } from './conformance/jcs_conformance';
import { runAgentManifestTests } from './conformance/agent_manifest_test';
import { runWebhookFindingTests } from './conformance/webhook_findings';
import { verifyManifest } from './integrity/verify_manifest';
import { verifyCompatibilityMatrix } from './compatibility/verify_matrix';
import { validateReasons } from './semantics/validate_reasons';
import { validateProvenanceClasses } from './semantics/validate_provenance_classes';
import { validateReferencePolicies } from './reference-policies/validate';

const root = __dirname;

describe('integration suite', () => {
  it('conformance runner passes goldens', () => {
    const result = runConformance({ schemaDir: path.join(root, 'schema'), goldenDir: path.join(root, 'golden') });
    expect(result.ok, result.messages.filter((m) => m.startsWith('[FAIL]')).join('\n')).toBe(true);
  });

  it('JCS conformance passes', () => {
    expect(runJcsConformanceTests().ok).toBe(true);
  });

  it('agent manifest projections pass', () => {
    const result = runAgentManifestTests(path.join(root, 'golden', 'agent-manifest_cases.jsonl'));
    expect(result.ok).toBe(true);
  });

  it('webhook finding signatures pass', () => {
    const result = runWebhookFindingTests(
      path.join(root, 'golden', 'webhook-finding_cases.jsonl'),
      path.join(root, 'well-known-keys', 'webhook-signer-2026q2.pem'),
    );
    expect(result.ok).toBe(true);
  });

  it('integrity manifest verifies', () => {
    expect(verifyManifest(root).ok).toBe(true);
  });

  it('compatibility matrix validates (source-verified entries skip release checks)', async () => {
    const result = await verifyCompatibilityMatrix({ root });
    expect(result.ok).toBe(true);
  });

  it('reasons vocabulary validates', () => {
    expect(validateReasons().ok).toBe(true);
  });

  it('provenance classes validate', () => {
    expect(validateProvenanceClasses().ok).toBe(true);
  });

  it('reference policy packs validate', () => {
    const result = validateReferencePolicies({ root: path.join(root, 'reference-policies'), repoRoot: root });
    expect(result.ok).toBe(true);
    expect(result.packCount).toBeGreaterThan(0);
  });
});
