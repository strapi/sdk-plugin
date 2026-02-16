---
'@strapi/sdk-plugin': major
---

### Breaking Changes

- Removed `@strapi/pack-up` dependency - build system now uses Vite v6 directly
- `packup.config.ts` is no longer used (can be safely deleted)
- Sourcemaps now default to `false` (use `--sourcemap` flag to enable)

### Migration

1. Delete `packup.config.ts` from your plugin (it's no longer read)
2. If you need sourcemaps, add `--sourcemap` to your build command

### Why This Change?

- Resolves Vite security vulnerability (CVE) that existed in pack-up's dependencies
- Simplifies the build system with direct Vite configuration
- Reduces maintenance overhead by removing the pack-up abstraction layer
