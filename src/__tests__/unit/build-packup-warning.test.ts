import path from 'node:path';

// Mock vite before importing build - include createFilter used by @vitejs/plugin-react
jest.mock('vite', () => ({
  build: jest.fn().mockResolvedValue(undefined),
  createFilter: jest.fn().mockReturnValue(() => true),
}));

const fixturesRoot = path.join(__dirname, '..', 'fixtures');

const createLogger = () => ({
  warnings: 0,
  errors: 0,
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  spinner: jest.fn().mockReturnValue({
    succeed: jest.fn(),
    fail: jest.fn(),
    start: jest.fn(),
    text: '',
  }),
});

describe('build packup config warning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should warn when packup.config.ts exists', async () => {
    const { build } = await import('../../cli/commands/utils/build');
    const logger = createLogger();
    const cwd = path.join(fixturesRoot, 'packup-config-plugin');

    await build({ cwd, logger });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('packup.config.ts'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('will be ignored'));
  });

  it('should not warn when no packup config exists', async () => {
    const { build } = await import('../../cli/commands/utils/build');
    const logger = createLogger();
    const cwd = path.join(fixturesRoot, 'typescript-plugin');

    await build({ cwd, logger });

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should not warn in silent mode', async () => {
    const { build } = await import('../../cli/commands/utils/build');
    const logger = createLogger();
    const cwd = path.join(fixturesRoot, 'packup-config-plugin');

    await build({ cwd, logger, silent: true });

    expect(logger.warn).not.toHaveBeenCalled();
  });
});
