import type { CLIContext } from '../../../types';

const runAction =
  (name: string, action: (...args: any[]) => Promise<void>) =>
  (ctx: CLIContext, ...args: unknown[]) => {
    const { logger } = ctx;
    Promise.resolve()
      .then(() => {
        return action(...args, ctx);
      })
      .catch((error) => {
        logger.error(error);
        process.exit(1);
      });
  };

export { runAction };
