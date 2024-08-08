import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import type { CLIContext } from '../../../types';

export const runAction =
  (name: string, action: (...args: any[]) => Promise<void>) =>
  (ctx: CLIContext, ...args: unknown[]) => {
    const { logger } = ctx;
    Promise.resolve()
      .then(() => {
        return action(...args, ctx);
      })
      .catch((error) => {
        logger.error(error);
        process.exit(1);
      });
  };

export const dirContainsStrapiProject = (dir: string) => {
  try {
    const packageJsonPath = path.join(dir, 'package.json');
    const pkgJSON = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return Boolean(
      (pkgJSON.dependencies && pkgJSON.dependencies['@strapi/strapi']) ||
        (pkgJSON.devDependencies && pkgJSON.devDependencies['@strapi/strapi'])
    );
  } catch (err) {
    return false;
  }
};

export const logInstructions = (
  pluginName: string,
  { language, path: pluginPath }: { language: string; path?: string }
) => {
  const maxLength = `    resolve: './src/plugins/${pluginName}'`.length;
  const separator = Array(maxLength).fill('─').join('');

  const exportInstruction = language === 'js' ? 'module.exports =' : 'export default';

  return `
You can now enable your plugin by adding the following in ${chalk.yellow(
    `./config/plugins.${language}`
  )}
${separator}
${exportInstruction} {
  ${chalk.gray('// ...')}
  ${chalk.green(`'${pluginName}'`)}: {
    enabled: ${chalk.yellow(true)},
    resolve: '${chalk.yellow(pluginPath || `./src/plugins/${pluginName}`)}'
  },
  ${chalk.gray('// ...')}
}
${separator}
`;
};
