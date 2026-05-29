import { Command } from 'commander';
import path from 'node:path';

/**
 * Shared test utilities for e2e CLI tests.
 */
export const fixturesDir = path.join(__dirname, '../fixtures');

/** Vite builds in e2e tests can exceed Jest's 5s default on slower CI Node versions. */
export const BUILD_TEST_TIMEOUT_MS = 15_000;

export function getFixturePath(fixtureName: string): string {
  return path.join(fixturesDir, fixtureName);
}

interface MockContext {
  command: Command;
  mockExit: jest.SpyInstance;
}

type TestCallback = (ctx: MockContext) => Promise<void>;

/**
 * Runs a test with mocked process.cwd and process.exit.
 * Automatically handles setup and cleanup.
 */
export async function withMockedCLI(fixtureName: string, testFn: TestCallback): Promise<void> {
  const testDir = getFixturePath(fixtureName);
  const originalCwd = process.cwd;

  jest.spyOn(process, 'cwd').mockReturnValue(testDir);

  const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code})`);
  });

  try {
    const command = new Command();
    await testFn({ command, mockExit });
  } finally {
    process.cwd = originalCwd;
    mockExit.mockRestore();
  }
}

/**
 * Builds a plugin fixture so verify (and other dist-dependent commands) succeed in CI,
 * where fixture dist/ is not checked in because the repo root .gitignore ignores dist.
 */
export async function ensureFixtureBuilt(fixtureName: string): Promise<void> {
  const { build } = await import('../../cli/commands/utils/build');
  const { createLogger } = await import('../../cli/commands/utils/logger');

  await build({
    cwd: getFixturePath(fixtureName),
    logger: createLogger({ silent: true, debug: false, timestamp: false }),
    silent: true,
  });
}

/**
 * Invokes the CLI with given arguments and returns the command instance.
 */
export async function invokeCLI(args: string[], command?: Command): Promise<Command> {
  const { createCLI } = await import('../../index');
  const cmd = command ?? new Command();
  await createCLI(['node', 'strapi-plugin', ...args], cmd);
  return cmd;
}
