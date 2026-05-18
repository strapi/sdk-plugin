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

const importEsm = (specifier: string): Promise<{ default: unknown }> =>
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- Jest on Node 22 intercepts `import()`; use Node's native importer
  new Function('specifier', 'return import(specifier)')(specifier);

export const loadOra = async (): Promise<OraFactory> => {
  const mod = await importEsm('ora');
  const candidate = mod.default;

  if (typeof candidate === 'function') {
    return candidate as OraFactory;
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
