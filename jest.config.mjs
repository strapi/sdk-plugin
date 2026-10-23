import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Suites Jest will actually run. On Node < 24.9 each one needs its own worker.
 */
const countTestFiles = (dir) => {
  let count = 0;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name !== 'fixtures' && entry.name !== 'node_modules') {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        count += countTestFiles(fullPath);
      } else if (entry.isFile() && /\.test\.(js|ts)$/.test(entry.name)) {
        count += 1;
      }
    }
  }

  return count;
};

const [nodeMajor = 0, nodeMinor = 0] = process.versions.node.split('.').map(Number);
// Same cutoff as src/cli/commands/utils/esm-interop.ts. Below it, commander is loaded
// with a native dynamic import that escapes Jest's per-file environment. Reusing a
// worker for the next file throws "import after teardown". `npm publish` runs these
// tests from `prepack` on the Release workflow's Node 22 image, which has fewer
// cores than test files, so the default worker count is not enough.
const isolateEsmWorkers = nodeMajor < 24 || (nodeMajor === 24 && nodeMinor < 9);

/**
 * @type {import('jest').Config}
 */
const config = {
  modulePathIgnorePatterns: ['dist'],
  testMatch: ['**/__tests__/**/*.test.{js,ts}'],
  testPathIgnorePatterns: ['__tests__/fixtures/'],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },
  displayName: 'Plugin CLI',
  collectCoverageFrom: ['src/**/*.ts'],
};

if (isolateEsmWorkers) {
  config.maxWorkers = Math.max(countTestFiles(path.join(rootDir, 'src', '__tests__')), 1);
}

export default config;
