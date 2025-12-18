export default {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  register(_: any) {
    // Register plugin
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bootstrap(_: any) {
    // Bootstrap plugin
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async registerTrads({ locales }: { locales: string[] }) {
    // Register translations
    return Promise.resolve({});
  },
};
