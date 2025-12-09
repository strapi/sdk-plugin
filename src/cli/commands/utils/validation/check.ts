import ora from 'ora';
import os from 'os';

import { validateExportsOrdering } from './exports-validator';
import { checkExportFiles } from './file-checker';
import { loadPkg, validatePkg } from './pkg-loader';

import type { Logger } from './pkg-loader';

export interface CheckOptions {
  cwd: string;
  logger: Logger;
}

/**
 * Main check function that validates package.json and export files
 */
export const check = async ({ cwd, logger }: CheckOptions) => {
  /**
   * Load the closest package.json and then verify the structure against what we expect.
   */
  const packageJsonLoader = ora(`Verifying package.json ${os.EOL}`).start();

  const rawPkg = await loadPkg({ cwd, logger }).catch((err) => {
    packageJsonLoader.fail();
    logger.error(err.message);
    logger.debug(`Path checked – ${cwd}`);
    throw err;
  });

  const validatedPkg = await validatePkg({
    pkg: rawPkg,
  }).catch((err) => {
    packageJsonLoader.fail();
    logger.error(err.message);
    throw err;
  });

  /**
   * Validate the exports of the package incl. the order of the
   * exports within the exports map if applicable
   */
  const packageJson = await validateExportsOrdering({ pkg: validatedPkg, logger }).catch((err) => {
    packageJsonLoader.fail();
    logger.error(err.message);
    throw err;
  });

  packageJsonLoader.succeed('Verified package.json');

  /**
   * Check that all exported files actually exist
   */
  if (packageJson.exports) {
    await checkExportFiles(packageJson.exports, cwd);
  }
};
