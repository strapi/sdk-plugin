import gitUrlParse from 'git-url-parse';
import prompts from 'prompts';

import type { GitConfig, PromptAnswer } from './types';

const PACKAGE_NAME_REGEXP = /^(?:@(?:[a-z0-9-*~][a-z0-9-*._~]*)\/)?[a-z0-9-~][a-z0-9-._~]*$/i;
const PLUGIN_ID_REGEXP = /^[a-z0-9][a-z0-9-_]*$/;

interface RepoInfo {
  source?: string;
  owner?: string;
  name?: string;
}

/**
 * Run interactive prompts to gather plugin configuration.
 * Returns array of PromptAnswer objects.
 */
export const runPrompts = async (
  suggestedPackageName: string,
  gitConfig: GitConfig | null,
  silent: boolean
): Promise<PromptAnswer[]> => {
  if (silent) {
    return getDefaultAnswers(suggestedPackageName, gitConfig);
  }

  let repo: RepoInfo = {};

  // Package options - interactive prompts
  const packageOptions = await prompts(
    [
      {
        type: 'text',
        name: 'pkgName',
        message: 'plugin name',
        initial: suggestedPackageName,
        validate(val: string) {
          if (!val) {
            return 'package name is required';
          }
          if (!PACKAGE_NAME_REGEXP.test(val)) {
            return 'invalid package name';
          }
          return true;
        },
      },
      {
        type: 'text',
        name: 'pluginId',
        message: 'plugin id (used by Strapi)',
        initial: suggestedPackageName,
        validate(val: string) {
          if (!val) {
            return 'plugin id is required';
          }
          if (!PLUGIN_ID_REGEXP.test(val)) {
            return 'plugin id must match /^[a-z0-9][a-z0-9-_]*$/';
          }
          return true;
        },
      },
      {
        type: 'text',
        name: 'displayName',
        message: 'plugin display name',
      },
      {
        type: 'text',
        name: 'description',
        message: 'plugin description',
      },
      {
        type: 'text',
        name: 'authorName',
        message: 'plugin author name',
        initial: gitConfig?.user?.name ?? '',
      },
      {
        type: 'text',
        name: 'authorEmail',
        message: 'plugin author email',
        initial: gitConfig?.user?.email ?? '',
      },
      {
        type: 'text',
        name: 'repo',
        message: 'git url',
        validate(val: string) {
          if (!val) {
            return true;
          }
          try {
            const result = gitUrlParse(val);
            repo = { source: result.source, owner: result.owner, name: result.name };
            return true;
          } catch {
            return 'invalid git url';
          }
        },
      },
      {
        type: 'text',
        name: 'license',
        message: 'plugin license',
        initial: 'MIT',
        validate(val: string) {
          if (!val) {
            return 'license is required';
          }
          return true;
        },
      },
      {
        type: 'confirm',
        name: 'client-code',
        message: 'register with the admin panel?',
        initial: true,
      },
      {
        type: 'confirm',
        name: 'server-code',
        message: 'register with the server?',
        initial: true,
      },
    ],
    {
      onCancel() {
        process.exit(1);
      },
    }
  );

  // Feature toggles - optional features
  const features = await prompts(
    [
      {
        type: 'confirm',
        name: 'editorconfig',
        message: 'Add .editorconfig?',
        initial: true,
      },
      {
        type: 'confirm',
        name: 'eslint',
        message: 'Add ESLint configuration?',
        initial: true,
      },
      {
        type: 'confirm',
        name: 'prettier',
        message: 'Add Prettier configuration?',
        initial: true,
      },
      {
        type: 'confirm',
        name: 'typescript',
        message: 'Use TypeScript?',
        initial: true,
      },
    ],
    {
      onCancel() {
        process.exit(1);
      },
    }
  );

  // Convert to PromptAnswer format
  const answers: PromptAnswer[] = [];

  // Add package options
  for (const [name, answer] of Object.entries(packageOptions)) {
    answers.push({ name, answer: answer as string | boolean });
  }

  // Add features
  for (const [name, answer] of Object.entries(features)) {
    answers.push({ name, answer: answer as boolean });
  }

  if (repo.source) {
    answers.push({ name: '_repoSource', answer: repo.source });
    answers.push({ name: '_repoOwner', answer: repo.owner ?? '' });
    answers.push({ name: '_repoName', answer: repo.name ?? '' });
  }

  return answers;
};

/**
 * Generate default answers for silent mode (no user interaction)
 */
const getDefaultAnswers = (
  suggestedPackageName: string,
  gitConfig: GitConfig | null
): PromptAnswer[] => {
  return [
    { name: 'pkgName', answer: suggestedPackageName },
    { name: 'pluginId', answer: suggestedPackageName },
    { name: 'displayName', answer: '' },
    { name: 'description', answer: '' },
    { name: 'authorName', answer: gitConfig?.user?.name ?? '' },
    { name: 'authorEmail', answer: gitConfig?.user?.email ?? '' },
    { name: 'repo', answer: '' },
    { name: 'license', answer: 'MIT' },
    { name: 'client-code', answer: true },
    { name: 'server-code', answer: true },
    { name: 'editorconfig', answer: true },
    { name: 'eslint', answer: true },
    { name: 'prettier', answer: true },
    { name: 'typescript', answer: true },
  ];
};
