# Releases

This section is for maintainers.

To release a new version:

1. Create a release branch from `main` and ensure it is up to date.

   The branch name should follow the format: `releases/<major>.<minor>.<patch>`.

2. Install the latest dependencies with `pnpm install`.
3. Update the package version in the root [package.json](./package.json):

   ```diff
   {
      "name": "@strapi/sdk-plugin",
   -  "version": "6.1.1",
   +  "version": "6.1.2",
      // ...
   }
   ```

4. Perform a dry-run publication with `pnpm publish --dry-run --tag latest`.
5. If the dry run succeeds, commit the version update with the message `release: <major>.<minor>.<patch>`. If it fails, resolve the issues before proceeding.
6. Create a version tag with `git tag v<major>.<minor>.<patch>`.
7. Push the tag to the remote repository: `git push origin v<major>.<minor>.<patch>`.
8. Push the release branch and run the [Release workflow](https://github.com/strapi/sdk-plugin/actions/workflows/release.yml) on that branch. Choose the npm dist-tag, `latest` or `next`. The workflow publishes with npm trusted publishing.
9. [Draft a new release](https://github.com/strapi/sdk-plugin/releases/new) on GitHub.
10. Select the newly created tag under the `Choose a tag` dropdown, leaving the `Target` as `auto`.
11. Click `Generate release notes`, review the content (for example, remove PRs related to the release process), and make necessary corrections.
12. Ensure the `Set as the latest release` option is selected, then click `Publish release`.
13. Create a pull request named `release: <major>.<minor>.<patch>` targeting the `main` branch.
