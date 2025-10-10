import { generate } from '@strapi/generators';
import validateInput from '@strapi/generators/dist/plops/utils/validate-input';
import inquirer from 'inquirer';

import { loadPkg, validatePkg } from '../../../utils/pkg';

import type { CLIContext } from '../../../../../types';

/**
 * api generator for Strapi plugins
 */
const action = async ({ ctx: { cwd, logger } }: { ctx: CLIContext }) => {
  const pkg = await loadPkg({ cwd, logger });
  const validatedPkg = await validatePkg({ pkg });

  const config = await inquirer.prompt([
    {
      type: 'input',
      name: 'id',
      message: 'API name',
      validate: (input) => validateInput(input),
    },
  ]);

  generate(
    'api',
    {
      id: config.id,
      isPluginApi: true,
      destination: 'root',
      plugin: validatedPkg.strapi.name,
    },
    { dir: 'server' }
  );
};

export default action;
