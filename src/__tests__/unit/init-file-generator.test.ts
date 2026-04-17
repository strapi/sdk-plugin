import type { TemplateFile } from '../../cli/commands/utils/init/types';

jest.mock('get-latest-version', () => ({
  __esModule: true,
  default: jest.fn(async () => '1.2.3'),
}));

const getFile = (files: TemplateFile[], name: string): TemplateFile => {
  const file = files.find((f) => f.name === name);
  if (!file) {
    throw new Error(`Missing generated file: ${name}`);
  }
  return file;
};

describe('init file generation', () => {
  it('should use pluginId for strapi.name, PLUGIN_ID constant, and server plugin lookup', async () => {
    const { generateFiles } = await import('../../cli/commands/utils/init/file-generator');

    const logger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    const pluginId = 'my-plugin';
    const pkgName = '@acme/strapi-plugin-my-plugin';

    const files = await generateFiles(
      [
        { name: 'pkgName', answer: pkgName },
        { name: 'pluginId', answer: pluginId },
        { name: 'client-code', answer: true },
        { name: 'server-code', answer: true },
        { name: 'typescript', answer: true },
      ],
      'my-plugin-folder',
      logger as any
    );

    const pkgJsonFile = getFile(files, 'package.json');
    const pkgJson = JSON.parse(pkgJsonFile.contents);

    expect(pkgJson.name).toBe(pkgName);
    expect(pkgJson.strapi.name).toBe(pluginId);

    const pluginIdFile = getFile(files, 'admin/src/pluginId.ts');
    expect(pluginIdFile.contents).toContain(`export const PLUGIN_ID = '${pluginId}'`);

    const serverControllerFile = getFile(files, 'server/src/controllers/controller.ts');
    expect(serverControllerFile.contents).toContain(`.plugin('${pluginId}')`);
  });

  it('should put admin runtime deps in peerDependencies (and devDependencies), not dependencies', async () => {
    const { generateFiles } = await import('../../cli/commands/utils/init/file-generator');

    const logger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    const files = await generateFiles(
      [
        { name: 'pkgName', answer: 'my-plugin' },
        { name: 'pluginId', answer: 'my-plugin' },
        { name: 'client-code', answer: true },
        { name: 'server-code', answer: false },
        { name: 'typescript', answer: true },
      ],
      'my-plugin',
      logger as any
    );

    const pkgJsonFile = getFile(files, 'package.json');
    const pkgJson = JSON.parse(pkgJsonFile.contents);

    expect(pkgJson.dependencies?.['@strapi/design-system']).toBeUndefined();
    expect(pkgJson.dependencies?.['@strapi/icons']).toBeUndefined();
    expect(pkgJson.dependencies?.['react-intl']).toBeUndefined();

    expect(pkgJson.peerDependencies?.['@strapi/design-system']).toBeDefined();
    expect(pkgJson.peerDependencies?.['@strapi/icons']).toBeDefined();
    expect(pkgJson.peerDependencies?.['react-intl']).toBeDefined();

    expect(pkgJson.devDependencies?.['@strapi/design-system']).toBeDefined();
    expect(pkgJson.devDependencies?.['@strapi/icons']).toBeDefined();
    expect(pkgJson.devDependencies?.['react-intl']).toBeDefined();
  });

  it('should constrain react-intl to v6 range (compatible with React 18)', async () => {
    const getLatestVersion = jest.requireMock('get-latest-version').default;
    getLatestVersion.mockClear();

    const { generateFiles } = await import('../../cli/commands/utils/init/file-generator');

    const logger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    const files = await generateFiles(
      [
        { name: 'pkgName', answer: 'my-plugin' },
        { name: 'pluginId', answer: 'my-plugin' },
        { name: 'client-code', answer: true },
        { name: 'server-code', answer: false },
        { name: 'typescript', answer: false },
      ],
      'my-plugin',
      logger as any
    );

    const reactIntlCalls = getLatestVersion.mock.calls.filter(
      ([name]: [string]) => name === 'react-intl'
    );
    expect(reactIntlCalls.length).toBeGreaterThan(0);
    for (const [, opts] of reactIntlCalls) {
      expect(opts.range).toMatch(/^\^6\./);
    }

    const pkgJsonFile = getFile(files, 'package.json');
    const pkgJson = JSON.parse(pkgJsonFile.contents);
    expect(pkgJson.devDependencies['react-intl']).toBe('^1.2.3');
    expect(pkgJson.peerDependencies['react-intl']).toBe('^1.2.3');
  });

  it('should generate JS admin template with correct menu link URL', async () => {
    const { generateFiles } = await import('../../cli/commands/utils/init/file-generator');

    const logger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    const files = await generateFiles(
      [
        { name: 'pkgName', answer: 'my-plugin' },
        { name: 'pluginId', answer: 'my-plugin' },
        { name: 'client-code', answer: true },
        { name: 'server-code', answer: false },
        { name: 'typescript', answer: false },
      ],
      'my-plugin',
      logger as any
    );

    const adminIndexFile = getFile(files, 'admin/src/index.js');
    expect(adminIndexFile.contents).toContain('to: `plugins/${PLUGIN_ID}`');
    expect(adminIndexFile.contents).not.toContain('to: `plugins/${PluginIcon}`');
  });
});
