import type { Logger } from './cli/commands/utils/logger';
import type { TsConfig } from './cli/commands/utils/tsconfig';
import type { Command } from 'commander';

export interface CommonCLIOptions {
  silent?: boolean;
  debug?: boolean;
}

export interface CLIContext {
  cwd: string;
  logger: Logger;
  tsconfig?: TsConfig;
}

export type StrapiCommand = (params: {
  command: Command;
  argv: string[];
  ctx: CLIContext;
}) => void | Command;
