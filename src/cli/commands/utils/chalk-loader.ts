import type { ChalkInstance } from 'chalk';

let chalkInstance: ChalkInstance | undefined;
let chalkPromise: Promise<ChalkInstance> | undefined;

const createNoopChalk = (): ChalkInstance => {
  const format = (value: unknown) => String(value);
  const noop = Object.assign(format, {
    red: format,
    green: format,
    blue: format,
    cyan: format,
    yellow: format,
    magenta: format,
    gray: format,
    greenBright: format,
    magentaBright: format,
  });

  return noop as ChalkInstance;
};

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

  if (process.env.JEST_WORKER_ID !== undefined) {
    chalkInstance = createNoopChalk();

    return chalkInstance;
  }

  if (!chalkPromise) {
    chalkPromise = import('chalk').then((mod) => {
      chalkInstance = resolveChalk(mod.default);

      return chalkInstance;
    });
  }

  return chalkPromise;
};

export const getChalk = (): ChalkInstance => {
  if (!chalkInstance) {
    throw new Error('chalk has not been loaded; call loadChalk() before using getChalk()');
  }

  return chalkInstance;
};
