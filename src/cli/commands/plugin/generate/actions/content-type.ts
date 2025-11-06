import { generate } from '@strapi/generators';
import bootstrapApiPrompts from '@strapi/generators/dist/plops/prompts/bootstrap-api-prompts';
import ctNamesPrompts from '@strapi/generators/dist/plops/prompts/ct-names-prompts';
import getAttributesPrompts from '@strapi/generators/dist/plops/prompts/get-attributes-prompts';
import kindPrompts from '@strapi/generators/dist/plops/prompts/kind-prompts';
import inquirer from 'inquirer';

import { loadPkg, validatePkg } from '../../../utils/pkg';

import type { CLIContext } from '../../../../../types';

/**
 * content-type generator for Strapi plugins
 */
const action = async ({ ctx: { cwd, logger } }: { ctx: CLIContext }) => {
  const pkg = await loadPkg({ cwd, logger });
  const validatedPkg = await validatePkg({ pkg });

  const nameInfo = await inquirer.prompt([...ctNamesPrompts, ...kindPrompts] as any);
  const attributes = await getAttributesPrompts(inquirer);
  const bootstrapInfo = await inquirer.prompt([...bootstrapApiPrompts] as any);

  await generate(
    'content-type',
    {
      kind: nameInfo.kind,
      singularName: nameInfo.singularName,
      id: nameInfo.singularName,
      pluralName: nameInfo.pluralName,
      displayName: nameInfo.displayName,
      destination: 'root',
      bootstrapApi: bootstrapInfo.bootstrapApi,
      attributes,
      plugin: validatedPkg.strapi.name,
    },
    { dir: 'server' }
  );
};

export default action;
