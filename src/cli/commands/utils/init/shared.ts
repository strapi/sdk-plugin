import getLatestVersion from 'get-latest-version';

/**
 * Shared types and utilities for plugin initialization.
 * Used by both the new native implementation and legacy pack-up template.
 */

// TODO: remove these when release versions are available
export const USE_RC_VERSIONS: string[] = ['@strapi/design-system', '@strapi/icons'];

export interface PackageExport {
  types?: string;
  require: string;
  import: string;
  source: string;
  default: string;
}

export interface PluginPackageJson {
  name?: string;
  description?: string;
  version?: string;
  keywords?: string[];
  type: 'commonjs';
  license?: string;
  repository?: {
    type: 'git';
    url: string;
  };
  bugs?: {
    url: string;
  };
  homepage?: string;
  author?: string;
  exports: {
    './strapi-admin'?: PackageExport;
    './strapi-server'?: PackageExport;
    './package.json': `${string}.json`;
  };
  files: string[];
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  strapi: {
    name?: string;
    displayName?: string;
    description?: string;
    kind: 'plugin';
  };
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && !Array.isArray(value) && typeof value === 'object';

export const resolveLatestVersionOfDeps = async (
  deps: Record<string, string>
): Promise<Record<string, string>> => {
  const latestDeps: Record<string, string> = {};

  for (const [name, version] of Object.entries(deps)) {
    try {
      const range = USE_RC_VERSIONS.includes(name) ? 'rc' : version;
      const latestVersion = await getLatestVersion(name, { range });
      latestDeps[name] = latestVersion ? `^${latestVersion}` : '*';
    } catch {
      latestDeps[name] = '*';
    }
  }

  return latestDeps;
};
