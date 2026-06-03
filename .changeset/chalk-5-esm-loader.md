---
"@strapi/sdk-plugin": patch
---

Bump chalk from 4.1.2 to 5.6.2 and load it via a dynamic-import loader so the CJS `strapi-plugin` CLI entrypoint keeps working with ESM-only chalk 5.
