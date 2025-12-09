import path from 'node:path';

import { generateFiles } from './file-generator';
import { writeFiles } from './file-writer';
import { parseGitConfig } from './git-config';
import { runPrompts } from './prompts';

import type { InitOptions, PromptAnswer } from './types';

/**
 * Initialize a new Strapi plugin.
 *
 * @param options - Init options including cwd, path, silent, debug, logger
 * @returns Array of prompt answers for use by calling code
 */
export const init = async (options: InitOptions): Promise<PromptAnswer[]> => {
  const { cwd, path: packagePath, silent, debug, logger } = options;

  // Determine the package folder name from the path
  const packageFolder = path.parse(packagePath).base;

  if (!packageFolder) {
    throw new Error('Missing package path');
  }

  if (debug) {
    logger.debug('Initializing plugin with native implementation');
    logger.debug(`  cwd: ${cwd}`);
    logger.debug(`  path: ${packagePath}`);
    logger.debug(`  packageFolder: ${packageFolder}`);
  }

  // Parse git config for author defaults
  const gitConfig = await parseGitConfig();

  if (debug && gitConfig?.user) {
    logger.debug(`  git user.name: ${gitConfig.user.name ?? '(not set)'}`);
    logger.debug(`  git user.email: ${gitConfig.user.email ?? '(not set)'}`);
  }

  // Run prompts to gather configuration
  const answers = await runPrompts(packageFolder, gitConfig, silent ?? false);

  if (debug) {
    logger.debug('Prompt answers:');
    for (const ans of answers) {
      if (!ans.name.startsWith('_')) {
        logger.debug(`  ${ans.name}: ${ans.answer}`);
      }
    }
  }

  // Generate files based on answers
  const files = await generateFiles(answers, packageFolder, logger);

  if (debug) {
    logger.debug(`Generated ${files.length} files`);
  }

  // Write files to disk
  const fullPath = path.resolve(cwd, packagePath);
  await writeFiles(fullPath, files, logger);

  if (!silent) {
    logger.info(`Plugin scaffolded at ${fullPath}`);
  }

  return answers;
};
