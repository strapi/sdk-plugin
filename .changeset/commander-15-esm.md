---
"@strapi/sdk-plugin": patch
---

chore(deps): bump commander from 14.0.3 to 15.0.0

fix: load ESM-only commander 15 via a dynamic `import()` so the CJS CLI bundle and Jest tests work across the Node 22/24/26 matrix
