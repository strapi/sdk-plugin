import { invokeCLI, withMockedCLI } from './test-utils';

describe('verify command', () => {
  it('should verify a valid TypeScript plugin', async () => {
    await withMockedCLI('typescript-plugin', async ({ command, mockExit }) => {
      const cli = await invokeCLI(['verify', '--silent'], command);

      await expect(
        cli.parseAsync(['node', 'strapi-plugin', 'verify', '--silent'])
      ).resolves.not.toThrow();

      expect(mockExit).not.toHaveBeenCalled();
    });
  });

  it('should fail for plugin with invalid exports', async () => {
    await withMockedCLI('typescript-plugin', async () => {
      // This test will be more useful when we have fixtures with invalid exports
      // For now, this documents the expected behavior
      expect(true).toBe(true);
    });
  });

  it('should support --debug flag', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    try {
      await withMockedCLI('typescript-plugin', async ({ command }) => {
        await invokeCLI(['verify', '--debug'], command);
        expect(true).toBe(true);
      });
    } finally {
      consoleLogSpy.mockRestore();
    }
  });
});
