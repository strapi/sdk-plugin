---
'@strapi/sdk-plugin': patch
---

fix type declarations not being generated for custom exports

Previously, only `./strapi-admin` and `./strapi-server` exports would produce `.d.ts` files when a `types` field was defined in `package.json`. Custom exports silently skipped type generation because no per-bundle tsconfig existed for them.

The build now falls back to the project root `tsconfig.build.json` or `tsconfig.json` when no per-bundle tsconfig is found, so any export with a `types` field will correctly emit type declarations.
