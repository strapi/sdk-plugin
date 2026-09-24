import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  BUILD_TEST_TIMEOUT_MS,
  ensureFixtureBuilt,
  getFixturePath,
  invokeCLI,
  withMockedCLI,
} from './test-utils';

describe('verify command', () => {
  it(
    'should verify a valid TypeScript plugin',
    async () => {
      await ensureFixtureBuilt('typescript-plugin');

      await withMockedCLI('typescript-plugin', async ({ command, mockExit }) => {
        const cli = await invokeCLI(['verify', '--silent'], command);

        await cli.parseAsync(['node', 'strapi-plugin', 'verify', '--silent']);

        expect(mockExit).not.toHaveBeenCalled();
      });
    },
    BUILD_TEST_TIMEOUT_MS
  );

  it('should fail for plugin with invalid exports', async () => {
    await withMockedCLI('typescript-plugin', async () => {
      // This test will be more useful when we have fixtures with invalid exports
      // For now, this documents the expected behavior
      expect(true).toBe(true);
    });
  });

  it('should support --debug flag', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    try {
      await withMockedCLI('typescript-plugin', async ({ command }) => {
        await invokeCLI(['verify', '--debug'], command);
        expect(true).toBe(true);
      });
    } finally {
      consoleLogSpy.mockRestore();
    }
  });

  describe('bundle selection', () => {
    jest.setTimeout(BUILD_TEST_TIMEOUT_MS);

    // Built into a copy of the fixture: other test files build the fixture in
    // place, and a partially built plugin is the whole point of these tests.
    let pluginPath: string;

    const silentLogger = async () => {
      const { createLogger } = await import('../../cli/commands/utils/logger');

      return createLogger({ silent: true, debug: false, timestamp: false });
    };

    const buildTypesBundle = async () => {
      const { build } = await import('../../cli/commands/utils/build');

      await build({
        cwd: pluginPath,
        logger: await silentLogger(),
        silent: true,
        bundles: ['./types'],
      });
    };

    const verifyBundles = async (bundles?: string[]) => {
      const { verify } = await import('../../cli/commands/utils/validation');

      return verify({ cwd: pluginPath, logger: await silentLogger(), bundles });
    };

    beforeEach(() => {
      pluginPath = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-plugin-verify-'));
      fs.cpSync(getFixturePath('custom-export-plugin'), pluginPath, { recursive: true });
      fs.rmSync(path.join(pluginPath, 'dist'), { recursive: true, force: true });
    });

    afterEach(() => {
      fs.rmSync(pluginPath, { recursive: true, force: true });
    });

    it('should verify only the selected bundle after building only that bundle', async () => {
      await buildTypesBundle();

      await expect(verifyBundles(['./types'])).resolves.toBeUndefined();
    });

    it('should still report the bundles that were not built when no selection is given', async () => {
      await buildTypesBundle();

      await expect(verifyBundles()).rejects.toThrow('Missing files for exports:');
    });

    it('should reject an unknown bundle name', async () => {
      await expect(verifyBundles(['./strapi-admin'])).rejects.toThrow(
        'Unknown bundle "./strapi-admin". Available bundles: ./strapi-server, ./types'
      );
    });

    it('should refuse an empty selection instead of verifying everything', async () => {
      await expect(verifyBundles([])).rejects.toThrow('The --bundle option needs a bundle name.');
    });

    it('should refuse a string export such as ./package.json', async () => {
      await expect(verifyBundles(['./package.json'])).rejects.toThrow(
        'Unknown bundle "./package.json".'
      );
    });
  });
});
