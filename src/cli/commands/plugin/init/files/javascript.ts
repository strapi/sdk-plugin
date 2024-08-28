import { outdent } from 'outdent';

import type { TemplateFile } from '@strapi/pack-up';

const ADMIN: TemplateFile = {
  name: 'admin/jsconfig.json',
  contents: outdent`
      {
        "compilerOptions": {
          "target": "es6",
          "jsx": "react",
          "module": "esnext",
          "allowSyntheticDefaultImports": true,
          "esModuleInterop": true
        },
        "include": [
          "./src/**/*.js",
          "./src/**/*.jsx"
        ]
      }
    `,
};

export { ADMIN as adminJsConfigFile };
