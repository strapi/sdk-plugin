import fs from 'fs/promises';
import path from 'node:path';

/**
 * Walks from `cwd` toward the filesystem root and returns the first existing
 * `package.json` path, or `undefined` if none is found.
 */
export async function findPackageJsonPath(cwd: string): Promise<string | undefined> {
  let dir = path.resolve(cwd);
  const { root } = path.parse(dir);

  for (;;) {
    const candidate = path.join(dir, 'package.json');
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // continue upward
    }
    if (dir === root) {
      return undefined;
    }
    dir = path.dirname(dir);
  }
}
