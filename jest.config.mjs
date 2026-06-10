import { buildSync } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));
const commanderCjs = join(rootDir, 'src/__tests__/support/commander.cjs');

// commander 15 is ESM-only; Jest on Node 22 cannot require() it natively.
mkdirSync(dirname(commanderCjs), { recursive: true });
buildSync({
  entryPoints: [join(rootDir, 'node_modules/commander/index.js')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: commanderCjs,
});

/**
 * @type {import('jest').Config}
 */
export default {
  modulePathIgnorePatterns: ['dist'],
  testMatch: ['**/__tests__/**/*.test.{js,ts}'],
  testPathIgnorePatterns: ['__tests__/fixtures/'],
  moduleNameMapper: {
    '^commander$': '<rootDir>/src/__tests__/support/commander.cjs',
  },
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },
  displayName: 'Plugin CLI',
  collectCoverageFrom: ['src/**/*.ts'],
};
