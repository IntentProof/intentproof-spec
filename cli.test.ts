import { execFileSync } from 'child_process';
import * as https from 'https';
import { afterEach, describe, expect, it } from 'vitest';
import {
  githubReleaseExistsViaHttps,
  setHttpsGetForTests,
} from './compatibility/verify_matrix';

const root = __dirname;

function runTsScript(script: string): string {
  return execFileSync('npx', ['ts-node', script], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function mockHttpsGet(statusCode: number): typeof https.get {
  return (_url, _opts, cb) => {
    const res = {
      statusCode,
      resume: () => undefined,
      on: (event: string, handler: () => void) => {
        if (event === 'end') {
          handler();
        }
      },
    };
    (cb as (res: typeof res) => void)(res);
    return {
      on: () => undefined,
      setTimeout: (_ms: number, handler: () => void) => {
        handler();
        return undefined;
      },
      destroy: () => undefined,
    } as unknown as ReturnType<typeof https.get>;
  };
}

afterEach(() => {
  setHttpsGetForTests(null);
});

describe('CLI entrypoints', () => {
  it('runs conformance and validation scripts successfully', () => {
    expect(runTsScript('conformance/runner.ts')).toContain('All conformance checks passed');
    expect(runTsScript('conformance/jcs_conformance.ts')).toContain('All JCS conformance checks passed');
    expect(runTsScript('conformance/agent_manifest_test.ts')).toContain('All agent manifest projection checks passed');
    expect(runTsScript('conformance/webhook_findings.ts')).toContain('All webhook finding signature checks passed');
    expect(runTsScript('integrity/verify_manifest.ts')).toContain('All integrity checks passed');
    expect(runTsScript('compatibility/verify_matrix.ts')).toContain('Compatibility matrix schema validated');
    expect(runTsScript('semantics/validate_reasons.ts')).toContain('reasons.json:');
    expect(runTsScript('semantics/validate_provenance_classes.ts')).toContain('Validated');
    expect(runTsScript('reference-policies/validate.ts')).toContain('Reference policy validation passed');
  });
});

describe('githubReleaseExistsViaHttps', () => {
  it('handles github release lookup responses', async () => {
    setHttpsGetForTests(mockHttpsGet(200));
    await expect(githubReleaseExistsViaHttps('intentproof-spec', 'v1.0.0')).resolves.toBe(true);

    setHttpsGetForTests(mockHttpsGet(404));
    await expect(githubReleaseExistsViaHttps('intentproof-spec', 'missing')).resolves.toBe(false);

    setHttpsGetForTests(mockHttpsGet(500));
    await expect(githubReleaseExistsViaHttps('intentproof-spec', 'v1.0.0')).rejects.toThrow(/HTTP 500/);
  });
});
