import { resolveDefaultExport } from './esm-interop';

import type { Ora, Options } from 'ora';

type OraFactory = (options?: string | Options) => Ora;

export const loadOra = async (): Promise<OraFactory> => {
  const mod = await import('ora');

  return resolveDefaultExport<OraFactory>(mod);
};
