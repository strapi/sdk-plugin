import { generate } from '@strapi/generators';
import validateInput from '@strapi/generators/dist/plops/utils/validate-input';
import inquirer from 'inquirer';

import { loadPkg, validatePkg } from '../../../utils/pkg';

import type { CLIContext } from '../../../../../types';

/**
 * middleware generator for Strapi plugins
 */
const action = async ({ ctx: { cwd, logger } }: { ctx: CLIContext }) => {
  const pkg = await loadPkg({ cwd, logger });
  const validatedPkg = await validatePkg({ pkg });

  const config = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Middleware name',
      validate: (input) => validateInput(input),
    },
  ]);

  generate(
    'middleware',
    {
      name: config.name,
      destination: 'root',
      plugin: validatedPkg.strapi.name,
    },
    { dir: 'server' }
  );
};

export default action;
