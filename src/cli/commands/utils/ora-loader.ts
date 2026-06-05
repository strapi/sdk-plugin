import { importEsm, resolveDefaultExport } from './esm-interop';

interface OraOptions {
  text?: string;
}

interface OraSpinner {
  text: string;
  start: (text?: string) => OraSpinner;
  succeed: (text?: string) => OraSpinner;
  fail: (text?: string) => OraSpinner;
}

type OraFactory = (options?: string | OraOptions) => OraSpinner;

export const loadOra = async (): Promise<OraFactory> => {
  const mod = await importEsm('ora');

  return resolveDefaultExport<OraFactory>(mod);
};
