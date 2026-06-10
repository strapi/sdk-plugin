import { commands as strapiCommands } from './cli/commands';
import { loadChalk } from './cli/commands/utils/chalk-loader';
import { createCommandInstance, loadCommander } from './cli/commands/utils/commander-loader';
import { createLogger } from './cli/commands/utils/logger';
import { loadTsConfig } from './cli/commands/utils/tsconfig';

import type { CLIContext } from './types';
import type { Command } from 'commander';

const createCLI = async (argv: string[], command?: Command) => {
  await loadCommander();
  await loadChalk();

  const program = command ?? createCommandInstance();

  // Initial program setup
  program.storeOptionsAsProperties(false).allowUnknownOption(true);

  // Help command
  program.helpOption('-h, --help', 'Display help for command');
  program.helpCommand('help [command]', 'Display help for command');

  program.version(
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
      const subCommand = commandFactory({ command: program, argv, ctx });

      // Add this command to the Commander command object
      if (subCommand) {
        program.addCommand(subCommand);
      }
    } catch (e) {
      logger.error('Failed to load command', e);
    }
  });

  return program;
};

const runCLI = async (argv = process.argv, command?: Command) => {
  const commands = await createCLI(argv, command);
  await commands.parseAsync(argv);
};

export { runCLI, createCLI };
