import { generate } from '@strapi/generators';
import path from 'path';

import { getPluginServerDir, loadPluginPkg } from '../../utils/plugin-pkg';

import type { CLIContext } from '../../../../types';

type GeneratorName = 'api' | 'controller' | 'content-type' | 'middleware' | 'policy' | 'service';

export const runPluginGenerator = async (
  ctx: CLIContext,
  generator: GeneratorName,
  options: Record<string, unknown>
): Promise<void> => {
  const { pluginRoot, pkg } = await loadPluginPkg({ cwd: ctx.cwd, logger: ctx.logger });
  const serverDir = path.resolve(getPluginServerDir(pluginRoot));
  const previousCwd = process.cwd();

  try {
    // @strapi/generators <5.50.1 picks TS/JS templates from process.cwd(), not the `dir`
    // option. chdir into server/ (where tsconfig.json lives) until we can bump to 5.50.1+.
    process.chdir(serverDir);

    await generate(
      generator,
      {
        destination: 'root',
        plugin: pkg.strapi.name,
        ...options,
      },
      { dir: '.' }
    );
  } finally {
    process.chdir(previousCwd);
  }
};
