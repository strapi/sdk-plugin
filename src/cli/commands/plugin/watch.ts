import boxen from 'boxen';
import chalk from 'chalk';
import { createCommand } from 'commander';

import { isLegacyEnabled } from '../utils/feature-flags';
import { runAction } from '../utils/helpers';

import type { StrapiCommand, CLIContext } from '../../../types';

interface WatchActionOptions {
  debug?: boolean;
  silent?: boolean;
}

const action = async (opts: WatchActionOptions, _cmd: unknown, { cwd, logger }: CLIContext) => {
  try {
    // Check feature flag to determine which implementation to use
    if (isLegacyEnabled('useLegacyWatch')) {
      logger.debug('Using legacy pack-up watch implementation (USE_LEGACY_PACKUP_WATCH=true)');

      const { watch } = await import('@strapi/pack-up');
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

      await watch({
        cwd,
        configFile: false,
        config: resolveConfig({ cwd, bundles }),
        ...opts,
      });
    } else {
      logger.debug('Using Vite watch implementation');

      const { watch } = await import('../utils/build/watch');
      await watch({
        cwd,
        logger,
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
 * `$ strapi-plugin watch`
 */
const command: StrapiCommand = ({ ctx }) => {
  return createCommand('watch')
    .description('Watch & compile your strapi plugin for local development.')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .action((...args) => runAction('watch', action)(ctx, ...args));
};

export { command };
