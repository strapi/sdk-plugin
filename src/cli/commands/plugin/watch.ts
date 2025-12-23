import boxen from 'boxen';
import chalk from 'chalk';
import { createCommand } from 'commander';

import { runAction } from '../utils/helpers';

import type { StrapiCommand, CLIContext } from '../../../types';

interface WatchActionOptions {
  debug?: boolean;
  silent?: boolean;
}

const action = async (opts: WatchActionOptions, _cmd: unknown, { cwd, logger }: CLIContext) => {
  try {
    const { watch } = await import('../utils/build/watch');
    await watch({
      cwd,
      logger,
      silent: opts.silent,
      debug: opts.debug,
    });
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
