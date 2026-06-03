import fs from 'fs/promises';
import os from 'os';
import * as yup from 'yup';

import { getChalk } from './chalk-loader';
import { findPackageJson } from './find-package-json';

import type { Logger } from './logger';

interface Export {
  types?: string;
  source: string;
  module?: string;
  import?: string;
  require?: string;
  default: string;
}

const getReachableSchemaType = (schema: yup.AnyObjectSchema, path: string): string => {
  const reachable = yup.reach(schema, path);

  return reachable && typeof reachable === 'object' && 'describe' in reachable
    ? reachable.describe().type
    : 'unknown';
};

const packageJsonSchema = yup.object({
  name: yup.string().required(),
  exports: yup.lazy((value) =>
    yup
      .object(
        typeof value === 'object'
          ? Object.entries(value).reduce(
              (acc, [key, keyValue]) => {
                if (typeof keyValue === 'object') {
                  // Standard exports require both import and require
                  const isStandardExport = key === './strapi-admin' || key === './strapi-server';
                  acc[key] = yup
                    .object({
                      types: yup.string().optional(),
                      source: yup.string().required(),
                      module: yup.string().optional(),
                      import: isStandardExport ? yup.string().required() : yup.string().optional(),
                      require: isStandardExport ? yup.string().required() : yup.string().optional(),
                      default: yup.string().required(),
                    })
                    .noUnknown(true);
                } else {
                  acc[key] = yup.string().required();
                }

                return acc;
              },
              {} as Record<string, yup.AnySchema>
            )
          : undefined
      )
      .required()
  ),
});

/**
 * @description being a task to load the package.json starting from the current working directory
 * using a shallow find for the package.json  and `fs` to read the file. If no package.json is found,
 * the process will throw with an appropriate error message.
 */
const loadPkg = async ({ cwd, logger }: { cwd: string; logger: Logger }): Promise<object> => {
  const pkgPath = await findPackageJson(cwd);

  if (!pkgPath) {
    throw new Error('Could not find a package.json in the current directory');
  }

  const buffer = await fs.readFile(pkgPath);

  const pkg = JSON.parse(buffer.toString());

  logger.debug('Loaded package.json:', os.EOL, pkg);

  return pkg;
};

type PackageJson = {
  name: string;
  exports: Record<string, Export | string>;
};

/**
 * @description validate the package.json against a standardised schema using `yup`.
 * If the validation fails, the process will throw with an appropriate error message.
 */
const validatePkg = async ({ pkg }: { pkg: object }): Promise<PackageJson> => {
  try {
    const validatedPkg = await packageJsonSchema.validate(pkg, {
      strict: true,
    });

    return validatedPkg as PackageJson;
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      switch (err.type) {
        case 'required':
          if (err.path) {
            throw new Error(
              `'${err.path}' in 'package.json' is required as type '${getChalk().magenta(
                getReachableSchemaType(packageJsonSchema, err.path)
              )}'`
            );
          }
          break;
        /**
         * This will only be thrown if there are keys in the export map
         * that we don't expect so we can therefore make some assumptions
         */
        case 'noUnknown':
          if (err.path && err.params && 'unknown' in err.params) {
            throw new Error(
              `'${err.path}' in 'package.json' contains the unknown key ${getChalk().magenta(
                err.params.unknown
              )}, for compatability only the following keys are allowed: ${getChalk().magenta(
                "['types', 'source', 'import', 'require', 'default']"
              )}`
            );
          }
          break;
        default:
          if (err.path && err.params && 'type' in err.params && 'value' in err.params) {
            throw new Error(
              `'${err.path}' in 'package.json' must be of type '${getChalk().magenta(
                err.params.type
              )}' (recieved '${getChalk().magenta(typeof err.params.value)}')`
            );
          }
      }
    }

    throw err;
  }
};

export type { PackageJson, Export };
export { loadPkg, validatePkg };
