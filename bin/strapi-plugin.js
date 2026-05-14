#!/usr/bin/env node
/**
 * Load the ESM CLI so Vite is resolved via its ESM entry (avoids deprecated CJS Node API).
 * @see https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated
 */
import('../dist/cli.mjs')
  .then(({ runCLI }) => runCLI(process.argv))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
