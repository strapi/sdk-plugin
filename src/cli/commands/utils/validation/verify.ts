/**
 * Main validation runner for the `verify` command.
 *
 * Checks performed:
 * 1. package.json exists and has valid structure
 * 2. Has ./strapi-admin and/or ./strapi-server exports
 * 3. Export properties are in correct order (types first)
 * 4. All exported files exist in dist/
 */
import ora from 'ora';
import os from 'os';

import { validateExportsOrdering } from './exports-validator';
import { checkExportFiles } from './file-checker';
import { loadPkg, validatePkg } from './pkg-loader';

import type { Logger } from './pkg-loader';

export interface VerifyOptions {
  cwd: string;
  logger: Logger;
}

/**
 * Main verify function that validates package.json and export files
 */
export const verify = async ({ cwd, logger }: VerifyOptions) => {
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
   * Validate plugin exports are present (admin and/or server).
   *
   * This matches the build/watch commands which require at least one of these exports.
   */
  if (!validatedPkg.exports?.['./strapi-admin'] && !validatedPkg.exports?.['./strapi-server']) {
    packageJsonLoader.fail();
    throw new Error(
      'You need to have either a strapi-admin or strapi-server export in your package.json'
    );
  }

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
