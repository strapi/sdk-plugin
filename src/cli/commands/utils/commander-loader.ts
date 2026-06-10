import type * as Commander from 'commander';

type CommanderModule = typeof Commander;
type Command = Commander.Command;

/**
 * Indirect dynamic import: keeps a native runtime `import()` that neither
 * @swc/jest nor rollup rewrites to `require()`. commander 15 is ESM-only, and
 * `require()`-ing it throws on Node < 24.9 (CJS bundle + Jest on Node 22).
 */
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const importEsm = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<CommanderModule & { default?: CommanderModule }>;

let commanderModule: CommanderModule | undefined;
let commanderPromise: Promise<CommanderModule> | undefined;

const resolveCommander = (
  candidate: CommanderModule & { default?: CommanderModule }
): CommanderModule => {
  if (typeof candidate?.createCommand === 'function') {
    return candidate;
  }

  // Jest/@swc interop: named exports can be re-wrapped under `default`.
  if (typeof candidate?.default?.createCommand === 'function') {
    return candidate.default;
  }

  throw new TypeError('Failed to load commander');
};

export const loadCommander = async (): Promise<CommanderModule> => {
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

export const getCommander = (): CommanderModule => {
  if (!commanderModule) {
    throw new Error(
      'commander has not been loaded; call loadCommander() before using getCommander()'
    );
  }

  return commanderModule;
};

export const createCommand = (name?: string): Command => getCommander().createCommand(name);

export const createCommandInstance = (name?: string): Command => {
  const { Command: CommanderCommand } = getCommander();

  return new CommanderCommand(name);
};
