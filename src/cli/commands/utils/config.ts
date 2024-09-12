import type { ConfigBundle } from '@strapi/pack-up';

interface Options {
  cwd: string;
  bundles: ConfigBundle[];
}

export function resolveConfig(opts: Options) {
  const { cwd, bundles } = opts;

  return {
    unstable_viteConfig: {
      build: {
        commonjsOptions: {
          include: [/node_modules/, `${cwd}/**/*`],
          extensions: ['.js', '.jsx', '.cjs'],
        },
      },
    },
    bundles,
    dist: './dist',
    /**
     * ignore the exports map of a plugin, because we're streamlining the
     * process and ensuring the server package and admin package are built
     * with the correct runtime and their individual tsconfigs
     */
    exports: {},
  };
}
