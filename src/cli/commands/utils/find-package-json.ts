import fs from 'fs/promises';
import path from 'path';

/**
 * Find the closest package.json file by walking up from `cwd`.
 */
const findPackageJson = async (cwd: string): Promise<string | undefined> => {
  let current = path.resolve(cwd);
  const { root } = path.parse(current);

  while (current !== root) {
    const candidate = path.join(current, 'package.json');

    try {
      await fs.access(candidate);

      return candidate;
    } catch {
      // Continue searching in the parent directory.
    }

    current = path.dirname(current);
  }

  const rootCandidate = path.join(root, 'package.json');

  try {
    await fs.access(rootCandidate);

    return rootCandidate;
  } catch {
    return undefined;
  }
};

export { findPackageJson };
