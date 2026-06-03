import { loadChalk } from '../../cli/commands/utils/chalk-loader';

describe('chalk-loader', () => {
  it('imports the module', async () => {
    const mod = await import('../../cli/commands/utils/chalk-loader');
    expect(typeof mod.loadChalk).toBe('function');
  });

  it('loads in jest without hanging', async () => {
    expect(process.env.JEST_WORKER_ID).toBeDefined();

    const chalk = (await Promise.race([
      loadChalk(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 1000);
      }),
    ])) as Awaited<ReturnType<typeof loadChalk>>;

    expect(typeof chalk.cyan).toBe('function');
    expect(chalk.cyan('test')).toBe('test');
  });
});
