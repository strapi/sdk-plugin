import type { ChalkInstance } from 'chalk';

let chalkInstance: ChalkInstance | undefined;

const importEsm = (specifier: string): Promise<{ default: unknown }> =>
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- Jest on Node 22 intercepts `import()`; use Node's native importer
  new Function('specifier', 'return import(specifier)')(specifier);

const resolveChalk = (candidate: unknown): ChalkInstance => {
  if (typeof candidate === 'function') {
    return candidate as ChalkInstance;
  }

  // Jest/@swc interop: default export is re-wrapped as { default, ... }
  const nestedDefault =
    candidate && typeof candidate === 'object' && 'default' in candidate
      ? (candidate as { default: unknown }).default
      : undefined;

  if (typeof nestedDefault === 'function') {
    return nestedDefault as ChalkInstance;
  }

  throw new TypeError('Failed to load chalk');
};

export const loadChalk = async (): Promise<ChalkInstance> => {
  if (chalkInstance) {
    return chalkInstance;
  }

  const mod = await importEsm('chalk');
  chalkInstance = resolveChalk(mod.default);

  return chalkInstance;
};

export const getChalk = (): ChalkInstance => {
  if (!chalkInstance) {
    throw new Error('chalk has not been loaded; call loadChalk() before using getChalk()');
  }

  return chalkInstance;
};
