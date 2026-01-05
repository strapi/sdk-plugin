/**
 * Watch mode for Strapi plugin development.
 *
 * Uses Vite's built-in watch mode to rebuild on file changes.
 * Watches both admin and server bundles concurrently.
 */
import { build as viteBuild } from 'vite';

import { createViteConfig } from './vite-config';

import type { Logger } from '../logger';
import type { Export } from '../pkg';
import type { BundleConfig } from './index';

// Vite's build returns a RollupWatcher when watch mode is enabled
interface RollupWatcher {
  on(
    event: 'event',
    handler: (event: {
      code: string;
      duration?: number;
      error?: Error;
      result?: { close: () => void };
    }) => void
  ): void;
  close(): void;
}

export interface WatchOptions {
  cwd: string;
  logger: Logger;
  silent?: boolean;
  debug?: boolean;
}

/**
 * Watch and rebuild a Strapi plugin using Vite's watch mode.
 */
export async function watch(options: WatchOptions): Promise<void> {
  const { cwd, logger, silent = false } = options;

  if (!silent) {
    logger.info('Starting watch mode...');
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

  const watchers: RollupWatcher[] = [];

  // Start watching each bundle
  for (const bundle of bundles) {
    if (!silent) {
      logger.info(`Watching ${bundle.type} bundle...`);
    }

    const config = await createViteConfig({
      cwd,
      bundle,
      minify: false,
      sourcemap: true,
      silent,
    });

    // Enable watch mode
    config.build = {
      ...config.build,
      watch: {
        // Exclude node_modules and dist from watching
        exclude: ['node_modules/**', 'dist/**'],
      },
    };

    // Start the watcher
    const watcher = (await viteBuild(config)) as RollupWatcher;
    watchers.push(watcher);

    // Set up event handlers
    watcher.on('event', (event) => {
      if (event.code === 'BUNDLE_START') {
        if (!silent) {
          logger.info(`Rebuilding ${bundle.type}...`);
        }
      } else if (event.code === 'BUNDLE_END') {
        if (!silent) {
          logger.info(`${bundle.type} rebuilt in ${event.duration}ms`);
        }
        // Close the build result to free resources
        if (event.result) {
          event.result.close();
        }
      } else if (event.code === 'ERROR') {
        logger.error(`Error building ${bundle.type}:`, event.error?.message ?? 'Unknown error');
        if (event.result) {
          event.result.close();
        }
      }
    });
  }

  if (!silent) {
    logger.info('Watching for changes... Press Ctrl+C to stop.');
  }

  // Handle graceful shutdown
  const cleanup = () => {
    if (!silent) {
      logger.info('Stopping watch mode...');
    }
    for (const watcher of watchers) {
      watcher.close();
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Keep the process alive
  await new Promise(() => {
    // This promise never resolves - we wait for SIGINT/SIGTERM
  });
}
