import { importEsm } from './esm-interop';

import type * as Commander from 'commander';

type CommanderModule = typeof Commander;
type Command = Commander.Command;

let commanderModule: CommanderModule | undefined;
let commanderPromise: Promise<CommanderModule> | undefined;

const resolveCommander = (mod: Record<string, unknown>): CommanderModule => {
  const candidate = mod as Partial<CommanderModule> & { default?: Partial<CommanderModule> };

  if (typeof candidate.createCommand === 'function') {
    return candidate as CommanderModule;
  }

  // Jest/@swc interop: named exports can be re-wrapped under `default`.
  if (typeof candidate.default?.createCommand === 'function') {
    return candidate.default as CommanderModule;
  }

  throw new TypeError('Failed to load commander');
};

export const getCommander = async (): Promise<CommanderModule> => {
  if (commanderModule) {
    return commanderModule;
  }

  if (!commanderPromise) {
    commanderPromise = importEsm('commander').then((mod) => {
      commanderModule = resolveCommander(mod);

      return commanderModule;
    });
  }

  return commanderPromise;
};

export const createCommand = async (name?: string): Promise<Command> => {
  const commander = await getCommander();

  return commander.createCommand(name);
};

export const createCommandInstance = async (name?: string): Promise<Command> => {
  const { Command: CommanderCommand } = await getCommander();

  return new CommanderCommand(name);
};
