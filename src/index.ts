import { Command } from 'commander';

import { commands as strapiCommands } from './cli/commands';
import { createLogger } from './cli/commands/utils/logger';
import { loadTsConfig } from './cli/commands/utils/tsconfig';

import type { CLIContext } from './types';

const createCLI = async (argv: string[], command = new Command()) => {
  // Initial program setup
  command.storeOptionsAsProperties(false).allowUnknownOption(true);

  // Help command
  command.helpOption('-h, --help', 'Display help for command');
  command.helpCommand('help [command]', 'Display help for command');

  command.version(
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../package.json').version,
    '-v, --version',
    'Output the version number'
  );

  const cwd = process.cwd();

  const hasDebug = argv.includes('--debug');
  const hasSilent = argv.includes('--silent');

  const logger = createLogger({ debug: hasDebug, silent: hasSilent, timestamp: false });

  const tsconfig = loadTsConfig({
    cwd,
    path: 'tsconfig.json',
    logger,
  });

  const ctx = {
    cwd,
    logger,
    tsconfig,
  } satisfies CLIContext;

  // Load all commands
  strapiCommands.forEach((commandFactory) => {
    try {
      const subCommand = commandFactory({ command, argv, ctx });

      // Add this command to the Commander command object
      if (subCommand) {
        command.addCommand(subCommand);
      }
    } catch (e) {
      logger.error('Failed to load command', e);
    }
  });

  return command;
};

const runCLI = async (argv = process.argv, command = new Command()) => {
  const commands = await createCLI(argv, command);
  await commands.parseAsync(argv);
};

export { runCLI, createCLI };
