/**
 * Check the dependency diff that Claude produced in the security triage workflow.
 *
 * The publish job of .github/workflows/security-triage.yml runs this script after it
 * applies Claude's patch to the index. The patch is untrusted, so the script rejects
 * anything that is not a plain dependency update:
 *
 * - package.json: only `dependencies`, `devDependencies`, `optionalDependencies` and
 *   `pnpm.overrides` change, and no keys are added or removed, except a new override
 *   for a package whose open alerts are all development-scope. Every changed value is
 *   an exact version, no lower than the old one, and the old value was a registry
 *   version range (an `npm:` alias, a `workspace:` range, a URL or a path names another
 *   package or source).
 * - pnpm-lock.yaml: only the YAML shapes that pnpm writes, so YAML tricks cannot show
 *   this script one value and pnpm another. The same `lockfileVersion` and `settings`,
 *   `overrides` equal to package.json, and importer specifiers equal to package.json.
 *   Every dependency of the importer and of every snapshot is locked, so no install
 *   resolves anything unchecked. Every new or changed package comes from the npm
 *   registry with the registry's integrity hash, and is at least MIN_RELEASE_AGE_DAYS
 *   old (except the first patched version of a critical alert that Claude chose to
 *   fix). Every new or changed snapshot lists the registry's dependencies, each locked
 *   at a version that the registry range (or a package.json override) allows.
 * - The changeset: exactly one quoted `'@strapi/sdk-plugin': patch` line, present only
 *   when the dependencies that ship to users changed.
 *
 * It uses only Node built-ins and never runs repository code, so it needs no
 * `pnpm install`. Node 24 runs it directly by stripping the types:
 * `node .github/scripts/security-triage-verify.mts`. Use only erasable TypeScript
 * syntax (no enums, namespaces or parameter properties).
 *
 * Environment: ALERTS (open alerts JSON array), DECISIONS (Claude's decisions JSON
 * array), CHANGESET (the allowed changeset path), MIN_RELEASE_AGE_DAYS, and optionally
 * FIXED_ALERTS (a file to write the numbers of the alerts that the diff fixes to).
 * Exit code 1 and `::error::` lines when a check fails.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

type DependencyMap = Record<string, string>;
type Identifier = string | number;
type YamlValue = string | string[] | YamlMap;
type YamlMap = Map<string, YamlValue>;

interface Alert {
  number: number;
  dependency: { package: { name: string }; scope?: string | null };
  security_advisory: { ghsa_id: string; severity?: string };
  security_vulnerability?: {
    vulnerable_version_range?: string;
    first_patched_version?: { identifier?: string } | null;
  };
}

interface Decision {
  number?: unknown;
  package?: unknown;
  ghsa?: unknown;
  decision?: unknown;
}

interface DepPath {
  name: string;
  version: string;
}

interface OverrideKey {
  parent?: string;
  name: string;
}

interface RegistryVersion {
  dependencies?: DependencyMap;
  optionalDependencies?: DependencyMap;
  peerDependencies?: DependencyMap;
  dist?: { integrity?: string };
}

interface RegistryDoc {
  versions?: Record<string, RegistryVersion>;
  time?: Record<string, string>;
}

interface SemVer {
  major: number;
  minor: number;
  patch: number;
  pre: Identifier[];
}

/** One comparison of a range. `=` also stands for a bare version. */
interface Comparator {
  op: string;
  version: SemVer;
}

/** A version in a range, where null stands for `x`, `*` or a missing part. */
interface PartialVersion {
  major: number | null;
  minor: number | null;
  patch: number | null;
  pre: Identifier[];
}

