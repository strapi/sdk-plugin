---
"@strapi/sdk-plugin": minor
---

chore(deps): bump concurrently from 10.0.5 to 10.0.7 to fix a critical command injection vulnerability in shell-quote (GHSA-pqg4-j6r4-53mv)

chore: drop Node.js 20 support and raise the minimum Node.js version to `>=22.12.0`, to match Strapi and `concurrently@10`

chore: change the default server build target from `node20` to `node22`
