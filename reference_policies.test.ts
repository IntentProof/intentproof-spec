import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { validateReferencePolicies } from './reference-policies/validate';

const templateSrc = path.join(__dirname, 'reference-policies/templates/minimal-required/v1');
const repoRoot = __dirname;

function copyTemplate(): { root: string; packDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ip-pack-'));
  const packDir = path.join(root, 'templates', 'minimal-required', 'v1');
  fs.cpSync(templateSrc, packDir, { recursive: true });
  return { root: path.join(root, 'templates'), packDir };
}

type Mutator = { name: string; apply: (packDir: string) => void };

const mutators: Mutator[] = [
  {
    name: 'missing pack.json',
    apply: (packDir) => {
      fs.unlinkSync(path.join(packDir, 'pack.json'));
    },
  },
  {
    name: 'invalid pack schema',
    apply: (packDir) => {
      const manifest = JSON.parse(fs.readFileSync(path.join(packDir, 'pack.json'), 'utf-8'));
      manifest.schema = 'wrong';
      fs.writeFileSync(path.join(packDir, 'pack.json'), JSON.stringify(manifest));
    },
  },
  {
    name: 'wrong reference_id',
    apply: (packDir) => {
      const manifest = JSON.parse(fs.readFileSync(path.join(packDir, 'pack.json'), 'utf-8'));
      manifest.reference_id = 'reference.templates.wrong.v1';
      fs.writeFileSync(path.join(packDir, 'pack.json'), JSON.stringify(manifest));
    },
  },
  {
    name: 'missing display_name',
    apply: (packDir) => {
      const manifest = JSON.parse(fs.readFileSync(path.join(packDir, 'pack.json'), 'utf-8'));
      delete manifest.display_name;
      fs.writeFileSync(path.join(packDir, 'pack.json'), JSON.stringify(manifest));
    },
  },
  {
    name: 'missing README',
    apply: (packDir) => {
      fs.unlinkSync(path.join(packDir, 'README.md'));
    },
  },
  {
    name: 'invalid policy json',
    apply: (packDir) => {
      fs.writeFileSync(path.join(packDir, 'policy.json'), '{');
    },
  },
  {
    name: 'policy yaml drift',
    apply: (packDir) => {
      fs.writeFileSync(path.join(packDir, 'policy.yaml'), 'schema: intentproof.policy.v1\npolicy_id: wrong\n');
    },
  },
  {
    name: 'wrong policy fingerprint',
    apply: (packDir) => {
      const policy = JSON.parse(fs.readFileSync(path.join(packDir, 'policy.json'), 'utf-8'));
      policy.policy_fingerprint = 'sha256:deadbeef';
      fs.writeFileSync(path.join(packDir, 'policy.json'), JSON.stringify(policy));
    },
  },
  {
    name: 'invalid fixture id',
    apply: (packDir) => {
      const manifest = JSON.parse(fs.readFileSync(path.join(packDir, 'pack.json'), 'utf-8'));
      manifest.fixtures[0].id = 'Bad_ID';
      fs.writeFileSync(path.join(packDir, 'pack.json'), JSON.stringify(manifest));
    },
  },
  {
    name: 'fixture path outside prefix',
    apply: (packDir) => {
      const manifest = JSON.parse(fs.readFileSync(path.join(packDir, 'pack.json'), 'utf-8'));
      manifest.fixtures[0].flow = 'policy.json';
      fs.writeFileSync(path.join(packDir, 'pack.json'), JSON.stringify(manifest));
    },
  },
  {
    name: 'missing fixture flow file',
    apply: (packDir) => {
      fs.unlinkSync(path.join(packDir, 'fixtures/happy-path/flow.json'));
    },
  },
  {
    name: 'invalid attestations jsonl',
    apply: (packDir) => {
      fs.writeFileSync(path.join(packDir, 'fixtures/happy-path/attestations.jsonl'), '{bad');
    },
  },
  {
    name: 'expected run policy mismatch',
    apply: (packDir) => {
      const expected = JSON.parse(
        fs.readFileSync(path.join(packDir, 'fixtures/happy-path/expected-run.json'), 'utf-8'),
      );
      expected.policy_fingerprint = 'sha256:wrong';
      fs.writeFileSync(
        path.join(packDir, 'fixtures/happy-path/expected-run.json'),
        JSON.stringify(expected),
      );
    },
  },
  {
    name: 'expected run flow mismatch',
    apply: (packDir) => {
      const expected = JSON.parse(
        fs.readFileSync(path.join(packDir, 'fixtures/happy-path/expected-run.json'), 'utf-8'),
      );
      expected.flow_id = 'flow_wrong';
      fs.writeFileSync(
        path.join(packDir, 'fixtures/happy-path/expected-run.json'),
        JSON.stringify(expected),
      );
    },
  },
  {
    name: 'duplicate fixture id',
    apply: (packDir) => {
      const manifest = JSON.parse(fs.readFileSync(path.join(packDir, 'pack.json'), 'utf-8'));
      manifest.fixtures.push({ ...manifest.fixtures[0] });
      fs.writeFileSync(path.join(packDir, 'pack.json'), JSON.stringify(manifest));
    },
  },
  {
    name: 'empty fixtures list',
    apply: (packDir) => {
      const manifest = JSON.parse(fs.readFileSync(path.join(packDir, 'pack.json'), 'utf-8'));
      manifest.fixtures = [];
      fs.writeFileSync(path.join(packDir, 'pack.json'), JSON.stringify(manifest));
    },
  },
  {
    name: 'invalid yaml policy file',
    apply: (packDir) => {
      fs.writeFileSync(path.join(packDir, 'policy.yaml'), ':\n- bad');
    },
  },
  {
    name: 'invalid pack json syntax',
    apply: (packDir) => {
      fs.writeFileSync(path.join(packDir, 'pack.json'), '{');
    },
  },
  {
    name: 'empty policy path',
    apply: (packDir) => {
      const manifest = JSON.parse(fs.readFileSync(path.join(packDir, 'pack.json'), 'utf-8'));
      manifest.policy = '   ';
      fs.writeFileSync(path.join(packDir, 'pack.json'), JSON.stringify(manifest));
    },
  },
  {
    name: 'domain path mismatch',
    apply: (packDir) => {
      const manifest = JSON.parse(fs.readFileSync(path.join(packDir, 'pack.json'), 'utf-8'));
      manifest.domain = 'wrong';
      fs.writeFileSync(path.join(packDir, 'pack.json'), JSON.stringify(manifest));
    },
  },
  {
    name: 'policy fails schema validation',
    apply: (packDir) => {
      fs.writeFileSync(path.join(packDir, 'policy.json'), '{}');
    },
  },
  {
    name: 'flow fails schema validation',
    apply: (packDir) => {
      fs.writeFileSync(path.join(packDir, 'fixtures/happy-path/flow.json'), '{}');
    },
  },
  {
    name: 'expected run fails schema validation',
    apply: (packDir) => {
      fs.writeFileSync(path.join(packDir, 'fixtures/happy-path/expected-run.json'), '{}');
    },
  },
  {
    name: 'missing migration notes file',
    apply: (packDir) => {
      fs.unlinkSync(path.join(packDir, 'MIGRATION.md'));
    },
  },
  {
    name: 'path escape attempt',
    apply: (packDir) => {
      const manifest = JSON.parse(fs.readFileSync(path.join(packDir, 'pack.json'), 'utf-8'));
      manifest.policy = '../../../etc/passwd';
      fs.writeFileSync(path.join(packDir, 'pack.json'), JSON.stringify(manifest));
    },
  },
];

