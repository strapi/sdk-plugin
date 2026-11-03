/**
 * Helpers for the `--bundle` flag of the `build`, `watch` and `verify` commands.
 *
 * A bundle name is a package.json export key, exactly as written there, e.g.
 * `./strapi-admin`. An unknown, duplicated or empty selection throws rather
 * than falling back to all bundles.
 */
import { getCommander } from './commander-loader';

import type { Option } from 'commander';

export type BundleRuntime = 'browser' | 'node';

const EXPORT_KEY_PREFIX = './';
const STRAPI_PREFIX = 'strapi-';

/** The only export loaded by the browser. */
const ADMIN_EXPORT_KEY = './strapi-admin';

/** Where an export runs: only `./strapi-admin` is loaded by the browser. */
export const toBundleRuntime = (exportKey: string): BundleRuntime =>
  exportKey === ADMIN_EXPORT_KEY ? 'browser' : 'node';

/** The directory an export's sources live in, e.g. `./strapi-admin` lives in `admin/`. */
export const toSourceDirName = (exportKey: string): string => {
  const withoutPrefix = exportKey.startsWith(EXPORT_KEY_PREFIX)
    ? exportKey.slice(EXPORT_KEY_PREFIX.length)
    : exportKey;

  return withoutPrefix.startsWith(STRAPI_PREFIX)
    ? withoutPrefix.slice(STRAPI_PREFIX.length)
    : withoutPrefix;
};

/** Collects repeated and comma-separated `--bundle` values into one list. */
const collectBundles = (value: string, previous: string[] = []): string[] => [
  ...previous,
  ...value.split(',').map((name) => name.trim()),
];

/** The `--bundle` option for a command, e.g. `createBundleOption('build')`. */
export const createBundleOption = async (verb: string): Promise<Option> => {
  const { Option } = await getCommander();

  return new Option(
    '--bundle <name>',
    `only ${verb} the named bundle(s), e.g. ./strapi-admin or ./shared; repeatable or comma-separated`
  ).argParser(collectBundles);
};

/** Quotes names for an error message, e.g. `"./strapi-admin", "./shared"`. */
const quoteNames = (names: string[]): string =>
  names.map((name) => JSON.stringify(name)).join(', ');

/** Checks the requested names against what the plugin declares. */
export const selectBundleNames = (available: string[], requested: string[]): string[] => {
  const availableList = `Available bundles: ${available.join(', ')}`;

  if (requested.length === 0 || requested.some((name) => name.length === 0)) {
    throw new Error(`The --bundle option needs a bundle name. ${availableList}`);
  }

  const duplicates = [...new Set(requested.filter((name, i) => requested.indexOf(name) !== i))];

  if (duplicates.length > 0) {
    throw new Error(`Duplicate bundle ${quoteNames(duplicates)} in the selection.`);
  }

  const unknown = requested.filter((name) => !available.includes(name));

  if (unknown.length > 0) {
    const hint = unknown.some((name) => available.includes(`${EXPORT_KEY_PREFIX}${name}`))
      ? ` A bundle name is the export key exactly as written in package.json, including its leading "${EXPORT_KEY_PREFIX}".`
      : '';

    throw new Error(`Unknown bundle ${quoteNames(unknown)}.${hint} ${availableList}`);
  }

  return requested;
};

/** Keeps the exports of the requested bundles, dropping string exports. */
export const filterExports = <TExport>(
  exports: Record<string, TExport | string>,
  names: string[]
): Record<string, TExport | string> => {
  const available = Object.entries(exports)
    .filter(([, exp]) => typeof exp !== 'string')
    .map(([exportKey]) => exportKey);

  const wanted = selectBundleNames(available, names);

  return Object.fromEntries(
    Object.entries(exports).filter(
      ([exportKey, exp]) => typeof exp !== 'string' && wanted.includes(exportKey)
    )
  );
};
