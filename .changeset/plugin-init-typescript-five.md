---
'@strapi/sdk-plugin': patch
---

Pin generated plugin devDependencies `typescript` and `@strapi/typescript-utils` to `^5` so install succeeds with Strapi 5 (avoids resolving TypeScript 6, which conflicts with `react-intl@6` peerOptional range).
