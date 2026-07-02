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

  await generate(
    generator,
    {
      destination: 'root',
      plugin: pkg.strapi.name,
      ...options,
    },
    { dir: serverDir }
  );
};
