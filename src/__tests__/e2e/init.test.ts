import { invokeCLI, withMockedCLI } from './test-utils';

describe('init command', () => {
  it('should have init subcommand available', async () => {
    await withMockedCLI('test-init', async ({ command }) => {
      await invokeCLI([], command);

      const initCommand = command.commands.find((cmd) => cmd.name() === 'init');
      expect(initCommand).toBeDefined();
      expect(initCommand?.description()).toContain('plugin');
    });
  });

  it('should register init command with proper options', async () => {
    await withMockedCLI('test-init', async ({ command }) => {
      await invokeCLI([], command);

      const initCommand = command.commands.find((cmd) => cmd.name() === 'init');
      expect(initCommand).toBeDefined();

      if (initCommand) {
        const options = initCommand.options.map((opt) => opt.long);
        expect(options).toContain('--debug');
        expect(options).toContain('--silent');
      }
    });
  });

  it('should support --debug flag', async () => {
    await withMockedCLI('test-init', async ({ command }) => {
      await invokeCLI(['--debug'], command);
      expect(true).toBe(true);
    });
  });

  it('should support --silent flag', async () => {
    await withMockedCLI('test-init', async ({ command }) => {
      await invokeCLI(['--silent'], command);
      expect(true).toBe(true);
    });
  });
});
