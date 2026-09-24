import { build } from '../../cli/commands/utils/build';
import { createCLI } from '../../index';
import { getFixturePath } from '../e2e/test-utils';

// Keep the action's work inert: we only care how `--bundle` reaches `build`.
jest.mock('../../cli/commands/utils/build', () => ({
  build: jest.fn().mockResolvedValue(undefined),
}));

const buildMock = build as unknown as jest.Mock;

/** Waits for work that was started but not awaited. */
const waitFor = async (isDone: () => boolean, timeout = 10_000): Promise<void> => {
  const deadline = Date.now() + timeout;

  while (!isDone() && Date.now() < deadline) {
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
  }
};

describe('build --bundle option', () => {
  let cwdSpy: jest.SpyInstance;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalNodeEnv = process.env.NODE_ENV;
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(getFixturePath('typescript-plugin'));
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
  });

  /** Commander does not await the action, so wait for the build it triggers. */
  const runBuild = async (...args: string[]) => {
    const argv = ['node', 'strapi-plugin', 'build', '--silent', ...args];
    const cli = await createCLI(argv);

    await cli.parseAsync(argv);
    await waitFor(() => buildMock.mock.calls.length > 0);

    return buildMock.mock.calls[0]?.[0];
  };

  it('should pass repeated flags on as a list of bundles', async () => {
    await expect(
      runBuild('--bundle', './strapi-admin', '--bundle', './strapi-server')
    ).resolves.toMatchObject({ bundles: ['./strapi-admin', './strapi-server'] });
  });

  it('should pass a comma separated list on as a list of bundles', async () => {
    await expect(runBuild('--bundle', './strapi-admin,./strapi-server')).resolves.toMatchObject({
      bundles: ['./strapi-admin', './strapi-server'],
    });
  });

  it('should trim whitespace around each name', async () => {
    await expect(runBuild('--bundle', ' ./strapi-admin , ./shared ')).resolves.toMatchObject({
      bundles: ['./strapi-admin', './shared'],
    });
  });

  it('should keep empty entries so they can be rejected', async () => {
    await expect(runBuild('--bundle', './strapi-admin,,./shared')).resolves.toMatchObject({
      bundles: ['./strapi-admin', '', './shared'],
    });
  });

  it('should leave bundles undefined when the flag is not passed', async () => {
    await expect(runBuild()).resolves.toMatchObject({ bundles: undefined });
  });
});
