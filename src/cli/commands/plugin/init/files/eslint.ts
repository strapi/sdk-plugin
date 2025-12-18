import { outdent } from 'outdent';

import type { TemplateFile } from '../../../utils/init/types';

const eslintIgnoreFile: TemplateFile = {
  name: '.eslintignore',
  contents: outdent`
      dist
    `,
};

export { eslintIgnoreFile };
