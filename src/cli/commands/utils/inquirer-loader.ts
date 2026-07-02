import { importEsm, resolveDefaultExport } from './esm-interop';

import type inquirer from 'inquirer';

export const loadInquirer = async (): Promise<typeof inquirer> => {
  const mod = await importEsm('inquirer');

  return resolveDefaultExport<typeof inquirer>(mod);
};
