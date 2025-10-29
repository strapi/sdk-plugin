import inquirer from 'inquirer';

import { runAction } from '../../utils/helpers';

import apiAction from './actions/api';
import ctAction from './actions/content-type';
import controllerAction from './actions/controller';
import middlewareAction from './actions/middleware';
import policyAction from './actions/policy';
import serviceAction from './actions/service';

import type { CLIContext, StrapiCommand } from '../../../../types';

interface ActionOptions {}

const action = async (_opts: ActionOptions, _cmd: unknown, ctx: CLIContext) => {
  const options = [
    { name: 'api', value: 'api' },
    { name: 'controller', value: 'controller' },
    { name: 'content-type', value: 'content-type' },
    { name: 'policy', value: 'policy' },
    { name: 'middleware', value: 'middleware' },
    { name: 'service', value: 'service' },
  ];

  const { generator } = await inquirer.prompt([
    {
      type: 'list',
      name: 'generator',
      message: 'Strapi Generators',
      choices: options,
    },
  ]);

  switch (generator) {
    case 'api':
      apiAction({ ctx });
      break;
    case 'controller':
      controllerAction({ ctx });
      break;
    case 'content-type':
      ctAction({ ctx });
      break;
    case 'policy':
      policyAction({ ctx });
      break;
    case 'middleware':
      middlewareAction({ ctx });
      break;
    case 'service':
      serviceAction({ ctx });
      break;
    default:
      ctx.logger.error('Unknown generator type');
  }
};

/**
 * `$ strapi-plugin generate`
 */
const command: StrapiCommand = ({ command: commanderCommand, ctx }) => {
  commanderCommand
    .command('generate')
    .description('Generate some boilerplate code for a Strapi plugin')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .action((...args) => runAction('generate', action)(ctx, ...args));
};

export default command;
