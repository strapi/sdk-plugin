import fs from 'node:fs';
import { isBuiltin as isNodeBuiltin } from 'node:module';
import path from 'node:path';

import { resolveDefaultExport } from '../esm-interop';

import { loadReactPlugins } from './react-plugin-loader';

import type { BundleConfig } from './index';
import type { InlineConfig, Plugin } from 'vite';
import type dtsPlugin from 'vite-plugin-dts';

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
      if (isNodeBuiltin(source)) {
        return { id: source, external: true };
      }
      return null;
    },
  };
}

/**
 * Create Vite configuration for building a plugin bundle.
 */
export async function createViteConfig(options: ViteConfigOptions): Promise<InlineConfig> {
  const { cwd, bundle, minify = false, sourcemap = false, silent = false, target } = options;

  const externals = getExternals(cwd);
  const isAdmin = bundle.type === 'admin';

  // Determine output directory from whichever output is specified
  const outputPath = bundle.output.cjs ?? bundle.output.esm;
  if (!outputPath) {
    throw new Error(`Bundle ${bundle.type} has no output paths specified`);
  }
  const outDir = path.dirname(outputPath);

  // Entry file absolute path
  const entry = path.resolve(cwd, bundle.source);

  const plugins: Plugin[] = [externalizeDepsPlugin(externals)];

  // Add React plugin for admin builds
  if (isAdmin) {
    const reactPlugins = await loadReactPlugins();

    for (const plugin of reactPlugins) {
      plugins.unshift(plugin);
    }
  }

  // Add TypeScript declarations plugin if types are expected
  if (bundle.output.types) {
    // Find an appropriate tsconfig: try per-bundle first, then fall back to root-level configs
    let tsconfigPath: string | undefined;

    if (bundle.tsconfig) {
      const candidate = path.resolve(cwd, bundle.tsconfig);
      if (fs.existsSync(candidate)) {
        tsconfigPath = candidate;
      }
    }

    if (!tsconfigPath) {
      const sourceDir = path.resolve(cwd, path.dirname(bundle.source));
      let searchDir = sourceDir;

      while (searchDir.startsWith(cwd)) {
        for (const name of ['tsconfig.build.json', 'tsconfig.json']) {
          const candidate = path.join(searchDir, name);
          if (fs.existsSync(candidate)) {
            tsconfigPath = candidate;
            break;
          }
        }
        if (tsconfigPath) {
          break;
        }

        const parent = path.dirname(searchDir);

        if (parent === searchDir) {
          break;
        }

        searchDir = parent;
      }
    }

    if (tsconfigPath) {
      const dtsMod = await import('vite-plugin-dts');
      const dts = resolveDefaultExport<typeof dtsPlugin>(dtsMod);

      // Output types to the correct location
      // Expected: dist/admin/src/index.d.ts or dist/server/src/index.d.ts
      const typesDir = path.dirname(bundle.output.types); // e.g., ./dist/admin/src

      plugins.push(
        dts({
          tsconfigPath,
          outDir: typesDir,
          // Only emit declarations for the entry file
          include: [path.join(path.dirname(bundle.source), '**/*')],
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
        formats: [
          ...(bundle.output.esm ? (['es'] as const) : []),
          ...(bundle.output.cjs ? (['cjs'] as const) : []),
        ],
        fileName: (format) => (format === 'es' ? 'index.mjs' : 'index.js'),
      },
      rollupOptions: {
        external(id) {
          // Externalize dependencies
          if (externals.some((ext) => id === ext || id.startsWith(`${ext}/`))) {
            return true;
          }
          // Externalize node built-ins
          if (isNodeBuiltin(id)) {
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
