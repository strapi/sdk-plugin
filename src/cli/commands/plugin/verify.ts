import { createBundleOption } from '../utils/bundles';
import { formatBoxedErrorStack, runAction } from '../utils/helpers';

import type { StrapiCommand, CLIContext } from '../../../types';

interface ActionOptions {
  debug?: boolean;
  silent?: boolean;
  bundle?: string[];
}

const action = async (opts: ActionOptions, _cmd: unknown, { cwd, logger }: CLIContext) => {
  try {
    const { verify } = await import('../utils/validation');
    await verify({
      cwd,
      logger,
      bundles: opts.bundle,
    });
  } catch (err) {
    logger.error(
      'There seems to be an unexpected error, try again with --debug for more information \n'
    );
    if (err instanceof Error && err.stack) {
      logger.log(await formatBoxedErrorStack(err.stack));
    }
    process.exit(1);
  }
};

/**
 * `$ strapi-plugin verify`
 */
const command: StrapiCommand = async ({ command: commanderCommand, ctx }) => {
  commanderCommand
    .command('verify')
    .description('Verify the output of your plugin before publishing it.')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .addOption(await createBundleOption('verify'))
    .action((...args) => runAction('verify', action)(ctx, ...args));
};

export { command };
