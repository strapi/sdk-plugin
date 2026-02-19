import { outdent } from 'outdent';

import type { TemplateFile } from '../../../utils/init/types';

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

const SERVER: TemplateFile = {
  name: 'server/jsconfig.json',
  contents: outdent`
      {
        "compilerOptions": {
          "target": "es6",
          "module": "commonjs",
          "allowSyntheticDefaultImports": true,
          "esModuleInterop": true
        },
        "include": [
          "./src/**/*.js",
        ],
        "exclude": ["node_modules"]
      }
    `,
};

export { ADMIN as adminJsConfigFile, SERVER as serverJsConfigFile };
