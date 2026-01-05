import fs from 'node:fs';
import path from 'node:path';

import type { BundleConfig } from './index';
import type { InlineConfig, Plugin } from 'vite';

export interface ViteConfigOptions {
  cwd: string;
  bundle: BundleConfig;
  minify?: boolean;
  sourcemap?: boolean;
  silent?: boolean;
  /** Build target. Defaults to 'es2020' for admin, 'node20' for server */
  target?: string;
}

/**
 * Get externalized dependencies from package.json.
 * Only dependencies and peerDependencies should be external.
 * devDependencies are BUNDLED (matches pack-up behavior).
 */
function getExternals(cwd: string): string[] {
  const pkgPath = path.join(cwd, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  const externals = new Set<string>();

  // Only externalize dependencies and peerDependencies
  // devDependencies are intentionally NOT included - they get bundled
  // This matches pack-up's default behavior
  if (pkg.dependencies) {
    Object.keys(pkg.dependencies).forEach((dep) => externals.add(dep));
  }
  if (pkg.peerDependencies) {
    Object.keys(pkg.peerDependencies).forEach((dep) => externals.add(dep));
  }

  return Array.from(externals);
}

/**
 * Plugin to externalize dependencies.
 * This ensures we don't bundle node_modules into the output.
 */
function externalizeDepsPlugin(externals: string[]): Plugin {
  return {
    name: 'externalize-deps',
    resolveId(source) {
      // Check if it's an external dependency (starts with a package name)
      if (externals.some((ext) => source === ext || source.startsWith(`${ext}/`))) {
        return { id: source, external: true };
      }
      // Also externalize node built-ins
      if (source.startsWith('node:') || isNodeBuiltin(source)) {
        return { id: source, external: true };
      }
      return null;
    },
  };
}

/**
 * Check if a module is a Node.js built-in.
 */
function isNodeBuiltin(id: string): boolean {
  const builtins = [
    'assert',
    'buffer',
    'child_process',
    'cluster',
    'crypto',
    'dgram',
    'dns',
    'events',
    'fs',
    'http',
    'https',
    'net',
    'os',
    'path',
    'perf_hooks',
    'process',
    'querystring',
    'readline',
    'stream',
    'string_decoder',
    'timers',
    'tls',
    'tty',
    'url',
    'util',
    'v8',
    'vm',
    'worker_threads',
    'zlib',
  ];
  return builtins.includes(id);
}

/**
 * Create Vite configuration for building a plugin bundle.
 */
export async function createViteConfig(options: ViteConfigOptions): Promise<InlineConfig> {
  const { cwd, bundle, minify = false, sourcemap = false, silent = false, target } = options;

  const externals = getExternals(cwd);
  const isAdmin = bundle.type === 'admin';

  // Determine output directory from the CJS output path
  // e.g., './dist/admin/index.js' -> 'dist/admin'
  const outDir = path.dirname(bundle.output.cjs);

  // Entry file absolute path
  const entry = path.resolve(cwd, bundle.source);

  const plugins: Plugin[] = [externalizeDepsPlugin(externals)];

  // Add React plugin for admin builds
  if (isAdmin) {
    // Dynamically import to avoid loading React plugin for server builds
    const { default: reactPlugin } = await import('@vitejs/plugin-react');
    const reactPluginResult = reactPlugin();
    const reactPlugins = Array.isArray(reactPluginResult) ? reactPluginResult : [reactPluginResult];

    for (const plugin of reactPlugins) {
      if (plugin) {
        plugins.unshift(plugin as Plugin);
      }
    }
  }

  // Add TypeScript declarations plugin if types are expected
  if (bundle.output.types && bundle.tsconfig) {
    const tsconfigPath = path.resolve(cwd, bundle.tsconfig);
    if (fs.existsSync(tsconfigPath)) {
      const { default: dts } = await import('vite-plugin-dts');

      // Output types to the correct location
      // Expected: dist/admin/src/index.d.ts or dist/server/src/index.d.ts
      const typesDir = path.dirname(bundle.output.types); // e.g., ./dist/admin/src

      plugins.push(
        dts({
          tsconfigPath,
          outDir: typesDir,
          // Only emit declarations for the entry file
          include: [bundle.source],
          // Don't bundle types into a single file
          rollupTypes: false,
          // Clean output to ensure consistent structure
          copyDtsFiles: false,
          // Set entryRoot to match source directory structure
          entryRoot: path.dirname(bundle.source),
        })
      );
    }
  }

  return {
    root: cwd,
    configFile: false,
    logLevel: silent ? 'silent' : 'info',
    plugins,
    build: {
      outDir,
      emptyOutDir: true,
      sourcemap,
      minify: minify ? 'esbuild' : false,
      lib: {
        entry,
        formats: ['es', 'cjs'],
        fileName: (format) => (format === 'es' ? 'index.mjs' : 'index.js'),
      },
      rollupOptions: {
        external(id) {
          // Externalize dependencies
          if (externals.some((ext) => id === ext || id.startsWith(`${ext}/`))) {
            return true;
          }
          // Externalize node built-ins
          if (id.startsWith('node:') || isNodeBuiltin(id)) {
            return true;
          }
          return false;
        },
        output: {
          // Ensure proper interop with CommonJS
          interop: 'auto',
          // Preserve export names
          exports: 'named',
        },
      },
      // Target appropriate platform
      target: target ?? (isAdmin ? 'es2020' : 'node20'),
      // CommonJS options for proper interop
      commonjsOptions: {
        include: [/node_modules/],
        extensions: ['.js', '.jsx', '.cjs'],
      },
    },
  };
}
