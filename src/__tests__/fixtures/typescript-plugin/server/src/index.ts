import type { Core } from '@strapi/strapi';

export default {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  register({ strapi }: { strapi: Core.Strapi }) {
    // Register phase
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Bootstrap phase
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  destroy({ strapi }: { strapi: Core.Strapi }) {
    // Destroy phase
  },
};
