import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

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

describe('validation.check', () => {
  it('passes for a valid plugin fixture (exports ordered + files exist)', async () => {
    const { build } = await import('../../cli/commands/utils/build');
    const { verify } = await import('../../cli/commands/utils/validation');
    const logger = createLogger();
    const fixtureSource = path.join(fixturesRoot, 'typescript-plugin');
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'strapi-sdk-plugin-validation-'));

    try {
      await fs.cp(fixtureSource, cwd, { recursive: true });

      await build({
        cwd,
        logger,
        silent: true,
      });

      await expect(verify({ cwd, logger })).resolves.toBeUndefined();
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  }, 15_000);

  it('fails when no strapi-admin or strapi-server exports exist', async () => {
    const { verify } = await import('../../cli/commands/utils/validation');
    const logger = createLogger();
    const cwd = path.join(fixturesRoot, 'missing-exports-plugin');

    await expect(verify({ cwd, logger })).rejects.toThrow(
      'You need to have either a strapi-admin or strapi-server export in your package.json'
    );
  });

  it('fails when export ordering is invalid', async () => {
    const { verify } = await import('../../cli/commands/utils/validation');
    const logger = createLogger();
    const cwd = path.join(fixturesRoot, 'bad-exports-ordering-plugin');

    await expect(verify({ cwd, logger })).rejects.toThrow(
      'exports["./strapi-admin"]: the \'types\' property should be the first property'
    );
  });

  it('fails when exported dist files are missing', async () => {
    const { verify } = await import('../../cli/commands/utils/validation');
    const logger = createLogger();
    const cwd = path.join(fixturesRoot, 'missing-dist-plugin');

    await expect(verify({ cwd, logger })).rejects.toThrow('Missing files for exports:');
  });
});
