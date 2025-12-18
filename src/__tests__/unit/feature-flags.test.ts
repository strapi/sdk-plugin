import { getFeatureFlags, isLegacyEnabled } from '../../cli/commands/utils/feature-flags';

describe('feature flags', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getFeatureFlags', () => {
    it('should return all flags as false by default', () => {
      const flags = getFeatureFlags();
      expect(flags).toEqual({
        useLegacyBuild: false,
        useLegacyWatch: false,
        useLegacyCheck: false,
        useLegacyInit: false,
      });
    });

    it('should return true when USE_LEGACY_PACKUP_BUILD is set', () => {
      process.env.USE_LEGACY_PACKUP_BUILD = 'true';
      const flags = getFeatureFlags();
      expect(flags.useLegacyBuild).toBe(true);
      expect(flags.useLegacyWatch).toBe(false);
    });

    it('should return true when USE_LEGACY_PACKUP_WATCH is set', () => {
      process.env.USE_LEGACY_PACKUP_WATCH = 'true';
      const flags = getFeatureFlags();
      expect(flags.useLegacyBuild).toBe(false);
      expect(flags.useLegacyWatch).toBe(true);
    });

    it('should return true when USE_LEGACY_PACKUP_CHECK is set', () => {
      process.env.USE_LEGACY_PACKUP_CHECK = 'true';
      const flags = getFeatureFlags();
      expect(flags.useLegacyCheck).toBe(true);
    });

    it('should return true when USE_LEGACY_PACKUP_INIT is set', () => {
      process.env.USE_LEGACY_PACKUP_INIT = 'true';
      const flags = getFeatureFlags();
      expect(flags.useLegacyInit).toBe(true);
    });

    it('should handle multiple flags set at once', () => {
      process.env.USE_LEGACY_PACKUP_BUILD = 'true';
      process.env.USE_LEGACY_PACKUP_WATCH = 'true';
      const flags = getFeatureFlags();
      expect(flags.useLegacyBuild).toBe(true);
      expect(flags.useLegacyWatch).toBe(true);
      expect(flags.useLegacyCheck).toBe(false);
      expect(flags.useLegacyInit).toBe(false);
    });

    it('should only return true for "true" value, not other truthy values', () => {
      process.env.USE_LEGACY_PACKUP_BUILD = '1';
      const flags = getFeatureFlags();
      expect(flags.useLegacyBuild).toBe(false);
    });
  });

  describe('isLegacyEnabled', () => {
    it('should return false when flag is not set', () => {
      expect(isLegacyEnabled('useLegacyBuild')).toBe(false);
    });

    it('should return true when flag is set', () => {
      process.env.USE_LEGACY_PACKUP_BUILD = 'true';
      expect(isLegacyEnabled('useLegacyBuild')).toBe(true);
    });
  });
});
