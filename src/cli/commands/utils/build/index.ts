/**
 * Build orchestrator for Strapi plugins.
 */
import fs from 'node:fs';
import path from 'node:path';
import { build as viteBuild } from 'vite';

import { createViteConfig } from './vite-config';

import type { Logger } from '../logger';
import type { Export } from '../pkg';

/**
 * Check for legacy packup config files and warn if found.
 */
function warnIfPackupConfigExists(cwd: string, logger: Logger, silent: boolean): void {
  if (silent) {
    return;
  }

  const packupConfigFiles = ['packup.config.ts', 'packup.config.js', 'packup.config.mjs'];

  for (const configFile of packupConfigFiles) {
    if (fs.existsSync(path.join(cwd, configFile))) {
      logger.warn(
        `Found ${configFile} but it will be ignored. ` +
          'Configuration is now derived from package.json exports. ' +
          'You can safely delete this file.'
      );
      break;
    }
  }
}

export interface BuildOptions {
  cwd: string;
  logger: Logger;
  minify?: boolean;
  sourcemap?: boolean;
  silent?: boolean;
  debug?: boolean;
}

export interface BundleConfig {
  type: string;
  source: string;
  output: {
    cjs?: string;
    esm?: string;
    types?: string;
  };
  tsconfig?: string;
}

/**
 * Build a Strapi plugin using Vite.
 */
export async function build(options: BuildOptions): Promise<void> {
  const { cwd, logger, minify = false, sourcemap = false, silent = false } = options;

  warnIfPackupConfigExists(cwd, logger, silent);

  if (!silent) {
    logger.info('Building plugin...');
  }

  // Load and validate package.json to get export configuration
  const { loadPkg, validatePkg } = await import('../pkg');
  const pkg = await loadPkg({ cwd, logger });
  const pkgJson = await validatePkg({ pkg });

  if (!pkgJson.exports['./strapi-admin'] && !pkgJson.exports['./strapi-server']) {
    throw new Error(
      'You need to have either a strapi-admin or strapi-server export in your package.json'
    );
  }

  const bundles: BundleConfig[] = [];

  // Iterate all object-type exports
  for (const [exportKey, exp] of Object.entries(pkgJson.exports)) {
    if (typeof exp !== 'string') {
      const typedExp = exp as Export;
      const isAdmin = exportKey === './strapi-admin';
      const name = exportKey.replace(/^\.\//, '').replace(/^strapi-/, '');

      bundles.push({
        type: isAdmin ? 'admin' : name,
        source: typedExp.source,
        output: {
          cjs: typedExp.require,
          esm: typedExp.import,
          types: typedExp.types,
        },
        tsconfig: typedExp.types ? `./${name}/tsconfig.build.json` : undefined,
      });
    }
  }

  // Build each bundle sequentially (admin first, then server)
  for (const bundle of bundles) {
    if (!silent) {
      logger.info(`Building ${bundle.type} bundle...`);
    }

    const config = await createViteConfig({
      cwd,
      bundle,
      minify,
      sourcemap,
      silent,
    });

    await viteBuild(config);

    if (!silent) {
      logger.info(`${bundle.type} bundle built successfully`);
    }
  }

  if (!silent) {
    logger.info('Build complete!');
  }
}
