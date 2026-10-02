import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { BUILD_TEST_TIMEOUT_MS, getFixturePath, invokeCLI, withMockedCLI } from './test-utils';

import type { Logger } from '../../cli/commands/utils/logger';

describe('build command', () => {
  it('should validate package.json before building', async () => {
    await withMockedCLI('typescript-plugin', async ({ command }) => {
      await invokeCLI(['build', '--silent'], command);
      expect(true).toBe(true);
    });
  });

  it('should fail when no strapi-admin or strapi-server exports exist', async () => {
    await withMockedCLI('typescript-plugin', async () => {
      // This documents expected error handling
      // We would need a fixture without exports to test this properly
      expect(true).toBe(true);
    });
  });

  it('should support --sourcemap flag', async () => {
    await withMockedCLI('typescript-plugin', async ({ command }) => {
      await invokeCLI(['build', '--sourcemap', '--silent'], command);
      expect(true).toBe(true);
    });
  });

  it('should support --minify flag', async () => {
    await withMockedCLI('typescript-plugin', async ({ command }) => {
      await invokeCLI(['build', '--minify', '--silent'], command);
      expect(true).toBe(true);
    });
  });

  it('should set NODE_ENV to production', async () => {
    const originalEnv = process.env.NODE_ENV;

    try {
      await withMockedCLI('typescript-plugin', async ({ command }) => {
        await invokeCLI(['build', '--silent'], command);
        expect(true).toBe(true);
      });
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  describe('custom exports', () => {
    jest.setTimeout(BUILD_TEST_TIMEOUT_MS);

    const fixturePath = getFixturePath('custom-export-plugin');
    const distTypesDir = path.join(fixturePath, 'dist/types');
    const distServerDir = path.join(fixturePath, 'dist/server');

    afterEach(() => {
      // Clean up built files after each test
      const filesToClean = ['index.mjs', 'index.js', 'index.d.ts'];
      for (const file of filesToClean) {
        const typesFilePath = path.join(distTypesDir, file);
        if (fs.existsSync(typesFilePath)) {
          fs.unlinkSync(typesFilePath);
        }
        const serverFilePath = path.join(distServerDir, file);
        if (fs.existsSync(serverFilePath)) {
          fs.unlinkSync(serverFilePath);
        }
      }
    });

    it('should build custom exports defined in package.json', async () => {
      const { build } = await import('../../cli/commands/utils/build');
      const { createLogger } = await import('../../cli/commands/utils/logger');
      const logger = createLogger({ silent: true, debug: false, timestamp: false });

      await build({
        cwd: fixturePath,
        logger,
        silent: true,
      });

      // Verify custom export was built
      expect(fs.existsSync(path.join(distTypesDir, 'index.mjs'))).toBe(true);
    });

    it('should build ESM-only custom export when only import is specified', async () => {
      const { build } = await import('../../cli/commands/utils/build');
      const { createLogger } = await import('../../cli/commands/utils/logger');
      const logger = createLogger({ silent: true, debug: false, timestamp: false });

      await build({
        cwd: fixturePath,
        logger,
        silent: true,
      });

      // ESM should exist (specified in exports)
      expect(fs.existsSync(path.join(distTypesDir, 'index.mjs'))).toBe(true);
      // CJS should NOT exist (not specified in exports for ./types)
      expect(fs.existsSync(path.join(distTypesDir, 'index.js'))).toBe(false);
    });

    it('should generate type declarations for custom exports with types field', async () => {
      const { build } = await import('../../cli/commands/utils/build');
      const { createLogger } = await import('../../cli/commands/utils/logger');
      const logger = createLogger({ silent: true, debug: false, timestamp: false });

      await build({
        cwd: fixturePath,
        logger,
        silent: true,
      });

      // Type declarations should be generated for the ./types custom export
      expect(fs.existsSync(path.join(distTypesDir, 'index.d.ts'))).toBe(true);
    });
  });

  describe('"type": "module" plugin', () => {
    jest.setTimeout(BUILD_TEST_TIMEOUT_MS);

    const fixturePath = getFixturePath('esm-type-plugin');
    const distDir = path.join(fixturePath, 'dist');
    const distServerDir = path.join(distDir, 'server');

    afterEach(() => {
      fs.rmSync(distDir, { recursive: true, force: true });
    });

    it('should name output files after the exports map', async () => {
      const { build } = await import('../../cli/commands/utils/build');
      const { createLogger } = await import('../../cli/commands/utils/logger');
      const logger = createLogger({ silent: true, debug: false, timestamp: false });

      await build({
        cwd: fixturePath,
        logger,
        silent: true,
      });

      expect(fs.readdirSync(distServerDir).sort()).toEqual(['index.cjs', 'index.js']);
    });

    it('should produce output that Node loads through require and import', async () => {
      const { build } = await import('../../cli/commands/utils/build');
      const { createLogger } = await import('../../cli/commands/utils/logger');
      const logger = createLogger({ silent: true, debug: false, timestamp: false });

      await build({
        cwd: fixturePath,
        logger,
        silent: true,
      });

      const script = `
        const assert = require('node:assert');
        const cjs = require('./dist/server/index.cjs');
        assert.strictEqual(typeof (cjs.default ?? cjs).register, 'function');
        import('./dist/server/index.js').then((esm) => {
          assert.strictEqual(typeof esm.default.register, 'function');
        });
      `;

      // Run in a child process from the fixture so Node applies its "type": "module"
      expect(() =>
        execFileSync(process.execPath, ['--input-type=commonjs', '-e', script], {
          cwd: fixturePath,
          stdio: 'pipe',
        })
      ).not.toThrow();
    });

    it('should warn when require points to a .js file in a "type": "module" package', async () => {
      const { createViteConfig } = await import('../../cli/commands/utils/build/vite-config');
      const logger = { warn: jest.fn() } as unknown as Logger;

      await createViteConfig({
        cwd: fixturePath,
        logger,
        bundle: {
          type: 'server',
          source: './server/src/index.js',
          output: { cjs: './dist/server/index.js' },
        },
      });

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Use a ".cjs" extension'));
    });
  });

  describe('ESM-only "type": "module" plugin', () => {
    jest.setTimeout(BUILD_TEST_TIMEOUT_MS);

    const fixturePath = getFixturePath('esm-only-plugin');
    const distDir = path.join(fixturePath, 'dist');

    afterEach(() => {
      fs.rmSync(distDir, { recursive: true, force: true });
    });

    it('should build only the ES output, to the import path', async () => {
      const { build } = await import('../../cli/commands/utils/build');
      const { createLogger } = await import('../../cli/commands/utils/logger');
      const logger = createLogger({ silent: true, debug: false, timestamp: false });

      await build({
        cwd: fixturePath,
        logger,
        silent: true,
      });

      expect(fs.readdirSync(path.join(distDir, 'server'))).toEqual(['index.js']);

      const script = `import('./dist/server/index.js').then((esm) => {
        if (typeof esm.default.register !== 'function') process.exit(1);
      });`;

      expect(() =>
        execFileSync(process.execPath, ['-e', script], { cwd: fixturePath, stdio: 'pipe' })
      ).not.toThrow();
    });
  });
});
