import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import type { CLIContext, CommonCLIOptions } from '../../../types';

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
      pkgJSON.dependencies?.['@strapi/strapi'] || pkgJSON.devDependencies?.['@strapi/strapi']
    );
  } catch (err) {
    return false;
  }
};

export const getPkgManager = (options: CommonCLIOptions, isStrapi: boolean) => {
  // if we are in a strapi project we return it's package manager
  if (isStrapi) {
    // Check if each file exists
    const hasPackageLock = fs.existsSync(path.join(process.cwd(), 'package-lock.json'));
    const hasYarnLock = fs.existsSync(path.join(process.cwd(), 'yarn.lock'));
    const hasPnpmLock = fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'));

    if (hasPackageLock) {
      return 'npm';
    }
    if (hasYarnLock) {
      return 'yarn';
    }
    if (hasPnpmLock) {
      return 'pnpm';
    }
  }

  if (options.useNpm === true) {
    return 'npm';
  }

  if (options.usePnpm === true) {
    return 'pnpm';
  }

  if (options.useYarn === true) {
    return 'yarn';
  }

  const userAgent = process.env.npm_config_user_agent || '';

  if (userAgent.startsWith('yarn')) {
    return 'yarn';
  }

  if (userAgent.startsWith('pnpm')) {
    return 'pnpm';
  }

  return 'npm';
};

export const logInstructions = (
  pluginName: string,
  { language, path: pluginPath }: { language: string; path: string }
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
    resolve: '${chalk.yellow(pluginPath)}'
  },
  ${chalk.gray('// ...')}
}
${separator}
`;
};

export const runInstall = async (packageManager: 'yarn' | 'npm' | 'pnpm', pluginPath: string) => {
  const { execa: execaPkg } = await import('execa');

  const execa = execaPkg({
    cwd: pluginPath,
    verbose: 'full',
  });

  await execa`${packageManager} install`;
};

export const runBuild = async (packageManager: 'yarn' | 'npm' | 'pnpm', pluginPath: string) => {
  const { execa: execaPkg } = await import('execa');

  const execa = execaPkg({
    cwd: pluginPath,
    verbose: 'full',
  });

  if (packageManager === 'npm') {
    await execa`${packageManager} run build`;
    return;
  }
  await execa`${packageManager} build`;
};
