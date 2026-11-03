import { filterExports, toBundleRuntime, toSourceDirName } from '../../cli/commands/utils/bundles';

import type { Export } from '../../cli/commands/utils/pkg';

const exportFor = (dir: string): Export => ({
  types: `./dist/${dir}/src/index.d.ts`,
  source: `./${dir}/src/index.ts`,
  import: `./dist/${dir}/index.mjs`,
  require: `./dist/${dir}/index.js`,
  default: `./dist/${dir}/index.js`,
});

const exports = {
  './strapi-admin': exportFor('admin'),
  './strapi-server': exportFor('server'),
  './shared': exportFor('shared'),
  './package.json': './package.json',
};

const AVAILABLE = 'Available bundles: ./strapi-admin, ./strapi-server, ./shared';

describe('filterExports', () => {
  it('should keep only the requested bundle', () => {
    expect(Object.keys(filterExports(exports, ['./strapi-server']))).toEqual(['./strapi-server']);
  });

  it('should keep several bundles in package.json order', () => {
    expect(Object.keys(filterExports(exports, ['./shared', './strapi-admin']))).toEqual([
      './strapi-admin',
      './shared',
    ]);
  });

  it('should refuse an empty selection instead of keeping everything', () => {
    expect(() => filterExports(exports, [])).toThrow(
      `The --bundle option needs a bundle name. ${AVAILABLE}`
    );
  });

  it('should refuse a blank bundle name', () => {
    expect(() => filterExports(exports, [''])).toThrow('The --bundle option needs a bundle name.');
  });

  it('should refuse a duplicated bundle name', () => {
    expect(() => filterExports(exports, ['./shared', './shared'])).toThrow(
      'Duplicate bundle "./shared" in the selection.'
    );
  });

  it('should refuse a name missing the leading "./", and say why', () => {
    expect(() => filterExports(exports, ['strapi-server'])).toThrow(
      `Unknown bundle "strapi-server". A bundle name is the export key exactly as written in package.json, including its leading "./". ${AVAILABLE}`
    );
  });

  it('should refuse a name that only differs in case', () => {
    expect(() => filterExports(exports, ['./Strapi-Admin'])).toThrow(
      'Unknown bundle "./Strapi-Admin".'
    );
  });

  it('should report every unknown name at once', () => {
    expect(() => filterExports(exports, ['nope', './strapi-admin', 'nah'])).toThrow(
      `Unknown bundle "nope", "nah". ${AVAILABLE}`
    );
  });

  it('should refuse a string export such as ./package.json', () => {
    expect(() => filterExports(exports, ['./package.json'])).toThrow(
      'Unknown bundle "./package.json".'
    );
  });
});

describe('toBundleRuntime', () => {
  it('should build the admin export for the browser', () => {
    expect(toBundleRuntime('./strapi-admin')).toBe('browser');
  });

  it('should build the server export for node', () => {
    expect(toBundleRuntime('./strapi-server')).toBe('node');
  });

  it('should build a custom export for node', () => {
    expect(toBundleRuntime('./shared')).toBe('node');
  });

  it('should not treat a custom ./admin export as the Strapi admin panel', () => {
    expect(toBundleRuntime('./admin')).toBe('node');
  });
});

describe('toSourceDirName', () => {
  it('should drop the leading "./" and the strapi- prefix of the Strapi exports', () => {
    expect(toSourceDirName('./strapi-admin')).toBe('admin');
    expect(toSourceDirName('./strapi-server')).toBe('server');
  });

  it('should keep the name of a custom export', () => {
    expect(toSourceDirName('./shared')).toBe('shared');
  });
});
