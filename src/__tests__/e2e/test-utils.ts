import { Command } from 'commander';
import path from 'node:path';

import { createCLI } from '../../index';

/**
 * Shared test utilities for e2e CLI tests.
 */
export const fixturesDir = path.join(__dirname, '../fixtures');

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
 * Invokes the CLI with given arguments and returns the command instance.
 */
export async function invokeCLI(args: string[], command?: Command): Promise<Command> {
  const cmd = command ?? new Command();
  await createCLI(['node', 'strapi-plugin', ...args], cmd);
  return cmd;
}
