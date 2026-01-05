import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

type PackageJsonLike = {
  dependencies?: Record<string, string>;
};

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
) as PackageJsonLike;

const externals = Object.keys(pkg.dependencies ?? {});
const builtins = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    target: 'node20',
    lib: {
      entry: './src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'cli.mjs' : 'cli.js'),
    },
    rollupOptions: {
      external(id) {
        if (builtins.has(id)) {
          return true;
        }

        return externals.some((ext) => id === ext || id.startsWith(`${ext}/`));
      },
      output: {
        exports: 'named',
      },
    },
  },
});
