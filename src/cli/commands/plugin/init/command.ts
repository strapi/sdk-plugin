import action from './action';

import type { StrapiCommand } from '../../../../types';

/**
 * `$ strapi-plugin init`
 */
const command: StrapiCommand = ({ command: commanderCommand, ctx }) => {
  commanderCommand
    .command('init')
    .description('Create a new plugin at a given path')
    .argument('path', 'path to the plugin')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .action((path, options) => {
      return action(path, options, ctx);
    });
};

export default command;
