/**
 * Build orchestrator for Strapi plugins.
 */
import fs from 'node:fs';
import path from 'node:path';

import { filterExports, toBundleRuntime, toSourceDirName } from '../bundles';

import { createViteConfig } from './vite-config';

import type { BundleRuntime } from '../bundles';
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
  bundles?: string[];
}

export interface BundleConfig {
  name: string;
  runtime: BundleRuntime;
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
  const { loadChalk } = await import('../chalk-loader');
  await loadChalk();

  const {
    cwd,
    logger,
    minify = false,
    sourcemap = false,
    silent = false,
    bundles: requestedBundles,
  } = options;

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

  const exports = requestedBundles
    ? filterExports(pkgJson.exports, requestedBundles)
    : pkgJson.exports;

  const bundles: BundleConfig[] = [];

  // Iterate all object-type exports
  for (const [exportKey, exp] of Object.entries(exports)) {
    if (typeof exp !== 'string') {
      const typedExp = exp as Export;

      bundles.push({
        name: exportKey,
        runtime: toBundleRuntime(exportKey),
        source: typedExp.source,
        output: {
          cjs: typedExp.require,
          esm: typedExp.import,
          types: typedExp.types,
        },
        tsconfig: typedExp.types
          ? `./${toSourceDirName(exportKey)}/tsconfig.build.json`
          : undefined,
      });
    }
  }

  // Build each bundle sequentially (admin first, then server)
  for (const bundle of bundles) {
    if (!silent) {
      logger.info(`Building ${bundle.name} bundle...`);
    }

    const config = await createViteConfig({
      cwd,
      bundle,
      minify,
      sourcemap,
      silent,
    });

    const { build: viteBuild } = await import('vite');
    await viteBuild(config);

    if (!silent) {
      logger.info(`${bundle.name} bundle built successfully`);
    }
  }

  if (!silent) {
    logger.info('Build complete!');
  }
}
