import { check } from '@strapi/pack-up';
import boxen from 'boxen';
import chalk from 'chalk';

import { runAction } from '../utils/helpers';

import type { StrapiCommand, CLIContext } from '../../../types';
import type { CheckOptions } from '@strapi/pack-up';

type ActionOptions = CheckOptions;

const action = async (opts: ActionOptions, _cmd: unknown, { cwd, logger }: CLIContext) => {
  try {
    await check({
      cwd,
      ...opts,
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
 * `$ strapi-plugin verify`
 */
const command: StrapiCommand = ({ command: commanderCommand, ctx }) => {
  commanderCommand
    .command('verify')
    .description('Verify the output of your plugin before publishing it.')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .action((...args) => runAction('verify', action)(ctx, ...args));
};

export { command };
