import * as crypto from 'crypto';
import { canonicalize } from 'json-canonicalize';

const AUTHORITY_NOTE =
  'Verification authority rests with the deterministic verifier identified by run.verifier_build_hash. Consumers ingest findings; they do not re-decide them.';

export const AGENT_MANIFEST_READ_ORDER = [
  'certificate.json',
  'run.json',
  'policy.json',
  'flow.json',
  'events.jsonl',
  'attestations.jsonl',
  'subject-mappings.jsonl',
  'transparency-log-proof.json',
] as const;

export const AGENT_MANIFEST_TRUST_LABELS: Record<string, string> = {
  'certificate.json': 'platform_attested',
  'run.json': 'platform_attested',
  'policy.json': 'platform_attested',
  'flow.json': 'platform_attested',
  'events.jsonl': 'sdk_attested_evidence',
  'attestations.jsonl': 'source_attested',
  'subject-mappings.jsonl': 'platform_attested',
  'transparency-log-proof.json': 'platform_attested',
};

export type JsonRecord = Record<string, unknown>;

export function sha256Canonical(value: unknown): string {
  return `sha256:${crypto.createHash('sha256').update(canonicalize(value)).digest('hex')}`;
}

export function projectAgentManifest(source: JsonRecord): JsonRecord {
  const files = source.files as JsonRecord;
  const certificate = files['certificate.json'] as JsonRecord;
  const run = files['run.json'] as JsonRecord;
  const policy = files['policy.json'] as JsonRecord;
  const flow = files['flow.json'] as JsonRecord;
  const events = (files['events.jsonl'] ?? []) as JsonRecord[];

  const presentFiles = AGENT_MANIFEST_READ_ORDER.filter((name) => files[name] !== undefined);
  const failedFindings = ((run.findings ?? []) as JsonRecord[])
    .filter((finding) => finding.outcome !== 'pass')
    .map((finding) => finding.finding_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .sort();

  const trustLabelsIndex: Record<string, string> = {};
  for (const name of presentFiles) {
    trustLabelsIndex[name] = AGENT_MANIFEST_TRUST_LABELS[name];
  }

  const untrustedPayloadFields: string[] = [];
  if (events.some((event) => event.untrusted_payload === true && event.inputs !== undefined)) {
    untrustedPayloadFields.push('events.jsonl#$.inputs');
  }
  if (events.some((event) => event.untrusted_payload === true && event.output !== undefined)) {
    untrustedPayloadFields.push('events.jsonl#$.output');
  }

  return {
    schema: 'intentproof.agent_manifest.v1',
    bundle_sha256: sha256Canonical(files),
    tenant_id: run.tenant_id,
    issued_at: certificate.issued_at,
    primary_question: `Did flow ${flow.flow_id} satisfy policy ${policy.policy_id} v${policy.policy_version}?`,
    verifier_decision: run.status,
    decision_basis_finding_ids: failedFindings,
    recommended_read_order: presentFiles,
    trust_labels_index: trustLabelsIndex,
    untrusted_payload_fields: untrustedPayloadFields,
    known_limitations: source.known_limitations ?? [],
    verifier_authority_note: AUTHORITY_NOTE,
  };
}
