import { createCommand } from '../../utils/commander-loader';
import { runAction } from '../../utils/helpers';
import { loadInquirer } from '../../utils/inquirer-loader';

import {
  apiAction,
  contentTypeAction,
  controllerAction,
  middlewareAction,
  policyAction,
  serviceAction,
} from './actions';

import type { CLIContext, StrapiCommand } from '../../../../types';

interface ActionOptions {
  debug?: boolean;
  silent?: boolean;
}

const GENERATORS = [
  { name: 'api', value: 'api' },
  { name: 'controller', value: 'controller' },
  { name: 'content-type', value: 'content-type' },
  { name: 'policy', value: 'policy' },
  { name: 'middleware', value: 'middleware' },
  { name: 'service', value: 'service' },
] as const;

type GeneratorType = (typeof GENERATORS)[number]['value'];

const action = async (
  generatorArg: GeneratorType | undefined,
  _opts: ActionOptions,
  _cmd: unknown,
  ctx: CLIContext
) => {
  let generator = generatorArg;

  if (!generator) {
    const inquirer = await loadInquirer();
    const inquirerOutput = await inquirer.prompt<{ generator: GeneratorType }>([
      {
        type: 'list',
        name: 'generator',
        message: 'Strapi Generators',
        choices: GENERATORS,
      },
    ]);

    generator = inquirerOutput.generator;
  }

  switch (generator) {
    case 'api':
      await apiAction({ ctx });
      break;
    case 'controller':
      await controllerAction({ ctx });
      break;
    case 'content-type':
      await contentTypeAction({ ctx });
      break;
    case 'policy':
      await policyAction({ ctx });
      break;
    case 'middleware':
      await middlewareAction({ ctx });
      break;
    case 'service':
      await serviceAction({ ctx });
      break;
    default:
      ctx.logger.error('Unknown generator type');
      process.exit(1);
  }
};

/**
 * `$ strapi-plugin generate`
 */
const command: StrapiCommand = async ({ ctx }) => {
  const generateCommand = await createCommand('generate');

  return generateCommand
    .description('Generate boilerplate code for a Strapi plugin')
    .argument(
      '[generator]',
      'Generator type (api, controller, content-type, policy, middleware, service)'
    )
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .action((...args) => runAction('generate', action)(ctx, ...args));
};

export { command };
