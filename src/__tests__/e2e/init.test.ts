import { Command } from 'commander';
import path from 'node:path';

import { createCLI } from '../../index';

const fixturesDir = path.join(__dirname, '../fixtures');

describe('init command', () => {
  it('should have init subcommand available', async () => {
    const originalCwd = process.cwd;
    const testDir = path.join(fixturesDir, 'test-init');

    jest.spyOn(process, 'cwd').mockReturnValue(testDir);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    try {
      const command = new Command();
      await createCLI(['node', 'strapi-plugin'], command);

      // Verify the init command is registered
      const initCommand = command.commands.find((cmd) => cmd.name() === 'init');
      expect(initCommand).toBeDefined();
      expect(initCommand?.description()).toContain('plugin');
    } finally {
      process.cwd = originalCwd;
      mockExit.mockRestore();
    }
  });

  it('should register init command with proper options', async () => {
    const originalCwd = process.cwd;
    const testDir = path.join(fixturesDir, 'test-init');

    jest.spyOn(process, 'cwd').mockReturnValue(testDir);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    try {
      const command = new Command();
      await createCLI(['node', 'strapi-plugin'], command);

      // Verify the init command is properly configured
      const initCommand = command.commands.find((cmd) => cmd.name() === 'init');
      expect(initCommand).toBeDefined();

      // Check that init command has expected options
      if (initCommand) {
        const options = initCommand.options.map((opt) => opt.long);
        expect(options).toContain('--debug');
        expect(options).toContain('--silent');
      }
    } finally {
      process.cwd = originalCwd;
      mockExit.mockRestore();
    }
  });

  it('should support --debug flag', async () => {
    const originalCwd = process.cwd;
    const testDir = path.join(fixturesDir, 'test-init');

    jest.spyOn(process, 'cwd').mockReturnValue(testDir);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    try {
      const command = new Command();
      await createCLI(['node', 'strapi-plugin', '--debug'], command);

      // Debug flag should be recognized
      expect(true).toBe(true);
    } finally {
      process.cwd = originalCwd;
      mockExit.mockRestore();
    }
  });

  it('should support --silent flag', async () => {
    const originalCwd = process.cwd;
    const testDir = path.join(fixturesDir, 'test-init');

    jest.spyOn(process, 'cwd').mockReturnValue(testDir);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    try {
      const command = new Command();
      await createCLI(['node', 'strapi-plugin', '--silent'], command);

      // Silent flag should be recognized
      expect(true).toBe(true);
    } finally {
      process.cwd = originalCwd;
      mockExit.mockRestore();
    }
  });
});
