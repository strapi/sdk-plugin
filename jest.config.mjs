const [nodeMajor = 0, nodeMinor = 0] = process.versions.node.split('.').map(Number);
const nodeHasSyncVmModules = nodeMajor > 24 || (nodeMajor === 24 && nodeMinor >= 9);

/**
 * @type {import('jest').Config}
 */
export default {
  modulePathIgnorePatterns: ['dist'],
  testMatch: ['**/__tests__/**/*.test.{js,ts}'],
  testPathIgnorePatterns: ['__tests__/fixtures/'],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },
  displayName: 'Plugin CLI',
  collectCoverageFrom: ['src/**/*.ts'],
  // ESM-only deps (commander 15) need a native `import()` escape on Node < 24.9; that
  // escape poisons later test files in the same worker. One worker per suite avoids reuse.
  ...(!nodeHasSyncVmModules ? { maxWorkers: 8 } : {}),
};
