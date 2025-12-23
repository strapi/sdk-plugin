import boxen from 'boxen';
import chalk from 'chalk';

import {
  dirContainsStrapiProject,
  getPkgManager,
  logInstructions,
  runBuild,
  runInstall,
} from '../../utils/helpers';

import type { CLIContext, CommonCLIOptions } from '../../../../types';

export default async (
  packagePath: string,
  { silent, debug, useNpm, usePnpm, useYarn, install }: CommonCLIOptions,
  { logger, cwd }: CLIContext
) => {
  try {
    const isStrapiProject = dirContainsStrapiProject(cwd);

    // If the user entered a path, we will try to parse the plugin name from it so we can provide it
    // as a suggestion for consistency.
    const isPathPackageName = !packagePath.includes('/');

    const pluginPath =
      isStrapiProject && isPathPackageName ? `./src/plugins/${packagePath}` : packagePath;

    const { init } = await import('../../utils/init');
    const answers = await init({
      cwd,
      path: pluginPath,
      silent,
      debug,
      logger,
    });

    const packageManager = getPkgManager(
      {
        useNpm,
        usePnpm,
        useYarn,
      },
      isStrapiProject
    );

    if (install) {
      await runInstall(packageManager, pluginPath);
      await runBuild(packageManager, pluginPath);
    }

    if (isStrapiProject) {
      const pluginId = answers.find((option) => option.name === 'pluginId')?.answer;
      const language = answers.find((option) => option.name === 'typescript')?.answer ? 'ts' : 'js';

      if (typeof pluginId === 'string' && ['ts', 'js'].includes(language)) {
        logger.info(logInstructions(pluginId, { language, path: pluginPath }));
      }
    }

    logger.info('Plugin generated successfully.');
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
