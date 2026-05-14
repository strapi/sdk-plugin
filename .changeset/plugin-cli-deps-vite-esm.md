---
'@strapi/sdk-plugin': minor
---

Upgrade runtime dependencies (including Prettier 3 and newer Commander, `git-url-parse`, `get-latest-version`, and `concurrently`). Replace deprecated `pkg-up` with `package-up`. Load the CLI via the ESM bundle and dynamic `import('vite')` so `strapi-plugin build` / `watch` no longer hit Vite’s deprecated CJS Node API.

Scaffolded or formatted files from `init` may differ slightly from previous releases because of Prettier 3.
