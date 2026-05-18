import { resolveDefaultExport } from './esm-interop';

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

const importEsm = (specifier: string): Promise<Record<string, unknown>> =>
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- Jest on Node 22 intercepts `import()`; use Node's native importer
  new Function('specifier', 'return import(specifier)')(specifier);

export const loadOra = async (): Promise<OraFactory> => {
  const mod = await importEsm('ora');

  return resolveDefaultExport<OraFactory>(mod);
};
