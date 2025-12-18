import boxen from 'boxen';
import chalk from 'chalk';
import { createCommand } from 'commander';

import { isLegacyEnabled } from '../utils/feature-flags';
import { runAction } from '../utils/helpers';

import type { CLIContext, StrapiCommand } from '../../../types';

interface BuildActionOptions {
  debug?: boolean;
  silent?: boolean;
  sourcemap?: boolean;
  minify?: boolean;
}

const action = async (opts: BuildActionOptions, _cmd: unknown, { logger, cwd }: CLIContext) => {
  try {
    /**
     * ALWAYS set production for using plugin build CLI.
     */
    process.env.NODE_ENV = 'production';

    // Check feature flag to determine which implementation to use
    if (isLegacyEnabled('useLegacyBuild')) {
      logger.debug('Using legacy pack-up build implementation (USE_LEGACY_PACKUP_BUILD=true)');

      const { build } = await import('@strapi/pack-up');
      const { resolveConfig } = await import('../utils/config');
      const { loadPkg, validatePkg } = await import('../utils/pkg');

      const pkg = await loadPkg({ cwd, logger });
      const pkgJson = await validatePkg({ pkg });

      if (!pkgJson.exports['./strapi-admin'] && !pkgJson.exports['./strapi-server']) {
        throw new Error(
          'You need to have either a strapi-admin or strapi-server export in your package.json'
        );
      }

      type ConfigBundle = {
        source: string;
        import?: string;
        require?: string;
        runtime: 'web' | 'node';
        types?: string;
        tsconfig?: string;
      };

      const bundles: ConfigBundle[] = [];

      if (pkgJson.exports['./strapi-admin']) {
        const exp = pkgJson.exports['./strapi-admin'] as {
          source: string;
          import?: string;
          require?: string;
          types?: string;
        };

        const bundle: ConfigBundle = {
          source: exp.source,
          import: exp.import,
          require: exp.require,
          runtime: 'web',
        };

        if (exp.types) {
          bundle.types = exp.types;
          bundle.tsconfig = './admin/tsconfig.build.json';
        }

        bundles.push(bundle);
      }

      if (pkgJson.exports['./strapi-server']) {
        const exp = pkgJson.exports['./strapi-server'] as {
          source: string;
          import?: string;
          require?: string;
          types?: string;
        };

        const bundle: ConfigBundle = {
          source: exp.source,
          import: exp.import,
          require: exp.require,
          runtime: 'node',
        };

        if (exp.types) {
          bundle.types = exp.types;
          bundle.tsconfig = './server/tsconfig.build.json';
        }

        bundles.push(bundle);
      }

      await build({
        cwd,
        configFile: false,
        config: resolveConfig({ cwd, bundles }),
        ...opts,
      });
    } else {
      logger.debug('Using Vite build implementation');

      const { build } = await import('../utils/build');
      await build({
        cwd,
        logger,
        minify: opts.minify,
        sourcemap: opts.sourcemap,
        silent: opts.silent,
        debug: opts.debug,
      });
    }
  } catch (err) {
    logger.error(
      'There seems to be an unexpected error, try again with --debug for more information \n'
    );
    if (err instanceof Error && err.stack) {
      logger.log(
        chalk.red(
          boxen(err.stack, {
            padding: 1,
            align: 'left',
          })
        )
      );
    }
    process.exit(1);
  }
};

/**
 * `$ strapi-plugin build`
 */
const command: StrapiCommand = ({ ctx }) => {
  return createCommand('build')
    .description('Bundle your strapi plugin for publishing.')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .option('--sourcemap', 'produce sourcemaps', false)
    .option('--minify', 'minify the output', false)
    .action((...args) => runAction('build', action)(ctx, ...args));
};

export { command };
