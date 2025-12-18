/**
 * Feature flag system for pack-up removal
 */
export interface FeatureFlags {
  useLegacyBuild: boolean;
  useLegacyWatch: boolean;
  useLegacyCheck: boolean;
  useLegacyInit: boolean;
}

export function getFeatureFlags(): FeatureFlags {
  return {
    useLegacyBuild: process.env.USE_LEGACY_PACKUP_BUILD === 'true',
    useLegacyWatch: process.env.USE_LEGACY_PACKUP_WATCH === 'true',
    useLegacyCheck: process.env.USE_LEGACY_PACKUP_CHECK === 'true',
    useLegacyInit: process.env.USE_LEGACY_PACKUP_INIT === 'true',
  };
}

export function isLegacyEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature];
}