describe('validateReferencePolicies duplicate packs', () => {
  it('fails when two packs share a reference_id', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ip-dup-'));
    for (const name of ['alpha', 'beta']) {
      const packDir = path.join(root, 'templates', name, 'v1');
      fs.cpSync(templateSrc, packDir, { recursive: true });
      const manifest = JSON.parse(fs.readFileSync(path.join(packDir, 'pack.json'), 'utf-8'));
      manifest.name = name;
      manifest.reference_id = 'reference.templates.shared.v1';
      fs.writeFileSync(path.join(packDir, 'pack.json'), JSON.stringify(manifest));
    }
    const result = validateReferencePolicies({ root, repoRoot });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/duplicate reference_id/);
  });
});

describe('validateReferencePolicies pack mutators', () => {
  for (const mutator of mutators) {
    it(`fails when ${mutator.name}`, () => {
      const { root, packDir } = copyTemplate();
      mutator.apply(packDir);
      const result = validateReferencePolicies({ root, repoRoot });
      expect(result.ok).toBe(false);
      expect(result.messages.length).toBeGreaterThan(0);
    });
  }

  it('fails when no packs exist', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ip-empty-'));
    const result = validateReferencePolicies({ root, repoRoot });
    expect(result.ok).toBe(false);
    expect(result.messages.join('\n')).toMatch(/no reference policy packs found/);
  });
});
