import chalk from 'chalk';
import fs from 'fs/promises';
import os from 'os';
import pkgUp from 'pkg-up';
import * as yup from 'yup';

import type { Logger } from './logger';

interface Export {
  types?: string;
  source: string;
  module?: string;
  import?: string;
  require?: string;
  default: string;
}

/**
 * @description being a task to load the package.json starting from the current working directory
 * using a shallow find for the package.json  and `fs` to read the file. If no package.json is found,
 * the process will throw with an appropriate error message.
 */
const loadPkg = async ({ cwd, logger }: { cwd: string; logger: Logger }): Promise<object> => {
  const pkgPath = await pkgUp({ cwd });

  if (!pkgPath) {
    throw new Error('Could not find a package.json in the current directory');
  }

  const buffer = await fs.readFile(pkgPath);

  const pkg = JSON.parse(buffer.toString());

  logger.debug('Loaded package.json:', os.EOL, pkg);

  return pkg;
};

/**
 * The schema for the package.json that we expect,
 * currently pretty loose.
 */
const createPackageJsonSchema = (logger: Logger) =>
  yup.object({
    name: yup.string().required(),
    exports: yup.lazy((value) =>
      yup
        .object(
          typeof value === 'object'
            ? Object.entries(value).reduce((acc, [key, v]) => {
                if (typeof v === 'object') {
                  acc[key] = yup
                    .object({
                      types: yup.string().optional(),
                      source: yup.string().required(),
                      module: yup.string().optional(),
                      import: yup.string().required(),
                      require: yup.string().required(),
                      default: yup.string().required(),
                    })
                    .test('warn-on-unknown-keys', 'Unknown keys in exports', (obj) => {
                      const knownKeys = [
                        'types',
                        'source',
                        'module',
                        'import',
                        'require',
                        'default',
                      ];
                      const unknownKeys = Object.keys(obj).filter((k) => !knownKeys.includes(k));
                      if (unknownKeys.length > 0) {
                        logger.warn(`Warning: Unknown keys in exports: ${unknownKeys.join(', ')}`);
                      }

                      return true;
                    });
                } else {
                  acc[key] = yup
                    .string()
                    .test(
                      'warn-regex',
                      'Value does not match the required regex',
                      (nonObjectValue) => {
                        const regex = /^\.\/.*\.json$/;
                        if (nonObjectValue && !regex.test(nonObjectValue)) {
                          logger.warn(
                            `Warning: Value "${nonObjectValue}" does not match the required regex ${regex}`
                          );
                        }
                        return true;
                      }
                    )
                    .required();
                }
                return acc;
              }, {} as Record<string, yup.SchemaOf<string> | yup.SchemaOf<Export>>)
            : undefined
        )
        .optional()
    ),
  });

interface PackageJson
  extends Omit<yup.Asserts<ReturnType<typeof createPackageJsonSchema>>, 'type'> {
  type?: 'commonjs' | 'module';
}

/**
 * @description validate the package.json against a standardised schema using `yup`.
 * If the validation fails, the process will throw with an appropriate error message.
 */
const validatePkg = async ({
  pkg,
  logger,
}: {
  pkg: object;
  logger: Logger;
}): Promise<PackageJson> => {
  const packageJsonSchema = createPackageJsonSchema(logger);

  try {
    const validatedPkg = await packageJsonSchema.validate(pkg, {
      strict: true,
    });

    return validatedPkg;
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      switch (err.type) {
        case 'required':
          if (err.path) {
            throw new Error(
              `'${err.path}' in 'package.json' is required as type '${chalk.magenta(
                yup.reach(packageJsonSchema, err.path).type
              )}'`
            );
          }
          break;
        default:
          if (err.path && err.params && 'type' in err.params && 'value' in err.params) {
            throw new Error(
              `'${err.path}' in 'package.json' must be of type '${chalk.magenta(
                err.params.type
              )}' (received '${chalk.magenta(typeof err.params.value)}')`
            );
          }
      }
    }

    throw err;
  }
};

export type { PackageJson, Export };
export { loadPkg, validatePkg };
