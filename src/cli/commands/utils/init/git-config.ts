import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { GitConfig } from './types';

/**
 * Parse the global git config file (~/.gitconfig) to extract user information.
 * Returns null if the file doesn't exist or can't be parsed.
 */
export const parseGitConfig = async (): Promise<GitConfig | null> => {
  try {
    const gitConfigPath = path.join(os.homedir(), '.gitconfig');
    const content = await fs.readFile(gitConfigPath, 'utf-8');

    // Parse the [user] section from git config
    // Git config format is INI-like:
    // [user]
    //     name = John Doe
    //     email = john@example.com

    const nameMatch = content.match(/^\s*name\s*=\s*(.+)$/m);
    const emailMatch = content.match(/^\s*email\s*=\s*(.+)$/m);

    return {
      user: {
        name: nameMatch?.[1]?.trim(),
        email: emailMatch?.[1]?.trim(),
      },
    };
  } catch {
    return null;
  }
};
