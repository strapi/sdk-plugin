---
"@strapi/sdk-plugin": major
---

chore: drop Node.js 20 support — require `>=22.12.0` (Node 20 reached EOL on 2026-04-30)

Also raise the SDK CLI Vite build target from `node20` to `node22`. Plugin server bundle defaults remain `node20` for Strapi apps that still run on Node 20.
