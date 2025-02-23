import { outdent } from 'outdent';

import type { TemplateFile } from '@strapi/pack-up';

const TYPESCRIPT = (pluginName: string): TemplateFile[] => [
  {
    name: 'server/src/index.ts',
    contents: outdent`
    /**
     * Application methods
     */
    import bootstrap from './bootstrap';
    import destroy from './destroy';
    import register from './register';

    /**
     * Plugin server methods
     */
    import config from './config';
    import contentTypes from './content-types';
    import controllers from './controllers';
    import middlewares from './middlewares';
    import policies from './policies';
    import routes from './routes';
    import services from './services';

    export default {
      register,
      bootstrap,
      destroy,
      config,
      controllers,
      routes,
      services,
      contentTypes,
      policies,
      middlewares,
    };
    `,
  },
  {
    name: 'server/src/bootstrap.ts',
    contents: outdent`
    import type { Core } from '@strapi/strapi';

    const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
      // bootstrap phase
    };

    export default bootstrap;
    `,
  },
  {
    name: 'server/src/destroy.ts',
    contents: outdent`
    import type { Core } from '@strapi/strapi';

    const destroy = ({ strapi }: { strapi: Core.Strapi }) => {
      // destroy phase
    };

    export default destroy;
    `,
  },
  {
    name: 'server/src/register.ts',
    contents: outdent`
    import type { Core } from '@strapi/strapi';

    const register = ({ strapi }: { strapi: Core.Strapi }) => {
      // register phase
    };

    export default register;
    `,
  },
  {
    name: 'server/src/config/index.ts',
    contents: outdent`
      export default {
        default: {},
        validator() {},
      };
    `,
  },
  {
    name: 'server/src/content-types/index.ts',
    contents: outdent`
    export default {};
    `,
  },
  {
    name: 'server/src/controllers/index.ts',
    contents: outdent`
    import controller from './controller';

    export default {
      controller,
    };
    `,
  },
  {
    name: 'server/src/controllers/controller.ts',
    contents: outdent`
    import type { Core } from '@strapi/strapi';

    const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
      index(ctx) {
        ctx.body = strapi
          .plugin('${pluginName}')
          // the name of the service file & the method.
          .service('service')
          .getWelcomeMessage();
      },
    });

    export default controller
    `,
  },
  {
    name: 'server/src/middlewares/index.ts',
    contents: outdent`
    export default {};
    `,
  },
  {
    name: 'server/src/policies/index.ts',
    contents: outdent`
    export default {};
    `,
  },
  {
    name: 'server/src/routes/content-api.ts',
    contents: outdent`
    export default [
        {
          method: 'GET',
          path: '/',
          // name of the controller file & the method.
          handler: 'controller.index',
          config: {
            policies: [],
          },
        },
      ];
    `,
  },
  {
    name: 'server/src/routes/index.ts',
    contents: outdent`
    import contentAPIRoutes from './content-api';

    const routes = {
      'content-api': {
        type: 'content-api',
        routes: contentAPIRoutes,
      },
    };

    export default routes;
    `,
  },
  {
    name: 'server/src/services/index.ts',
    contents: outdent`
    import service from './service';

    export default {
      service,
    };
    `,
  },
  {
    name: 'server/src/services/service.ts',
    contents: outdent`
    import type { Core } from '@strapi/strapi';

    const service = ({ strapi }: { strapi: Core.Strapi }) => ({
        getWelcomeMessage() {
            return 'Welcome to Strapi 🚀';
        },
    });

    export default service
    `,
  },
];

const JAVASCRIPT = (pluginName: string): TemplateFile[] => [
  {
    name: 'server/src/index.js',
    contents: outdent`
        /**
         * Application methods
         */
        import bootstrap from './bootstrap';
        import destroy from './destroy';
        import register from './register';

        /**
         * Plugin server methods
         */
        import config from './config';
        import contentTypes from './content-types';
        import controllers from './controllers';
        import middlewares from './middlewares';
        import policies from './policies';
        import routes from './routes';
        import services from './services';

        export default {
            bootstrap,
            destroy,
            register,

            config,
            controllers,
            contentTypes,
            middlewares,
            policies,
            routes,
            services,
        };
        `,
  },
  {
    name: 'server/src/bootstrap.js',
    contents: outdent`
        const bootstrap = ({ strapi }) => {
          // bootstrap phase
        };

        export default bootstrap;
        `,
  },
  {
    name: 'server/src/destroy.js',
    contents: outdent`
        const destroy = ({ strapi }) => {
          // destroy phase
        };

        export default destroy;
        `,
  },
  {
    name: 'server/src/register.js',
    contents: outdent`
        const register = ({ strapi }) => {
          // register phase
        };

        export default register;
        `,
  },
  {
    name: 'server/src/config/index.js',
    contents: outdent`
      export default {
        default: {},
        validator() {},
      };
    `,
  },
  {
    name: 'server/src/content-types/index.js',
    contents: outdent`
    export default {};
    `,
  },
  {
    name: 'server/src/controllers/index.js',
    contents: outdent`
    import controller from './controller';

    export default {
        controller,
    };
    `,
  },
  {
    name: 'server/src/controllers/controller.js',
    contents: outdent`
    const controller = ({ strapi }) => ({
      index(ctx) {
        ctx.body = strapi
          .plugin('${pluginName}')
          // the name of the service file & the method.
          .service('service')
          .getWelcomeMessage();
      },
    });

    export default controller
    `,
  },
  {
    name: 'server/src/middlewares/index.js',
    contents: outdent`
    export default {};
    `,
  },
  {
    name: 'server/src/policies/index.js',
    contents: outdent`
    export default {};
    `,
  },
  {
    name: 'server/src/routes/content-api.js',
    contents: outdent`
    export default [
        {
          method: 'GET',
          path: '/',
          // name of the controller file & the method.
          handler: 'controller.index',
          config: {
            policies: [],
          },
        },
      ];
    `,
  },
  {
    name: 'server/src/routes/index.js',
    contents: outdent`
    import contentAPIRoutes from './content-api';

    const routes = {
      'content-api': {
        type: 'content-api',
        routes: contentAPIRoutes,
      },
    };

    export default routes;
    `,
  },
  {
    name: 'server/src/services/index.js',
    contents: outdent`
    import service from './service';

    export default {
        service,
    };
    `,
  },
  {
    name: 'server/src/services/service.js',
    contents: outdent`
    const service = ({ strapi }) => ({
        getWelcomeMessage() {
            return 'Welcome to Strapi 🚀';
        },
    });

    export default service
    `,
  },
];

export { TYPESCRIPT as serverTypescriptFiles, JAVASCRIPT as serverJavascriptFiles };
