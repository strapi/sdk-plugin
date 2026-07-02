import fs from 'fs/promises';
import path from 'path';
import * as yup from 'yup';

import { getChalk } from './chalk-loader';

import type { Logger } from './logger';

const pluginPackageJsonSchema = yup.object({
  name: yup.string().required(),
  strapi: yup
    .object({
      kind: yup.string().oneOf(['plugin']).required(),
      name: yup.string().required(),
      displayName: yup.string().required(),
      description: yup.string().optional(),
    })
    .required(),
});

export type PluginPackageJson = yup.InferType<typeof pluginPackageJsonSchema>;

const isPluginPackageJson = (value: unknown): value is { strapi?: { kind?: string } } =>
  Boolean(value) && typeof value === 'object';

/**
 * Walk up from `cwd` until a package.json with `strapi.kind === "plugin"` is found.
 */
export const resolvePluginRoot = async (cwd: string): Promise<string> => {
  let current = path.resolve(cwd);
  const { root } = path.parse(current);

  for (;;) {
    const pkgPath = path.join(current, 'package.json');

    try {
      const buffer = await fs.readFile(pkgPath);
      const pkg = JSON.parse(buffer.toString());

      if (isPluginPackageJson(pkg) && pkg.strapi?.kind === 'plugin') {
        return current;
      }
    } catch {
      // Keep walking up.
    }

    if (current === root) {
      break;
    }

    current = path.dirname(current);
  }

  throw new Error(
    'Could not find a Strapi plugin package.json. Run this command from inside a plugin directory.'
  );
};

export const loadPluginPkg = async ({
  cwd,
  logger,
}: {
  cwd: string;
  logger: Logger;
}): Promise<{ pluginRoot: string; pkg: PluginPackageJson }> => {
  const pluginRoot = await resolvePluginRoot(cwd);
  const pkgPath = path.join(pluginRoot, 'package.json');
  const buffer = await fs.readFile(pkgPath);
  const pkg = JSON.parse(buffer.toString());

  logger.debug('Loaded plugin package.json from', pkgPath);

  try {
    const validatedPkg = await pluginPackageJsonSchema.validate(pkg, { strict: true });

    return { pluginRoot, pkg: validatedPkg };
  } catch (err) {
    if (err instanceof yup.ValidationError && err.path) {
      throw new Error(
        `'${err.path}' in 'package.json' is required for plugin generation (expected type '${getChalk().magenta(
          String(err.type ?? 'unknown')
        )}')`
      );
    }

    throw err;
  }
};

export const getPluginServerDir = (pluginRoot: string): string => path.join(pluginRoot, 'server');
