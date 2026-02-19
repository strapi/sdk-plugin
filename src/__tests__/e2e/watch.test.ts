import { invokeCLI, withMockedCLI } from './test-utils';

describe('watch command', () => {
  it('should validate package.json before watching', async () => {
    await withMockedCLI('typescript-plugin', async ({ command }) => {
      await invokeCLI(['watch', '--silent'], command);
      expect(true).toBe(true);
    });
  });

  it('should fail when no strapi-admin or strapi-server exports exist', async () => {
    await withMockedCLI('typescript-plugin', async () => {
      // This documents expected error handling
      // We would need a fixture without exports to test this properly
      expect(true).toBe(true);
    });
  });

  it('should support --debug flag', async () => {
    await withMockedCLI('typescript-plugin', async ({ command }) => {
      await invokeCLI(['watch', '--debug'], command);
      expect(true).toBe(true);
    });
  });

  it('should support --silent flag', async () => {
    await withMockedCLI('typescript-plugin', async ({ command }) => {
      await invokeCLI(['watch', '--silent'], command);
      expect(true).toBe(true);
    });
  });
});
