---
"@strapi/sdk-plugin": minor
---

chore(deps): bump @vitejs/plugin-react from 4.7.0 to 5.2.0

fix: resolve ESM default exports for `@vitejs/plugin-react` and dynamic `import()` usage so admin plugin builds and unit tests load the React Vite plugin correctly

chore: raise minimum Node.js version to `^20.19.0 || >=22.12.0` to match `@vitejs/plugin-react@5` requirements
