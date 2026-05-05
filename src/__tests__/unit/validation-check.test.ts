import path from 'node:path';

import { build } from '../../cli/commands/utils/build';
import { verify } from '../../cli/commands/utils/validation';

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
    const logger = createLogger();
    const cwd = path.join(fixturesRoot, 'typescript-plugin');

    await build({
      cwd,
      logger,
      silent: true,
    });

    await expect(verify({ cwd, logger })).resolves.toBeUndefined();
  });

  it('fails when no strapi-admin or strapi-server exports exist', async () => {
    const logger = createLogger();
    const cwd = path.join(fixturesRoot, 'missing-exports-plugin');

    await expect(verify({ cwd, logger })).rejects.toThrow(
      'You need to have either a strapi-admin or strapi-server export in your package.json'
    );
  });

  it('fails when export ordering is invalid', async () => {
    const logger = createLogger();
    const cwd = path.join(fixturesRoot, 'bad-exports-ordering-plugin');

    await expect(verify({ cwd, logger })).rejects.toThrow(
      'exports["./strapi-admin"]: the \'types\' property should be the first property'
    );
  });

  it('fails when exported dist files are missing', async () => {
    const logger = createLogger();
    const cwd = path.join(fixturesRoot, 'missing-dist-plugin');

    await expect(verify({ cwd, logger })).rejects.toThrow('Missing files for exports:');
  });
});