const PACKAGE = '@strapi/sdk-plugin';
const INSTALLED_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'];
/** The fields whose versions npm users of the published package install. */
const SHIPPED_FIELDS = ['dependencies', 'optionalDependencies'];
const EXACT_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$/;
const NAME = '(?:@[A-Za-z0-9._~-]+/)?[A-Za-z0-9._~-]+';
const VERSION = '[0-9]+\\.[0-9]+\\.[0-9]+(?:-[0-9A-Za-z.-]+)?';
// `name@version`, then the peer suffix pnpm adds to snapshot keys: `(peer@1.0.0)…`.
const DEP_PATH = new RegExp(`^(${NAME})@(${VERSION})((?:\\([A-Za-z0-9@/._~()+-]+\\))*)$`);
// A dependency value in the importer or a snapshot: a version or an alias, with peers.
const DEP_VALUE = new RegExp(`^(?:(${NAME})@)?(${VERSION})((?:\\([A-Za-z0-9@/._~()+-]+\\))*)$`);
const OVERRIDE_PART = new RegExp(`^(${NAME})(?:@([^>]+))?$`);
const INTEGRITY = /^sha512-[A-Za-z0-9+/]+={0,2}$/;
const CHANGESET_FRONTMATTER = /^---\n([\s\S]*?\n)---(?:\n|$)/;
const CHANGESET_LINE = /^(['"])@strapi\/sdk-plugin\1: patch$/;
const REGISTRY = 'https://registry.npmjs.org/';
const DAY_MS = 24 * 60 * 60 * 1000;

const LOCK_TOP_KEYS = [
  'lockfileVersion',
  'settings',
  'overrides',
  'importers',
  'packages',
  'snapshots',
];
const IMPORTER_KEYS = INSTALLED_FIELDS;
const PACKAGE_KEYS = [
  'resolution',
  'engines',
  'cpu',
  'os',
  'libc',
  'hasBin',
  'peerDependencies',
  'peerDependenciesMeta',
  'deprecated',
];
const SNAPSHOT_KEYS = [
  'dependencies',
  'optionalDependencies',
  'transitivePeerDependencies',
  'optional',
];

// pnpm-lock.yaml: the only YAML shapes that pnpm 9 writes. pnpm reads the file as YAML,
// so anything else (a double-quoted, multi-line or escaped scalar, an anchor, a tag, a
// `?` key, a duplicate key, other indentation, a tab or a CR) could show this script
// one value and pnpm another. Plain keys may hold the ranges and spaces of an
// `overrides` key, such as `a>b@>=1 <2`, but never a colon, a quote or a `#`.
const LOCK_LINE =
  /^('[^']+'|[A-Za-z0-9._](?:[A-Za-z0-9._@/()+~^<>=|* -]*[A-Za-z0-9._@/()+~^<>=|*-])?):(?: (.+))?$/;
const LOCK_ITEM = /^- (.+)$/;
const LOCK_QUOTED = /^'([^']*)'$/;
const LOCK_PLAIN_START = /^[A-Za-z0-9^~._(/]/;
const LOCK_FLOW_PAIR = /([A-Za-z0-9_.-]+): ('[^']*'|[^,'{}[\]]*[^,'{}[\] ])(?:, |$)/y;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\ufeff]/;
const LOCK_FLOW_ITEM = /('[^']*'|[^,'{}[\] ][^,'{}[\]]*?)(?:, |$)/y;

const errors: string[] = [];

function fail(message: string): void {
  errors.push(message);
  console.log(`::error::${message}`);
}

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

function gitShowHead(path: string): string | null {
  const result = spawnSync('git', ['show', `HEAD:${path}`], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  return result.status === 0 ? result.stdout : null;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (key) =>
      Object.hasOwn(b, key) &&
      isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
}

/** A manifest dependency field as a map of strings, {} when absent, null when malformed. */
function dependencyMap(value: unknown): DependencyMap | null {
  if (value === undefined) return {};
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return Object.values(value).every((range) => typeof range === 'string')
    ? (value as DependencyMap)
    : null;
}

/** `pnpm.overrides` of a manifest, {} when absent, null when malformed. */
function overridesOf(manifest: Record<string, unknown>): DependencyMap | null {
  const pnpm = manifest.pnpm;
  if (pnpm === undefined) return {};
  if (typeof pnpm !== 'object' || pnpm === null || Array.isArray(pnpm)) return null;
  return dependencyMap((pnpm as Record<string, unknown>).overrides);
}

/** `pnpm` of a manifest without `overrides`, to check that nothing else in it changed. */
function pnpmWithoutOverrides(manifest: Record<string, unknown>): unknown {
  const pnpm = manifest.pnpm;
  if (typeof pnpm !== 'object' || pnpm === null || Array.isArray(pnpm)) return pnpm;
  const { overrides: _overrides, ...rest } = pnpm as Record<string, unknown>;
  return rest;
}

/** The parts of a `pnpm.overrides` key: `pkg`, `pkg@range`, `parent>pkg`, `parent@range>pkg`. */
function parseOverrideKey(key: string): OverrideKey | null {
  const parts = key.split('>');
  if (parts.length > 2) return null;
  const target = parts.at(-1)?.match(OVERRIDE_PART);
  if (!target) return null;
  if (parts.length === 1) return { name: target[1] };
  const parent = parts[0].match(OVERRIDE_PART);
  return parent ? { parent: parent[1], name: target[1] } : null;
}

/** The override values that may apply to `name` when `parent` depends on it. */
function overrideValues(parent: string, name: string, overrides: DependencyMap): string[] {
  return Object.entries(overrides)
    .filter(([key]) => {
      const target = parseOverrideKey(key);
      return target !== null && target.name === name && (target.parent ?? parent) === parent;
    })
    .map(([, value]) => value);
}

function parseDepPath(key: string): DepPath | null {
  const match = key.match(DEP_PATH);
  return match ? { name: match[1], version: match[2] } : null;
}

/** The snapshot key and locked package that a dependency value points to. */
function resolveDepValue(name: string, value: string): (DepPath & { key: string }) | null {
  const match = value.match(DEP_VALUE);
  if (!match) return null;
  const target = match[1] ?? name;
  return { name: target, version: match[2], key: `${target}@${match[2]}${match[3]}` };
}

// --- semver: node-semver's range rules (no `loose`, no `includePrerelease`) ---------

const SEMVER =
  /^v?(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-((?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const PARTIAL =
  /^v?(0|[1-9][0-9]*|[xX*])(?:\.(0|[1-9][0-9]*|[xX*])(?:\.(0|[1-9][0-9]*|[xX*])(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)?)?$/;
// `-0` is the lowest prerelease: `<2.0.0-0` also keeps out the prereleases of 2.0.0.
const LOWEST: Identifier[] = [0];

function identifiers(text: string | undefined): Identifier[] {
  return text ? text.split('.').map((id) => (/^[0-9]+$/.test(id) ? Number(id) : id)) : [];
}

function semver(major: number, minor: number, patch: number, pre: Identifier[] = []): SemVer {
  return { major, minor, patch, pre };
}

function parseVersion(text: string): SemVer | null {
  const match = SEMVER.exec(text.trim());
  if (!match) return null;
  return semver(Number(match[1]), Number(match[2]), Number(match[3]), identifiers(match[4]));
}

function compareVersions(a: SemVer, b: SemVer): number {
  const release = a.major - b.major || a.minor - b.minor || a.patch - b.patch;
  if (release !== 0) return Math.sign(release);
  // A prerelease comes before its release.
  if (a.pre.length === 0 || b.pre.length === 0) return Math.sign(b.pre.length - a.pre.length);
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i += 1) {
    const x = a.pre[i];
    const y = b.pre[i];
    if (x === y) continue;
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (typeof x === 'number' && typeof y === 'number') return x < y ? -1 : 1;
    if (typeof x === 'number') return -1;
    if (typeof y === 'number') return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

function parsePartial(text: string): PartialVersion | null {
  const match = PARTIAL.exec(text);
  if (!match) return null;
  const part = (value: string | undefined) =>
    value === undefined || /^[xX*]$/.test(value) ? null : Number(value);
  return {
    major: part(match[1]),
    minor: part(match[2]),
    patch: part(match[3]),
    pre: identifiers(match[4]),
  };
}

/** A version with optional operator: `1.2.3`, `>=1.2`, `<1`, `1.x`, `*`. */
function xRange(op: string, x: PartialVersion): Comparator[] {
  const { major, minor, patch } = x;
  if (major === null)
    return op === '<' || op === '>' ? [{ op: '<', version: semver(0, 0, 0, LOWEST) }] : [];
  if (minor !== null && patch !== null)
    return [{ op: op || '=', version: semver(major, minor, patch, x.pre) }];
  if (op === '' || op === '=') {
    return minor === null
      ? [
          { op: '>=', version: semver(major, 0, 0) },
          { op: '<', version: semver(major + 1, 0, 0, LOWEST) },
        ]
      : [
          { op: '>=', version: semver(major, minor, 0) },
          { op: '<', version: semver(major, minor + 1, 0, LOWEST) },
        ];
  }
  let [bound, M, m] = [op, major, minor ?? 0];
  if (op === '>') {
    bound = '>=';
    [M, m] = minor === null ? [major + 1, 0] : [major, minor + 1];
  } else if (op === '<=') {
    bound = '<';
    [M, m] = minor === null ? [major + 1, 0] : [major, minor + 1];
  }
  return [{ op: bound, version: semver(M, m, 0, bound === '<' ? LOWEST : []) }];
}

/** `~1.2.3`: patch updates. */
function tildeRange(x: PartialVersion): Comparator[] {
  const { major, minor, patch } = x;
  if (major === null) return [];
  if (minor === null) {
    return [
      { op: '>=', version: semver(major, 0, 0) },
      { op: '<', version: semver(major + 1, 0, 0, LOWEST) },
    ];
  }
  return [
    { op: '>=', version: semver(major, minor, patch ?? 0, patch === null ? [] : x.pre) },
    { op: '<', version: semver(major, minor + 1, 0, LOWEST) },
  ];
}

/** `^1.2.3`: updates that keep the left-most non-zero part. */
function caretRange(x: PartialVersion): Comparator[] {
  const { major, minor, patch } = x;
  if (major === null) return [];
  if (minor === null) {
    return [
      { op: '>=', version: semver(major, 0, 0) },
      { op: '<', version: semver(major + 1, 0, 0, LOWEST) },
    ];
  }
  const lower: Comparator = {
    op: '>=',
    version: semver(major, minor, patch ?? 0, patch === null ? [] : x.pre),
  };
  if (major > 0) return [lower, { op: '<', version: semver(major + 1, 0, 0, LOWEST) }];
  if (patch === null || minor > 0)
    return [lower, { op: '<', version: semver(0, minor + 1, 0, LOWEST) }];
  return [lower, { op: '<', version: semver(0, 0, patch + 1, LOWEST) }];
}

/** `1.2.3 - 2.3.4`. */
function hyphenRange(from: PartialVersion, to: PartialVersion): Comparator[] {
  const set: Comparator[] = [];
  if (from.major !== null) {
    const exact = from.minor !== null && from.patch !== null;
    set.push({
      op: '>=',
      version: semver(from.major, from.minor ?? 0, from.patch ?? 0, exact ? from.pre : []),
    });
  }
  if (to.major !== null) {
    if (to.minor === null) set.push({ op: '<', version: semver(to.major + 1, 0, 0, LOWEST) });
    else if (to.patch === null)
      set.push({ op: '<', version: semver(to.major, to.minor + 1, 0, LOWEST) });
    else set.push({ op: '<=', version: semver(to.major, to.minor, to.patch, to.pre) });
  }
  return set;
}

/** A range as sets of comparators (any set may match), or null when it is not a range. */
function parseRange(range: string): Comparator[][] | null {
  const sets: Comparator[][] = [];
  for (const part of range.split('||')) {
    const text = part.trim();
    const hyphen = text.match(/^(\S+)\s+-\s+(\S+)$/);
    if (hyphen) {
      const from = parsePartial(hyphen[1]);
      const to = parsePartial(hyphen[2]);
      if (!from || !to) return null;
      sets.push(hyphenRange(from, to));
      continue;
    }
    const set: Comparator[] = [];
    const tokens = text
      .replace(/(<=|>=|<|>|=|~>|~|\^)\s+/g, '$1')
      .split(/\s+/)
      .filter(Boolean);
    for (const token of tokens) {
      const [, op = '', rest = ''] = token.match(/^(<=|>=|<|>|=|~>|~|\^)?(.*)$/) ?? [];
      const x = parsePartial(rest);
      if (!x) return null;
      set.push(
        ...(op === '^' ? caretRange(x) : op.startsWith('~') ? tildeRange(x) : xRange(op, x))
      );
    }
    sets.push(set);
  }
  return sets;
}

function testSet(set: Comparator[], version: SemVer): boolean {
  for (const { op, version: bound } of set) {
    const order = compareVersions(version, bound);
    const ok =
      op === '<'
        ? order < 0
        : op === '<='
          ? order <= 0
          : op === '>'
            ? order > 0
            : op === '>='
              ? order >= 0
              : order === 0;
    if (!ok) return false;
  }
  // A prerelease only matches a set that names a prerelease of the same version.
  return (
    version.pre.length === 0 ||
    set.some(
      ({ version: bound }) =>
        bound.pre.length > 0 &&
        bound.major === version.major &&
        bound.minor === version.minor &&
        bound.patch === version.patch
    )
  );
}

function satisfies(version: string, range: string): boolean {
  const parsed = parseVersion(version);
  const sets = parseRange(range);
  return !!parsed && !!sets && sets.some((set) => testSet(set, parsed));
}

/** The lowest version that a range allows, or null. */
function minVersion(range: string): SemVer | null {
  const sets = parseRange(range);
  if (!sets) return null;
  for (const candidate of [semver(0, 0, 0), semver(0, 0, 0, LOWEST)]) {
    if (sets.some((set) => testSet(set, candidate))) return candidate;
  }
  let lowest: SemVer | null = null;
  for (const set of sets) {
    let floor: SemVer | null = null;
    for (const { op, version } of set) {
      let candidate: SemVer | null = null;
      if (op === '>') {
        candidate = version.pre.length
          ? { ...version, pre: [...version.pre, 0] }
          : { ...version, patch: version.patch + 1 };
      } else if (op === '>=' || op === '=') {
        candidate = version;
      }
      if (candidate && (!floor || compareVersions(candidate, floor) > 0)) floor = candidate;
    }
    if (floor && (!lowest || compareVersions(lowest, floor) > 0)) lowest = floor;
  }
  const result = lowest;
  return result && sets.some((set) => testSet(set, result)) ? result : null;
}

/** Whether a locked version is allowed by a range. A dist-tag such as `latest` moves. */
function matchesRange(version: string, range: string): boolean {
  return parseRange(range) ? satisfies(version, range) : /^[A-Za-z][0-9A-Za-z._-]*$/.test(range);
}

// --- pnpm-lock.yaml ------------------------------------------------------------------

function lockScalar(raw: string, where: string): string {
  const quoted = raw.match(LOCK_QUOTED);
  if (quoted) return quoted[1];
  if (
    LOCK_PLAIN_START.test(raw) &&
    !raw.endsWith(' ') &&
    !raw.endsWith(':') &&
    !raw.includes(': ') &&
    !raw.includes(' #')
  ) {
    return raw;
  }
  throw new Error(`${where} has a value in a form that pnpm does not write`);
}

/** `{a: 1, b: '2'}` or `[x, 'y']`, one level deep, as pnpm writes them. */
function lockFlow(raw: string, where: string): YamlValue | null {
  const inner = raw.slice(1, -1);
  if (raw.startsWith('{') && raw.endsWith('}')) {
    const map: YamlMap = new Map();
    LOCK_FLOW_PAIR.lastIndex = 0;
    while (LOCK_FLOW_PAIR.lastIndex < inner.length) {
      const match = LOCK_FLOW_PAIR.exec(inner);
      if (!match || map.has(match[1]))
        throw new Error(`${where} has a map that pnpm does not write`);
      map.set(match[1], lockScalar(match[2], where));
    }
    return map;
  }
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const list: string[] = [];
    LOCK_FLOW_ITEM.lastIndex = 0;
    while (LOCK_FLOW_ITEM.lastIndex < inner.length) {
      const match = LOCK_FLOW_ITEM.exec(inner);
      if (!match) throw new Error(`${where} has a list that pnpm does not write`);
      list.push(lockScalar(match[1], where));
    }
    return list;
  }
  return null;
}

/** Strict parser for the pnpm 9 lockfile. Throws on any line that pnpm would not write. */
function parseLockfile(text: string): YamlMap {
  const lines = text.split('\n');
  if (lines.pop() !== '') throw new Error('the file must end with a newline');
  const root: YamlMap = new Map();
  // Each frame holds the indentation of its children.
  const stack: { indent: number; node: YamlMap | string[] }[] = [{ indent: 0, node: root }];
  let pending: { map: YamlMap; key: string; indent: number } | null = null;

  for (const [index, line] of lines.entries()) {
    const where = `line ${index + 1}`;
    // No control characters, tabs, CRs, BOMs or Unicode line breaks.
    if (CONTROL_CHARACTER.test(line)) {
      throw new Error(`${where} has a control character`);
    }
    if (line === '') continue;
    const indent = line.length - line.trimStart().length;
    const content = line.slice(indent);
    if (indent % 2 !== 0 || content.startsWith('#')) {
      throw new Error(`${where} is not in the format pnpm writes`);
    }

    if (pending) {
      // The first line under `key:` decides whether its value is a map or a list.
      if (indent !== pending.indent) throw new Error(`${where}: the key above has no value`);
      const node: YamlMap | string[] = content.startsWith('- ') ? [] : new Map();
      pending.map.set(pending.key, node);
      stack.push({ indent, node });
      pending = null;
    } else {
      while (stack.length > 1 && (stack.at(-1)?.indent ?? 0) > indent) stack.pop();
      if (stack.at(-1)?.indent !== indent) throw new Error(`${where} has the wrong indentation`);
    }

    const frame = stack.at(-1);
    if (!frame) throw new Error(`${where} is outside the document`);
    if (Array.isArray(frame.node)) {
      const item = content.match(LOCK_ITEM);
      if (!item) throw new Error(`${where} is not a list item in the format pnpm writes`);
      frame.node.push(lockScalar(item[1], where));
      continue;
    }
    const match = content.match(LOCK_LINE);
    if (!match) throw new Error(`${where} is not in the format pnpm writes`);
    const key = match[1].startsWith("'") ? match[1].slice(1, -1) : match[1];
    if (frame.node.has(key)) throw new Error(`${where} repeats the key "${key}"`);
    const raw = match[2];
    if (raw === undefined) {
      pending = { map: frame.node, key, indent: indent + 2 };
    } else {
      frame.node.set(key, lockFlow(raw, where) ?? lockScalar(raw, where));
    }
  }
  if (pending) throw new Error(`the key "${pending.key}" has no value`);
  return root;
}

function isMap(value: YamlValue | undefined): value is YamlMap {
  return value instanceof Map;
}

/** A lockfile map as a plain object, for comparisons. */
function toPlain(value: YamlValue | undefined): unknown {
  if (value === undefined) return undefined;
  if (typeof value === 'string' || Array.isArray(value)) return value;
  return Object.fromEntries([...value].map(([key, item]) => [key, toPlain(item)]));
}

/** A map section of the lockfile, {} when absent. Fails and returns null when malformed. */
function lockSection(parent: YamlMap, key: string, where: string): YamlMap | null {
  const value = parent.get(key);
  if (value === undefined) return new Map();
  if (!isMap(value)) {
    fail(`pnpm-lock.yaml: ${where}${key} is not a map.`);
    return null;
  }
  return value;
}

/** A dependency section (name -> string value), {} when absent, null when malformed. */
function lockDependencies(parent: YamlMap, key: string, where: string): DependencyMap | null {
  const section = lockSection(parent, key, where);
  if (!section) return null;
  const result: DependencyMap = {};
  for (const [name, value] of section) {
    if (typeof value !== 'string') {
      fail(`pnpm-lock.yaml: ${where}${key}.${name} is not a version.`);
      return null;
    }
    result[name] = value;
  }
  return result;
}

const registryCache = new Map<string, RegistryDoc | null>();

async function registryDoc(name: string): Promise<RegistryDoc | null> {
  if (!registryCache.has(name)) {
    const url = REGISTRY + encodeURIComponent(name).replace(/^%40/, '@');
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      registryCache.set(name, (await response.json()) as RegistryDoc);
    } catch (error) {
      // Any failure means "not verified".
      fail(`Could not read ${name} from the npm registry: ${String(error)}`);
      registryCache.set(name, null);
    }
  }
  return registryCache.get(name) ?? null;
}

async function registryManifest(name: string, version: string): Promise<RegistryVersion | null> {
  const doc = await registryDoc(name);
  if (!doc) return null;
  const manifest =
    doc.versions && Object.hasOwn(doc.versions, version) ? doc.versions[version] : undefined;
  if (!manifest) {
    fail(`pnpm-lock.yaml: ${name}@${version} is not in the npm registry.`);
    return null;
  }
  return manifest;
}

/** A new or changed `packages` entry: npm registry tarball, same integrity, old enough. */
async function checkPackage(
  id: DepPath,
  entry: YamlMap,
  minAgeDays: number,
  criticalPatches: Set<string>
): Promise<void> {
  const key = `${id.name}@${id.version}`;
  const resolution = entry.get('resolution');
  const integrity = isMap(resolution) ? resolution.get('integrity') : undefined;
  if (
    !isMap(resolution) ||
    resolution.size !== 1 ||
    typeof integrity !== 'string' ||
    !INTEGRITY.test(integrity)
  ) {
    // A `tarball`, `repo` or `directory` resolution does not come from the npm registry.
    fail(`pnpm-lock.yaml: ${key} must resolve to the npm registry with only a sha512 integrity.`);
    return;
  }
  const manifest = await registryManifest(id.name, id.version);
  if (!manifest) return;
  if (manifest.dist?.integrity !== integrity) {
    fail(`pnpm-lock.yaml: the integrity of ${key} differs from the npm registry.`);
  }
  const doc = registryCache.get(id.name);
  const published = doc?.time && Object.hasOwn(doc.time, id.version) ? doc.time[id.version] : '';
  const ageMs = Date.now() - Date.parse(published ?? '');
  if (!Number.isFinite(ageMs)) {
    fail(`pnpm-lock.yaml: no publish date for ${key}.`);
  } else if (ageMs < minAgeDays * DAY_MS && !criticalPatches.has(key)) {
    fail(
      `pnpm-lock.yaml: ${key} was published ${(published ?? '').slice(0, 10)}, less than ${minAgeDays} days ago.`
    );
  }
}

/** A new or changed snapshot: the registry's dependencies, at versions the ranges allow. */
async function checkSnapshot(
  key: string,
  id: DepPath,
  dependencies: DependencyMap,
  overrides: DependencyMap
): Promise<void> {
  const manifest = await registryManifest(id.name, id.version);
  if (!manifest) return;
  const declared: DependencyMap = { ...manifest.dependencies, ...manifest.optionalDependencies };
  const peers = manifest.peerDependencies ?? {};
  for (const name of Object.keys(declared).toSorted()) {
    if (!Object.hasOwn(dependencies, name)) {
      fail(`pnpm-lock.yaml: the snapshot ${key} does not lock its dependency ${name}.`);
    }
  }
  for (const [name, value] of Object.entries(dependencies)) {
    const range = Object.hasOwn(declared, name)
      ? declared[name]
      : Object.hasOwn(peers, name)
        ? peers[name]
        : undefined;
    if (range === undefined) {
      fail(
        `pnpm-lock.yaml: ${name} is not a dependency of ${id.name}@${id.version} in the npm registry.`
      );
      continue;
    }
    const target = resolveDepValue(name, value);
    if (!target) continue; // reported by the coverage check
    // `npm:other@^1` declares an alias. Anything else must lock the same package.
    const alias = range.match(new RegExp(`^npm:(${NAME})@(.*)$`));
    const [expectedName, expectedRange] = alias ? [alias[1], alias[2]] : [name, range];
    if (target.name !== expectedName) {
      fail(`pnpm-lock.yaml: ${key} locks ${name} as another package (${target.name}).`);
      continue;
    }
    const allowed = [expectedRange, ...overrideValues(id.name, name, overrides)];
    if (!allowed.some((candidate) => matchesRange(target.version, candidate))) {
      fail(
        `pnpm-lock.yaml: ${key} locks ${name}@${target.version}, which \`${range}\` does not allow.`
      );
    }
  }
}

interface LockCheck {
  manifest: Record<string, unknown>;
  overrides: DependencyMap;
  minAgeDays: number;
  criticalPatches: Set<string>;
}

async function checkLockfile(oldLock: YamlMap, newLock: YamlMap, check: LockCheck): Promise<void> {
  const { manifest, overrides, minAgeDays, criticalPatches } = check;
  for (const key of newLock.keys()) {
    if (!LOCK_TOP_KEYS.includes(key)) fail(`pnpm-lock.yaml: unexpected top-level key \`${key}\`.`);
  }
  if (newLock.get('lockfileVersion') !== '9.0' || oldLock.get('lockfileVersion') !== '9.0') {
    fail('pnpm-lock.yaml: `lockfileVersion` must stay 9.0.');
  }
  if (!isEqual(toPlain(oldLock.get('settings')), toPlain(newLock.get('settings')))) {
    fail('pnpm-lock.yaml: `settings` changed.');
  }
  const lockOverrides = lockDependencies(newLock, 'overrides', '');
  if (lockOverrides && !isEqual(lockOverrides, overrides)) {
    fail('pnpm-lock.yaml: `overrides` does not match `pnpm.overrides` in package.json.');
  }

  const packages = lockSection(newLock, 'packages', '');
  const snapshots = lockSection(newLock, 'snapshots', '');
  const oldPackages = lockSection(oldLock, 'packages', 'main ') ?? new Map();
  const oldSnapshots = lockSection(oldLock, 'snapshots', 'main ') ?? new Map();
  const importers = lockSection(newLock, 'importers', '');
  if (!packages || !snapshots || !importers) return;

  // --- importers: the one package of this repository ---
  const importer = importers.get('.');
  if (importers.size !== 1 || !isMap(importer)) {
    fail('pnpm-lock.yaml: `importers` must hold only `.`.');
    return;
  }
  for (const field of importer.keys()) {
    if (!IMPORTER_KEYS.includes(field))
      fail(`pnpm-lock.yaml: unexpected importer field \`${field}\`.`);
  }
  for (const field of INSTALLED_FIELDS) {
    const wanted = dependencyMap(manifest[field]) ?? {};
    const locked = lockSection(importer, field, 'importers.. ');
    if (!locked) continue;
    if (!isEqual(Object.keys(wanted).toSorted(), [...locked.keys()].toSorted())) {
      fail(`pnpm-lock.yaml: the importer's ${field} do not match package.json.`);
    }
    for (const [name, item] of locked) {
      const where = `importer ${field}.${name}`;
      const specifier = isMap(item) ? item.get('specifier') : undefined;
      const version = isMap(item) ? item.get('version') : undefined;
      if (
        !isMap(item) ||
        item.size !== 2 ||
        typeof specifier !== 'string' ||
        typeof version !== 'string'
      ) {
        fail(`pnpm-lock.yaml: ${where} must have only a specifier and a version.`);
        continue;
      }
      const allowed = [wanted[name], ...overrideValues('', name, overrides)];
      if (!allowed.includes(specifier)) {
        fail(`pnpm-lock.yaml: the specifier of ${where} does not match package.json.`);
      }
      const target = resolveDepValue(name, version);
      if (!target || target.name !== name) {
        fail(`pnpm-lock.yaml: ${where} must lock a registry version of ${name}.`);
      } else if (!matchesRange(target.version, specifier)) {
        fail(
          `pnpm-lock.yaml: ${where} locks ${target.version}, which \`${specifier}\` does not allow.`
        );
      } else if (!snapshots.has(target.key)) {
        fail(`pnpm-lock.yaml: ${where} points to ${target.key}, which is not locked.`);
      }
    }
  }

  // --- packages: one entry per name@version, from the npm registry ---
  for (const [key, entry] of packages) {
    const id = parseDepPath(key);
    if (!id || key !== `${id.name}@${id.version}` || !isMap(entry)) {
      fail(`pnpm-lock.yaml: \`${key}\` is not a package entry in the format pnpm writes.`);
      continue;
    }
    for (const field of entry.keys()) {
      if (!PACKAGE_KEYS.includes(field))
        fail(`pnpm-lock.yaml: unexpected field \`${field}\` in ${key}.`);
    }
    if (isEqual(toPlain(oldPackages.get(key)), toPlain(entry))) continue; // unchanged since main
    await checkPackage(id, entry, minAgeDays, criticalPatches);
  }

  // --- snapshots: every dependency locked, new ones checked against the registry ---
  for (const [key, entry] of snapshots) {
    const id = parseDepPath(key);
    if (!id || !isMap(entry)) {
      fail(`pnpm-lock.yaml: \`${key}\` is not a snapshot in the format pnpm writes.`);
      continue;
    }
    if (!packages.has(`${id.name}@${id.version}`)) {
      fail(`pnpm-lock.yaml: the snapshot ${key} has no package entry.`);
    }
    for (const field of entry.keys()) {
      if (!SNAPSHOT_KEYS.includes(field))
        fail(`pnpm-lock.yaml: unexpected field \`${field}\` in ${key}.`);
    }
    const regular = lockDependencies(entry, 'dependencies', `${key} `);
    const optional = lockDependencies(entry, 'optionalDependencies', `${key} `);
    if (!regular || !optional) continue;
    const dependencies = { ...regular, ...optional };
    for (const [name, value] of Object.entries(dependencies)) {
      const target = resolveDepValue(name, value);
      if (!target || !snapshots.has(target.key)) {
        fail(`pnpm-lock.yaml: ${key} depends on ${name}@${value}, which is not locked.`);
      }
    }
    if (isEqual(toPlain(oldSnapshots.get(key)), toPlain(entry))) continue; // unchanged since main
    await checkSnapshot(key, id, dependencies, overrides);
  }
}

/** Open alerts that had a vulnerable version in the old lockfile and have none in the new one. */
function fixedAlerts(alerts: Alert[], oldLock: YamlMap, newLock: YamlMap): number[] {
  const versions = (lock: YamlMap, name: string): string[] => {
    const packages = lock.get('packages');
    return isMap(packages)
      ? [...packages.keys()]
          .map(parseDepPath)
          .filter((id): id is DepPath => id !== null && id.name === name)
          .map((id) => id.version)
      : [];
  };
  return alerts
    .filter((alert) => {
      const range = (alert.security_vulnerability?.vulnerable_version_range ?? '').replace(
        /,/g,
        ' '
      );
      if (!range.trim() || !parseRange(range)) return false;
      const vulnerable = (lock: YamlMap) =>
        versions(lock, alert.dependency.package.name).some((version) => satisfies(version, range));
      return vulnerable(oldLock) && !vulnerable(newLock);
    })
    .map((alert) => alert.number);
}

// --- package.json --------------------------------------------------------------------

function checkNewOverride(key: string, value: string, alertsByPackage: Map<string, Alert[]>): void {
  const where = `package.json: new override \`${key}\``;
  const target = parseOverrideKey(key);
  if (!target) {
    fail(`${where} must be \`<package>[@<range>]\` or \`<parent>><package>[@<range>]\`.`);
    return;
  }
  const related = alertsByPackage.get(target.name) ?? [];
  if (related.length === 0) {
    fail(`${where} is not for a package in an open alert.`);
  } else if (related.some((alert) => alert.dependency.scope !== 'development')) {
    // Overrides apply to this repository only: one would close the alert while npm
    // users of the published package still install the vulnerable version.
    fail(`${where}: the package has an alert that is not development-scope.`);
  }
  for (const alert of related) {
    const patched = parseVersion(
      alert.security_vulnerability?.first_patched_version?.identifier ?? ''
    );
    const pinned = parseVersion(value);
    if (patched && pinned && compareVersions(pinned, patched) < 0) {
      fail(`${where} pins ${value}, below the first patched version.`);
    }
  }
}

/** Checks one dependency field. Returns whether any value in it changed. */
function checkDependencyField(
  where: string,
  oldDeps: DependencyMap,
  newDeps: DependencyMap,
  onNewKey: ((key: string, value: string) => void) | null
): boolean {
  let changed = false;
  for (const key of Object.keys(oldDeps).toSorted()) {
    if (!Object.hasOwn(newDeps, key)) {
      fail(`${where}.${key}\` was removed.`);
      changed = true;
    }
  }
  for (const key of Object.keys(newDeps).toSorted()) {
    const value = newDeps[key];
    const old = Object.hasOwn(oldDeps, key) ? oldDeps[key] : undefined;
    if (value === old) continue;
    changed = true;
    if (!EXACT_VERSION.test(value)) {
      fail(`${where}.${key}\` is \`${value}\`, which is not an exact version.`);
    } else if (old === undefined) {
      if (onNewKey) onNewKey(key, value);
      else fail(`${where}.${key}\` was added.`);
    } else {
      // A protocol or a path (`npm:other@^1`, `workspace:*`, `file:…`, a URL) names
      // another package or source, so it must not become a registry version.
      const floor = /[:/]/.test(old) ? null : minVersion(old);
      const next = parseVersion(value);
      if (!floor) {
        fail(`${where}.${key}\` was \`${old}\`, which is not a registry version range.`);
      } else if (!next || compareVersions(next, floor) < 0) {
        fail(`${where}.${key}\` goes from \`${old}\` down to \`${value}\`.`);
      }
    }
  }
  return changed;
}

async function main(): Promise<number> {
  const alerts = readJson<Alert[]>(process.env.ALERTS ?? '');
  const decisions = readJson<unknown>(process.env.DECISIONS ?? '');
  const changeset = process.env.CHANGESET ?? '';
  const minAge = process.env.MIN_RELEASE_AGE_DAYS ?? '';
  if (!/^[0-9]+$/.test(minAge)) {
    fail(`MIN_RELEASE_AGE_DAYS is \`${minAge}\`, not a whole number of days.`);
    return 1;
  }
  const minAgeDays = Number(minAge);

  const openAlerts = new Map(alerts.map((alert) => [String(alert.number), alert]));
  const alertsByPackage = new Map<string, Alert[]>();
  for (const alert of alerts) {
    const name = alert.dependency.package.name;
    alertsByPackage.set(name, [...(alertsByPackage.get(name) ?? []), alert]);
  }

  // Only the FIRST PATCHED version of a CRITICAL alert that Claude chose to FIX may
  // skip the release-age check, and only when the decision matches the live alert.
  const criticalPatches = new Set<string>();
  for (const decision of Array.isArray(decisions) ? (decisions as Decision[]) : []) {
    if (typeof decision !== 'object' || decision === null) continue;
    const alert = openAlerts.get(String(decision.number));
    const patched = alert?.security_vulnerability?.first_patched_version?.identifier;
    if (
      alert &&
      typeof patched === 'string' &&
      decision.decision === 'FIX' &&
      decision.package === alert.dependency.package.name &&
      decision.ghsa === alert.security_advisory.ghsa_id &&
      alert.security_advisory.severity === 'critical'
    ) {
      criticalPatches.add(`${alert.dependency.package.name}@${patched}`);
    }
  }

  // --- package.json -------------------------------------------------------------
  const beforeText = gitShowHead('package.json');
  if (beforeText === null) {
    fail('package.json is missing on main.');
    return 1;
  }
  const before = JSON.parse(beforeText) as Record<string, unknown>;
  const after = readJson<Record<string, unknown>>('package.json');
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (key === 'pnpm') {
      if (
        !isEqual(pnpmWithoutOverrides(before), pnpmWithoutOverrides(after)) &&
        !(before.pnpm === undefined && isEqual(pnpmWithoutOverrides(after), {}))
      ) {
        fail('package.json: `pnpm` changed. Only `pnpm.overrides` may change.');
      }
    } else if (!INSTALLED_FIELDS.includes(key) && !isEqual(before[key], after[key])) {
      fail(`package.json: \`${key}\` changed. Only dependency fields may change.`);
    }
  }

  let shippedChanged = false;
  for (const field of INSTALLED_FIELDS) {
    const oldDeps = dependencyMap(before[field]);
    const newDeps = dependencyMap(after[field]);
    if (!oldDeps || !newDeps) {
      fail(`package.json: \`${field}\` must map package names to version strings.`);
      continue;
    }
    const changed = checkDependencyField(`package.json: \`${field}`, oldDeps, newDeps, null);
    if (changed && SHIPPED_FIELDS.includes(field)) shippedChanged = true;
  }
  const oldOverrides = overridesOf(before);
  const overrides = overridesOf(after);
  if (!oldOverrides || !overrides) {
    fail('package.json: `pnpm.overrides` must map package names to version strings.');
    return 1;
  }
  checkDependencyField('package.json: `pnpm.overrides', oldOverrides, overrides, (key, value) =>
    checkNewOverride(key, value, alertsByPackage)
  );

  // --- changeset ----------------------------------------------------------------
  if (existsSync(changeset)) {
    const frontmatter = readFileSync(changeset, 'utf8').match(CHANGESET_FRONTMATTER);
    const lines = frontmatter ? frontmatter[1].slice(0, -1).split('\n') : [];
    if (lines.length !== 1 || !CHANGESET_LINE.test(lines[0] ?? '')) {
      fail(`${changeset} must have a frontmatter with only \`'${PACKAGE}': patch\`.`);
    }
    if (!shippedChanged) {
      fail(`${changeset} must not exist: no dependency that ships to users changed.`);
    }
  } else if (shippedChanged) {
    fail(`Dependencies that ship to users changed, so ${changeset} must bump ${PACKAGE} (patch).`);
  }

  // --- pnpm-lock.yaml -----------------------------------------------------------
  // Checked even when unchanged: a manifest edit without a lockfile update leaves the
  // new version to an unchecked install.
  let oldLock: YamlMap | null = null;
  let newLock: YamlMap | null = null;
  try {
    oldLock = parseLockfile(gitShowHead('pnpm-lock.yaml') ?? '');
  } catch (error) {
    fail(`pnpm-lock.yaml on main cannot be checked: ${(error as Error).message}.`);
  }
  try {
    newLock = parseLockfile(readFileSync('pnpm-lock.yaml', 'utf8'));
  } catch (error) {
    fail(`pnpm-lock.yaml: ${(error as Error).message}.`);
  }
  if (oldLock && newLock) {
    await checkLockfile(oldLock, newLock, {
      manifest: after,
      overrides,
      minAgeDays,
      criticalPatches,
    });
    if (process.env.FIXED_ALERTS) {
      writeFileSync(
        process.env.FIXED_ALERTS,
        JSON.stringify(fixedAlerts(alerts, oldLock, newLock))
      );
    }
  }

  // Every changed path must be one this script checked (the workflow allowlist is the
  // first line of defence).
  for (const path of git('diff', '--cached', '--name-only').split('\n').filter(Boolean)) {
    if (path !== 'package.json' && path !== 'pnpm-lock.yaml' && path !== changeset) {
      fail(
        `${path} changed, but triage may only change package.json, pnpm-lock.yaml and ${changeset}.`
      );
    }
  }

  if (errors.length > 0) {
    console.log(`${errors.length} check(s) failed. The triage diff was not published.`);
    return 1;
  }
  console.log('The triage diff passed every check.');
  return 0;
}

process.exitCode = await main();
