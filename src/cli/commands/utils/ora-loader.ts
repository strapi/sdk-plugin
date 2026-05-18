import type { Ora, Options } from 'ora';

type OraFactory = (options?: string | Options) => Ora;

export const loadOra = async (): Promise<OraFactory> => {
  const mod = await import('ora');
  const candidate = mod.default;

  if (typeof candidate === 'function') {
    return candidate;
  }

  // Jest/@swc interop: default export is re-wrapped as { default, oraPromise, spinners }
  const nestedDefault =
    candidate && typeof candidate === 'object' && 'default' in candidate
      ? (candidate as { default: unknown }).default
      : undefined;

  if (typeof nestedDefault === 'function') {
    return nestedDefault as OraFactory;
  }

  throw new TypeError('Failed to load ora');
};
