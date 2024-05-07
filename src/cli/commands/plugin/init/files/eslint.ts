import { outdent } from 'outdent';

import type { TemplateFile } from '@strapi/pack-up';

const eslintIgnoreFile: TemplateFile = {
  name: '.eslintignore',
  contents: outdent`
      dist
    `,
};

export { eslintIgnoreFile };
