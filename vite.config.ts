import { readFileSync } from 'node:fs';
import { isBuiltin as isNodeBuiltin } from 'node:module';
import { defineConfig } from 'vite';

type PackageJsonLike = {
  dependencies?: Record<string, string>;
};

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
) as PackageJsonLike;

// commander 15 is ESM-only; bundle it so dist/cli.js stays require()-able on Node 22.
const externals = Object.keys(pkg.dependencies ?? {}).filter((dep) => dep !== 'commander');

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
        if (isNodeBuiltin(id)) {
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
