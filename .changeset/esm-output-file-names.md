---
'@strapi/sdk-plugin': patch
---

Name build output files after the `import` / `require` paths in the package.json exports map instead of hardcoding `index.mjs` / `index.js`, so `"type": "module"` plugins can emit `.cjs` CommonJS and `.js` ESM. `./strapi-admin` and `./strapi-server` now need only one of `import` or `require`, which allows ESM-only plugins. The build warns when an output extension makes Node load it in the wrong module format.
