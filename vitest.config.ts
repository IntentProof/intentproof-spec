import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    testTimeout: 120_000,
  },
  coverage: {
    provider: 'v8',
    all: true,
    include: ['**/*.ts'],
    exclude: ['**/*.test.ts', 'node_modules/**', 'vitest.config.ts'],
    reportsDirectory: 'coverage',
    reporter: ['text', 'json-summary', 'lcov'],
  },
});
