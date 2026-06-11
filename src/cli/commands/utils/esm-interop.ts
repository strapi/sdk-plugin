/**
 * Dynamic import that bypasses Jest's `import()` hook on Node < 24.9.
 * Jest 30 cannot load pure ESM packages via intercepted `import()` on those versions.
 */
export const importEsm = (specifier: string): Promise<Record<string, unknown>> =>
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- use Node's native importer
  new Function('specifier', 'return import(specifier)')(specifier);

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
