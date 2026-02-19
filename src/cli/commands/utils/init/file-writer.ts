import fs from 'node:fs/promises';
import nodePath from 'node:path';
import prettier from 'prettier';

import type { Logger } from '../logger';
import type { TemplateFile } from './types';

const shouldFormat = (filename: string): boolean => {
  const ext = nodePath.extname(filename).toLowerCase();

  return ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'].includes(ext);
};

const formatContent = async (content: string, filename: string): Promise<string> => {
  const ext = nodePath.extname(filename).toLowerCase();

  const parserMap: Record<string, string> = {
    '.js': 'babel',
    '.jsx': 'babel',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.json': 'json',
    '.md': 'markdown',
  };

  const parser = parserMap[ext];
  if (!parser) {
    return content;
  }

  try {
    const formattedContent = await prettier.format(content, { parser });

    return formattedContent.trim();
  } catch {
    // If formatting fails, return original content
    return content;
  }
};

export const writeFiles = async (
  basePath: string,
  files: TemplateFile[],
  logger: Logger
): Promise<void> => {
  // Create the base directory if it doesn't exist
  await fs.mkdir(basePath, { recursive: true });

  for (const file of files) {
    const filePath = nodePath.join(basePath, file.name);
    const dir = nodePath.dirname(filePath);

    // Create directory structure if needed
    await fs.mkdir(dir, { recursive: true });

    // Format content if applicable
    let content = file.contents;
    if (shouldFormat(file.name)) {
      content = await formatContent(content, file.name);
    }

    // Write the file
    await fs.writeFile(filePath, content, 'utf-8');
    logger.debug(`Created ${file.name}`);
  }
};
