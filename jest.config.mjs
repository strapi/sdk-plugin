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
};
