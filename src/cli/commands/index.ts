import { command as buildPluginCommand } from './plugin/build';
import { command as initPluginCommand } from './plugin/init';
import { command as linkWatchPluginCommand } from './plugin/link-watch';
import { command as verifyPluginCommand } from './plugin/verify';
import { command as watchPluginCommand } from './plugin/watch';

import type { StrapiCommand } from '../../types';

export const commands: StrapiCommand[] = [
  buildPluginCommand,
  initPluginCommand,
  linkWatchPluginCommand,
  watchPluginCommand,
  verifyPluginCommand,
];
