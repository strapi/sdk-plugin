/**
 * Can this be imported from the package...?
 */
import { defineConfig } from '@strapi/pack-up';

export default defineConfig({
  bundles: [
    {
      source: './src/index.ts',
      require: './dist/cli.js',
    },
  ],
  exports: {},
  dist: 'dist',
  runtime: 'node',
  minify: false,
  sourcemap: true,
});
