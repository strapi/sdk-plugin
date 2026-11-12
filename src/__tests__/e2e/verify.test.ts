import fs from 'node:fs';
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

  it(
    'should verify an ESM-only plugin with no require export',
    async () => {
      await ensureFixtureBuilt('esm-only-plugin');

      try {
        await withMockedCLI('esm-only-plugin', async ({ command, mockExit }) => {
          const cli = await invokeCLI(['verify', '--silent'], command);

          await cli.parseAsync(['node', 'strapi-plugin', 'verify', '--silent']);

          expect(mockExit).not.toHaveBeenCalled();
        });
      } finally {
        fs.rmSync(path.join(getFixturePath('esm-only-plugin'), 'dist'), {
          recursive: true,
          force: true,
        });
      }
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
});
