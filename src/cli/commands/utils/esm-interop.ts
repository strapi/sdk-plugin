type EsmModule = Record<string, unknown>;

/**
 * Whether the running Node exposes the synchronous vm-module APIs Jest needs to
 * load a pure-ESM package through an intercepted `import()` (Node >= 24.9).
 */
const nodeHasSyncVmModules = (() => {
  const [major = 0, minor = 0] = process.versions.node.split('.').map(Number);

  return major > 24 || (major === 24 && minor >= 9);
})();

const underJest = process.env.JEST_WORKER_ID !== undefined;

/**
 * Native `import()` that survives transpilation. Both `@swc/jest` and the rollup
 * CJS bundle rewrite a literal `import()` to `require()`, and `require()`-ing a
 * pure-ESM package throws on Node < 24.9. Routing through `new Function` keeps a
 * real runtime `import()` the transpilers never see.
 */
// eslint-disable-next-line @typescript-eslint/no-implied-eval -- use Node's native importer
const nativeImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<EsmModule>;

/**
 * Dynamic import for ESM-only deps (commander, ora, chalk) that works in the CJS
 * CLI bundle and under Jest across the Node 22/24/26 CI matrix.
 *
 * Under Jest on Node >= 24.9 we use a plain `import()`: Jest intercepts it and
 * loads the module within the current test file's environment, so it is torn
 * down with that file. The `new Function` escape must NOT be used here — its
 * `import()` is bound to a realm Jest shares across the worker's test files, so
 * once the first file's environment is torn down every later file throws
 * "import after teardown".
 *
 * Everywhere else — the production CJS bundle, and Jest on Node < 24.9 where an
 * intercepted `import()` would fall back to an unsupported `require(ESM)` — we
 * use the native `import()` escape.
 */
export const importEsm = (specifier: string): Promise<EsmModule> => {
  if (underJest && nodeHasSyncVmModules) {
    return import(specifier);
  }

  return nativeImport(specifier);
};

/**
 * Resolve the callable default export from a dynamic `import()` under Jest/@swc.
 * Some ESM packages expose `export { fn as default, fn as "module.exports" }`; interop
 * may surface the factory on `module.exports` while `default` is a namespace object.
 */
export const resolveDefaultExport = <T>(mod: Record<string, unknown>): T => {
  const candidates = [mod.default, mod['module.exports']];

  for (const candidate of candidates) {
    if (typeof candidate === 'function') {
      return candidate as T;
    }

    if (candidate && typeof candidate === 'object' && 'default' in candidate) {
      const nested = (candidate as { default: unknown }).default;

      if (typeof nested === 'function') {
        return nested as T;
      }
    }
  }

  throw new TypeError('Failed to load default export');
};
