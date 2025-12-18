import { build as viteBuild } from 'vite';

import { createViteConfig } from './vite-config';

import type { Logger } from '../logger';
import type { Export } from '../pkg';

export interface BuildOptions {
  cwd: string;
  logger: Logger;
  minify?: boolean;
  sourcemap?: boolean;
  silent?: boolean;
  debug?: boolean;
}

export interface BundleConfig {
  type: 'admin' | 'server';
  source: string;
  output: {
    cjs: string;
    esm: string;
    types?: string;
  };
  tsconfig?: string;
}

/**
 * Build a Strapi plugin using Vite.
 */
export async function build(options: BuildOptions): Promise<void> {
  const { cwd, logger, minify = false, sourcemap = false, silent = false } = options;

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

  // Configure admin bundle
  if (pkgJson.exports['./strapi-admin']) {
    const exp = pkgJson.exports['./strapi-admin'] as Export;
    bundles.push({
      type: 'admin',
      source: exp.source,
      output: {
        cjs: exp.require!,
        esm: exp.import!,
        types: exp.types,
      },
      tsconfig: exp.types ? './admin/tsconfig.build.json' : undefined,
    });
  }

  // Configure server bundle
  if (pkgJson.exports['./strapi-server']) {
    const exp = pkgJson.exports['./strapi-server'] as Export;
    bundles.push({
      type: 'server',
      source: exp.source,
      output: {
        cjs: exp.require!,
        esm: exp.import!,
        types: exp.types,
      },
      tsconfig: exp.types ? './server/tsconfig.build.json' : undefined,
    });
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
