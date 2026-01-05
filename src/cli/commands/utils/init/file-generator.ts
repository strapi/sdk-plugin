import { outdent } from 'outdent';

import { gitIgnoreFile } from '../../plugin/init/files/gitIgnore';

import { isRecord, resolveLatestVersionOfDeps } from './shared';

import type { Logger } from '../logger';
import type { PluginPackageJson } from './shared';
import type { PromptAnswer, TemplateFile } from './types';

/**
 * Generate all files for a new plugin based on prompt answers.
 * This is a port of the getFiles logic from action.ts.
 */
export const generateFiles = async (
  answers: PromptAnswer[],
  packageFolder: string,
  logger: Logger
): Promise<TemplateFile[]> => {
  const author: string[] = [];
  const files: TemplateFile[] = [];

  const pluginIdAnswer = answers.find((a) => a.name === 'pluginId')?.answer;
  const pluginId =
    typeof pluginIdAnswer === 'string' && pluginIdAnswer ? pluginIdAnswer : packageFolder;

  // Extract repo info from hidden answers
  const repoSource = answers.find((a) => a.name === '_repoSource')?.answer as string | undefined;
  const repoOwner = answers.find((a) => a.name === '_repoOwner')?.answer as string | undefined;
  const repoName = answers.find((a) => a.name === '_repoName')?.answer as string | undefined;
  const repo = repoSource ? { source: repoSource, owner: repoOwner, name: repoName } : undefined;

  // Base package.json
  const pkgJson: PluginPackageJson = {
    version: '0.0.0',
    keywords: [],
    type: 'commonjs',
    exports: {
      './package.json': './package.json',
    },
    files: ['dist'],
    scripts: {
      build: 'strapi-plugin build',
      watch: 'strapi-plugin watch',
      'watch:link': 'strapi-plugin watch:link',
      verify: 'strapi-plugin verify',
    },
    dependencies: {},
    devDependencies: {
      '@strapi/strapi': '*',
      '@strapi/sdk-plugin': '*',
      prettier: '*',
    },
    peerDependencies: {
      '@strapi/strapi': '^5.0.0',
      '@strapi/sdk-plugin': '^6.0.0',
    },
    strapi: {
      kind: 'plugin',
    },
  };

  // Process answers
  for (const ans of answers) {
    const { name, answer } = ans;

    switch (name) {
      case 'pkgName': {
        pkgJson.name = String(answer);
        break;
      }
      case 'pluginId': {
        pkgJson.strapi.name = String(answer);
        break;
      }
      case 'description': {
        pkgJson.description = String(answer);
        pkgJson.strapi.description = String(answer);
        break;
      }
      case 'displayName': {
        pkgJson.strapi.displayName = String(answer);
        break;
      }
      case 'authorName': {
        author.push(String(answer));
        break;
      }
      case 'authorEmail': {
        if (answer) {
          author.push(`<${answer}>`);
        }
        break;
      }
      case 'license': {
        pkgJson.license = String(answer);
        break;
      }
      case 'client-code': {
        if (answer) {
          pkgJson.exports['./strapi-admin'] = {
            source: './admin/src/index.js',
            import: './dist/admin/index.mjs',
            require: './dist/admin/index.js',
            default: './dist/admin/index.js',
          };

          pkgJson.peerDependencies = {
            ...pkgJson.peerDependencies,
            '@strapi/design-system': '*',
            '@strapi/icons': '*',
            'react-intl': '*',
          };

          pkgJson.devDependencies = {
            ...pkgJson.devDependencies,
            '@strapi/design-system': '*',
            '@strapi/icons': '*',
            'react-intl': '*',
            react: '^17.0.0 || ^18.0.0',
            'react-dom': '^17.0.0 || ^18.0.0',
            'react-router-dom': '^6.0.0',
            'styled-components': '^6.0.0',
          };

          pkgJson.peerDependencies = {
            ...pkgJson.peerDependencies,
            react: '^17.0.0 || ^18.0.0',
            'react-dom': '^17.0.0 || ^18.0.0',
            'react-router-dom': '^6.0.0',
            'styled-components': '^6.0.0',
          };
        }
        break;
      }
      case 'server-code': {
        if (answer) {
          pkgJson.exports['./strapi-server'] = {
            source: './server/src/index.js',
            import: './dist/server/index.mjs',
            require: './dist/server/index.js',
            default: './dist/server/index.js',
          };
        }
        break;
      }
      case 'typescript': {
        const isTypescript = Boolean(answer);

        if (isTypescript) {
          if (isRecord(pkgJson.exports['./strapi-admin'])) {
            pkgJson.exports['./strapi-admin'].source = './admin/src/index.ts';

            pkgJson.exports['./strapi-admin'] = {
              types: './dist/admin/src/index.d.ts',
              ...pkgJson.exports['./strapi-admin'],
            };

            pkgJson.scripts = {
              ...pkgJson.scripts,
              'test:ts:front': 'run -T tsc -p admin/tsconfig.json',
            };

            pkgJson.devDependencies = {
              ...pkgJson.devDependencies,
              '@types/react': '*',
              '@types/react-dom': '*',
            };

            const { adminTsconfigFiles } = await import('../../plugin/init/files/typescript');
            files.push(adminTsconfigFiles.tsconfigBuildFile, adminTsconfigFiles.tsconfigFile);
          }

          if (isRecord(pkgJson.exports['./strapi-server'])) {
            pkgJson.exports['./strapi-server'].source = './server/src/index.ts';

            pkgJson.exports['./strapi-server'] = {
              types: './dist/server/src/index.d.ts',
              ...pkgJson.exports['./strapi-server'],
            };

            pkgJson.scripts = {
              ...pkgJson.scripts,
              'test:ts:back': 'run -T tsc -p server/tsconfig.json',
            };

            const { serverTsconfigFiles } = await import('../../plugin/init/files/typescript');
            files.push(serverTsconfigFiles.tsconfigBuildFile, serverTsconfigFiles.tsconfigFile);
          }

          pkgJson.devDependencies = {
            ...pkgJson.devDependencies,
            '@strapi/typescript-utils': '*',
            typescript: '*',
          };
        } else {
          if (isRecord(pkgJson.exports['./strapi-admin'])) {
            const { adminJsConfigFile } = await import('../../plugin/init/files/javascript');
            files.push(adminJsConfigFile);
          }

          if (isRecord(pkgJson.exports['./strapi-server'])) {
            const { serverJsConfigFile } = await import('../../plugin/init/files/javascript');
            files.push(serverJsConfigFile);
          }
        }

        // Add source files regardless of TypeScript or JavaScript
        if (isRecord(pkgJson.exports['./strapi-admin'])) {
          files.push({
            name: isTypescript ? 'admin/src/pluginId.ts' : 'admin/src/pluginId.js',
            contents: outdent`
              export const PLUGIN_ID = '${pluginId}';
            `,
          });

          if (isTypescript) {
            const { adminTypescriptFiles } = await import('../../plugin/init/files/admin');
            files.push(...adminTypescriptFiles);
          } else {
            const { adminJavascriptFiles } = await import('../../plugin/init/files/admin');
            files.push(...adminJavascriptFiles);
          }
        }

        if (isRecord(pkgJson.exports['./strapi-server'])) {
          if (isTypescript) {
            const { serverTypescriptFiles } = await import('../../plugin/init/files/server');
            files.push(...serverTypescriptFiles(pluginId));
          } else {
            const { serverJavascriptFiles } = await import('../../plugin/init/files/server');
            files.push(...serverJavascriptFiles(pluginId));
          }
        }

        break;
      }
      case 'eslint': {
        if (answer) {
          const { eslintIgnoreFile } = await import('../../plugin/init/files/eslint');
          files.push(eslintIgnoreFile);
        }
        break;
      }
      case 'prettier': {
        if (answer) {
          const { prettierFile, prettierIgnoreFile } = await import(
            '../../plugin/init/files/prettier'
          );
          files.push(prettierFile, prettierIgnoreFile);
        }
        break;
      }
      case 'editorconfig': {
        if (answer) {
          const { editorConfigFile } = await import('../../plugin/init/files/editorConfig');
          files.push(editorConfigFile);
        }
        break;
      }
      default:
        break;
    }
  }

  // Ensure strapi.name is always set (plugin identifier used by Strapi)
  if (!pkgJson.strapi.name) {
    pkgJson.strapi.name = pluginId;
  }

  // Add repo info to package.json
  if (repo) {
    pkgJson.repository = {
      type: 'git',
      url: `git+ssh://git@${repo.source}/${repo.owner}/${repo.name}.git`,
    };
    pkgJson.bugs = {
      url: `https://${repo.source}/${repo.owner}/${repo.name}/issues`,
    };
    pkgJson.homepage = `https://${repo.source}/${repo.owner}/${repo.name}#readme`;
  }

  pkgJson.author = author.filter(Boolean).join(' ') ?? undefined;

  // Resolve latest versions of dependencies
  try {
    pkgJson.devDependencies = await resolveLatestVersionOfDeps(pkgJson.devDependencies);
    pkgJson.dependencies = await resolveLatestVersionOfDeps(pkgJson.dependencies);
    pkgJson.peerDependencies = await resolveLatestVersionOfDeps(pkgJson.peerDependencies);
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err.message);
    } else {
      logger.error(String(err));
    }
  }

  // Add package.json
  files.push({
    name: 'package.json',
    contents: outdent`
      ${JSON.stringify(pkgJson, null, 2)}
    `,
  });

  // Add README.md
  files.push({
    name: 'README.md',
    contents: outdent`
      # ${pkgJson.name}

      ${pkgJson.description ?? ''}
    `,
  });

  // Add .gitignore
  files.push(gitIgnoreFile);

  return files;
};
