import { outdent } from 'outdent';

import type { TemplateFile } from '@strapi/pack-up';

const gitIgnoreFile: TemplateFile = {
  name: '.gitignore',
  contents: outdent`
    # See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

    # dependencies
    node_modules
    .pnp
    .pnp.js
    
    # testing
    coverage
    
    # production
    dist
    
    # misc
    .DS_Store
    *.pem
    
    # debug
    npm-debug.log*
    yarn-debug.log*
    yarn-error.log*
    
    # local env files
    .env

    # ts build cache
    .tsbuildinfo
    `,
};

export { gitIgnoreFile };
