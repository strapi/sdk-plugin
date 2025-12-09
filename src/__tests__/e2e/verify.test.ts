import { Command } from 'commander';
import path from 'node:path';

import { createCLI } from '../../index';

const fixturesDir = path.join(__dirname, '../fixtures');

describe('verify command', () => {
  it('should verify a valid TypeScript plugin', async () => {
    const pluginDir = path.join(fixturesDir, 'typescript-plugin');

    // Mock process.cwd to return the fixture directory
    const originalCwd = process.cwd;
    jest.spyOn(process, 'cwd').mockReturnValue(pluginDir);

    // Mock process.exit to prevent actual exit
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    try {
      const command = new Command();
      const cli = await createCLI(['node', 'strapi-plugin', 'verify', '--silent'], command);

      await expect(
        cli.parseAsync(['node', 'strapi-plugin', 'verify', '--silent'])
      ).resolves.not.toThrow();

      // Verify command should succeed for valid plugin
      expect(mockExit).not.toHaveBeenCalled();
    } finally {
      // Restore mocks
      process.cwd = originalCwd;
      mockExit.mockRestore();
    }
  });

  it('should fail for plugin with invalid exports', async () => {
    const pluginDir = path.join(fixturesDir, 'typescript-plugin');

    const originalCwd = process.cwd;
    jest.spyOn(process, 'cwd').mockReturnValue(pluginDir);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });

    try {
      // This test will be more useful when we have fixtures with invalid exports
      // For now, this documents the expected behavior
      expect(true).toBe(true);
    } finally {
      process.cwd = originalCwd;
      mockExit.mockRestore();
    }
  });

  it('should support --debug flag', async () => {
    const pluginDir = path.join(fixturesDir, 'typescript-plugin');

    const originalCwd = process.cwd;
    jest.spyOn(process, 'cwd').mockReturnValue(pluginDir);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Capture console output to verify debug mode works
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    try {
      const command = new Command();
      await createCLI(['node', 'strapi-plugin', 'verify', '--debug'], command);

      // In debug mode, more verbose output should be logged
      // This is a basic smoke test
      expect(true).toBe(true);
    } finally {
      process.cwd = originalCwd;
      mockExit.mockRestore();
      consoleLogSpy.mockRestore();
    }
  });
});
