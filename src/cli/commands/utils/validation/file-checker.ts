/**
 * Verifies that all files referenced in package.json exports actually exist.
 */
import chalk from 'chalk';
import fs from 'fs/promises';
import ora from 'ora';
import os from 'os';
import { resolve } from 'path';

import type { Export } from './types';

export const pathExists = async (path: string): Promise<boolean> => {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check that all export files exist
 * @param exports - The exports map from package.json
 * @param cwd - The current working directory
 * @returns Array of missing export paths
 */
export const checkExportFiles = async (
  exports: Record<string, Export | string>,
  cwd: string
): Promise<string[]> => {
  const missingExports: string[] = [];

  const checkingFilePathsLoader = ora('Checking files for exports').start();

  /**
   * Check that _every_ export option you've declared in your package.json is a real file.
   */
  for (const exp of Object.values(exports)) {
    // Skip string exports (like "./package.json": "./package.json")
    if (typeof exp === 'string') {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (exp.source && !(await pathExists(resolve(cwd, exp.source)))) {
      missingExports.push(exp.source);
    }

    if (exp.types && !(await pathExists(resolve(cwd, exp.types)))) {
      missingExports.push(exp.types);
    }

    if (exp.require && !(await pathExists(resolve(cwd, exp.require)))) {
      missingExports.push(exp.require);
    }

    if (exp.import && !(await pathExists(resolve(cwd, exp.import)))) {
      missingExports.push(exp.import);
    }

    if (exp.module && !(await pathExists(resolve(cwd, exp.module)))) {
      missingExports.push(exp.module);
    }

    if (exp.default && !(await pathExists(resolve(cwd, exp.default)))) {
      missingExports.push(exp.default);
    }

    if (exp.browser) {
      if (exp.browser.source && !(await pathExists(resolve(cwd, exp.browser.source)))) {
        missingExports.push(exp.browser.source);
      }

      if (exp.browser.import && !(await pathExists(resolve(cwd, exp.browser.import)))) {
        missingExports.push(exp.browser.import);
      }

      if (exp.browser.require && !(await pathExists(resolve(cwd, exp.browser.require)))) {
        missingExports.push(exp.browser.require);
      }
    }

    if (exp.node) {
      if (exp.node.source && !(await pathExists(resolve(cwd, exp.node.source)))) {
        missingExports.push(exp.node.source);
      }

      if (exp.node.import && !(await pathExists(resolve(cwd, exp.node.import)))) {
        missingExports.push(exp.node.import);
      }

      if (exp.node.require && !(await pathExists(resolve(cwd, exp.node.require)))) {
        missingExports.push(exp.node.require);
      }

      if (exp.node.module && !(await pathExists(resolve(cwd, exp.node.module)))) {
        missingExports.push(exp.node.module);
      }
    }
  }

  if (missingExports.length) {
    checkingFilePathsLoader.fail('');
    throw new Error(
      [
        'Missing files for exports:',
        ...missingExports.map((str) => `    ${chalk.blue(str)} -> ${resolve(cwd, str)}`),
      ].join(os.EOL)
    );
  }

  checkingFilePathsLoader.succeed('');

  return missingExports;
};
