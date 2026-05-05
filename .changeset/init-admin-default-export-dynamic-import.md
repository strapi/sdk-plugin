---
'@strapi/sdk-plugin': patch
---

Generated plugin admin templates now use default-export `App`, `Component: () => import('./pages/App')` (matching `addMenuLink` typings), and `permissions: []` on the JS admin entry for parity with TS.
