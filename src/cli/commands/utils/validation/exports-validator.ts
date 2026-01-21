/**
 * Validates package.json export field ordering.
 *
 * Ensures "types" is first in each export object - required for TypeScript
 * resolution to work correctly with the "moduleResolution": "bundler" setting.
 *
 * @see https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-exports
 */
import type { Logger, PackageJson } from './pkg-loader';

/** @internal */
function assertFirst(key: string, arr: string[]) {
  const aIdx = arr.indexOf(key);

  if (aIdx === -1) {
    // if not found, then we don't care
    return true;
  }

  return aIdx === 0;
}

/** @internal */
function assertLast(key: string, arr: string[]) {
  const aIdx = arr.indexOf(key);

  if (aIdx === -1) {
    // if not found, then we don't care
    return true;
  }

  return aIdx === arr.length - 1;
}

/** @internal */
function assertOrder(keyA: string, keyB: string, arr: string[]) {
  const aIdx = arr.indexOf(keyA);
  const bIdx = arr.indexOf(keyB);

  if (aIdx === -1 || bIdx === -1) {
    // if either is not found, then we don't care
    return true;
  }

  return aIdx < bIdx;
}

/**
 * @description validate the `exports` property of the package.json against a set of rules.
 * If the validation fails, the process will throw with an appropriate error message. If
 * there is no `exports` property we check the standard export-like properties on the root
 * of the package.json.
 */
export const validateExportsOrdering = async ({
  pkg,
  logger,
}: {
  pkg: PackageJson;
  logger: Logger;
}): Promise<PackageJson> => {
  if (pkg.exports) {
    const exports = Object.entries(pkg.exports);

    for (const [expPath, exp] of exports) {
      if (typeof exp === 'string') {
        // eslint-disable-next-line no-continue
        continue;
      }

      const keys = Object.keys(exp);

      if (!assertFirst('types', keys)) {
        throw new Error(`exports["${expPath}"]: the 'types' property should be the first property`);
      }

      if (exp.node) {
        const nodeKeys = Object.keys(exp.node);

        if (!assertOrder('module', 'import', nodeKeys)) {
          throw new Error(
            `exports["${expPath}"]: the 'node.module' property should come before the 'node.import' property`
          );
        }

        if (!assertOrder('import', 'require', nodeKeys)) {
          logger.warn(
            `exports["${expPath}"]: the 'node.import' property should come before the 'node.require' property`
          );
        }

        if (!assertOrder('module', 'require', nodeKeys)) {
          logger.warn(
            `exports["${expPath}"]: the 'node.module' property should come before 'node.require' property`
          );
        }

        if (exp.import && exp.node.import && !assertOrder('node', 'import', keys)) {
          throw new Error(
            `exports["${expPath}"]: the 'node' property should come before the 'import' property`
          );
        }

        if (exp.module && exp.node.module && !assertOrder('node', 'module', keys)) {
          throw new Error(
            `exports["${expPath}"]: the 'node' property should come before the 'module' property`
          );
        }

        /**
         * If there's a `node.import` property but not a `node.require` we can assume `node.import`
         * is wrapping `import` and `node.module` should be added for bundlers.
         */
        if (
          exp.node.import &&
          (!exp.node.require || exp.require === exp.node.require) &&
          !exp.node.module
        ) {
          logger.warn(
            `exports["${expPath}"]: the 'node.module' property should be added so bundlers don't unintentionally try to bundle 'node.import'. Its value should be '"module": "${exp.import}"'`
          );
        }

        if (
          exp.node.import &&
          !exp.node.require &&
          exp.node.module &&
          exp.import &&
          exp.node.module !== exp.import
        ) {
          throw new Error(
            `exports["${expPath}"]: the 'node.module' property should match 'import'`
          );
        }

        if (exp.require && exp.node.require && exp.require === exp.node.require) {
          throw new Error(
            `exports["${expPath}"]: the 'node.require' property isn't necessary as it's identical to 'require'`
          );
        } else if (exp.require && exp.node.require && !assertOrder('node', 'require', keys)) {
          throw new Error(
            `exports["${expPath}"]: the 'node' property should come before the 'require' property`
          );
        }
      } else {
        if (!assertOrder('import', 'require', keys)) {
          logger.warn(
            `exports["${expPath}"]: the 'import' property should come before the 'require' property`
          );
        }

        if (!assertOrder('module', 'import', keys)) {
          logger.warn(
            `exports["${expPath}"]: the 'module' property should come before 'import' property`
          );
        }
      }
      if (!assertLast('default', keys)) {
        throw new Error(
          `exports["${expPath}"]: the 'default' property should be the last property`
        );
      }
    }
  } else if (!['main', 'module'].some((key) => Object.prototype.hasOwnProperty.call(pkg, key))) {
    throw new Error("'package.json' must contain a 'main' and 'module' property");
  }

  return pkg;
};
