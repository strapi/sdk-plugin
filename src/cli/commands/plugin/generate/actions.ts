import bootstrapApiPrompts from '@strapi/generators/dist/plops/prompts/bootstrap-api-prompts';
import ctNamesPrompts from '@strapi/generators/dist/plops/prompts/ct-names-prompts';
import getAttributesPrompts from '@strapi/generators/dist/plops/prompts/get-attributes-prompts';
import kindPrompts from '@strapi/generators/dist/plops/prompts/kind-prompts';
import validateInput from '@strapi/generators/dist/plops/utils/validate-input';

import { loadInquirer } from '../../utils/inquirer-loader';

import { runPluginGenerator } from './run-generator';

import type { CLIContext } from '../../../../types';
import type { QuestionCollection } from 'inquirer';

export const apiAction = async ({ ctx }: { ctx: CLIContext }) => {
  const inquirer = await loadInquirer();
  const config = await inquirer.prompt([
    {
      type: 'input',
      name: 'id',
      message: 'API name',
      validate: (input: string) => validateInput(input),
    },
  ]);

  await runPluginGenerator(ctx, 'api', {
    id: config.id,
    isPluginApi: true,
  });
};

export const controllerAction = async ({ ctx }: { ctx: CLIContext }) => {
  const inquirer = await loadInquirer();
  const config = await inquirer.prompt([
    {
      type: 'input',
      name: 'id',
      message: 'Controller name',
      validate: (input: string) => validateInput(input),
    },
  ]);

  await runPluginGenerator(ctx, 'controller', { id: config.id });
};

export const contentTypeAction = async ({ ctx }: { ctx: CLIContext }) => {
  const inquirer = await loadInquirer();
  const nameInfo = await inquirer.prompt([...ctNamesPrompts, ...kindPrompts] as QuestionCollection);
  const attributes = await getAttributesPrompts(inquirer);
  const bootstrapInfo = await inquirer.prompt([...bootstrapApiPrompts] as QuestionCollection);

  await runPluginGenerator(ctx, 'content-type', {
    kind: nameInfo.kind,
    singularName: nameInfo.singularName,
    id: nameInfo.singularName,
    pluralName: nameInfo.pluralName,
    displayName: nameInfo.displayName,
    bootstrapApi: bootstrapInfo.bootstrapApi,
    attributes,
  });
};

export const middlewareAction = async ({ ctx }: { ctx: CLIContext }) => {
  const inquirer = await loadInquirer();
  const config = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Middleware name',
      validate: (input: string) => validateInput(input),
    },
  ]);

  await runPluginGenerator(ctx, 'middleware', { name: config.name });
};

export const policyAction = async ({ ctx }: { ctx: CLIContext }) => {
  const inquirer = await loadInquirer();
  const config = await inquirer.prompt([
    {
      type: 'input',
      name: 'id',
      message: 'Policy name',
      validate: (input: string) => validateInput(input),
    },
  ]);

  await runPluginGenerator(ctx, 'policy', { id: config.id });
};

export const serviceAction = async ({ ctx }: { ctx: CLIContext }) => {
  const inquirer = await loadInquirer();
  const config = await inquirer.prompt([
    {
      type: 'input',
      name: 'id',
      message: 'Service name',
      validate: (input: string) => validateInput(input),
    },
  ]);

  await runPluginGenerator(ctx, 'service', { id: config.id });
};
