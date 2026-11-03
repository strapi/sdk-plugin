import path from 'node:path';

import { createViteConfig } from '../../cli/commands/utils/build/vite-config';

import type { BundleConfig } from '../../cli/commands/utils/build';

const fixtureCwd = path.join(__dirname, '..', 'fixtures', 'typescript-plugin');

const bundle = (runtime: BundleConfig['runtime'], dir: string): BundleConfig => ({
  name: runtime === 'browser' ? './strapi-admin' : './strapi-server',
  runtime,
  source: `./${dir}/src/index.ts`,
  output: {
    cjs: `./dist/${dir}/index.js`,
    esm: `./dist/${dir}/index.mjs`,
  },
});

describe('createViteConfig', () => {
  it('should build the browser bundle with React and a browser target', async () => {
    const config = await createViteConfig({
      cwd: fixtureCwd,
      bundle: bundle('browser', 'admin'),
      silent: true,
    });

    expect(config.build?.target).toBe('es2020');
    expect(
      config.plugins?.some((plugin) => (plugin as { name?: string })?.name?.includes('react'))
    ).toBe(true);
  });

  it('should build a node bundle without React and with a node target', async () => {
    const config = await createViteConfig({
      cwd: fixtureCwd,
      bundle: bundle('node', 'server'),
      silent: true,
    });

    expect(config.build?.target).toBe('node20');
    expect(
      config.plugins?.some((plugin) => (plugin as { name?: string })?.name?.includes('react'))
    ).toBe(false);
  });

  it('should name the bundle in the missing-output error', async () => {
    const withoutOutput = { ...bundle('node', 'server'), output: {} };

    await expect(createViteConfig({ cwd: fixtureCwd, bundle: withoutOutput })).rejects.toThrow(
      'Bundle ./strapi-server has no output paths specified'
    );
  });
});
