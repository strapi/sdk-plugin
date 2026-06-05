import { importEsm, resolveDefaultExport } from '../esm-interop';

import type { Plugin } from 'vite';

type ReactPluginFactory = (options?: unknown) => Plugin | Plugin[];

export const loadReactPlugins = async (): Promise<Plugin[]> => {
  const mod = await importEsm('@vitejs/plugin-react');
  const reactPlugin = resolveDefaultExport<ReactPluginFactory>(mod);
  const result = reactPlugin();
  const plugins = Array.isArray(result) ? result : [result];

  return plugins.filter(Boolean) as Plugin[];
};
