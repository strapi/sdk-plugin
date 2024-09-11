<h1 align="center">sdk-plugin</h1>
<h3 align="center">Everything you need to develop an awesome Strapi plugin</h3>

<br />

<p align="center">
  <a href="https://www.npmjs.com/package/@strapi/sdk-plugin" target="_blank">
    <img src="https://img.shields.io/npm/v/@strapi/sdk-plugin.svg?style=flat&colorA=4945ff&colorB=4945ff" />
  </a>
  <a href="https://www.npmjs.com/package/@strapi/sdk-plugin" target="_blank">
    <img src="https://img.shields.io/npm/dm/@strapi/sdk-plugin.svg?style=flat&colorA=4945ff&colorB=4945ff" />
  </a>
  <a href="https://discord.gg/strapi" target="_blank">
    <img src="https://img.shields.io/discord/811989166782021633?style=flat&colorA=4945ff&colorB=4945ff&label=discord&logo=discord&logoColor=f0f0ff" alt="Chat on Discord" />
  </a>
</p>

<br />

sdk-plugin is a set of command line utilities for developing a Strapi plugin

## Getting Started

If you're setting up a brand new plugin we recommend you use the `init` command to get started:

```sh
npx @strapi/sdk-plugin@latest init my-plugin
```

That will create a directory with all your plugin project files.

Once your project has been installed, several commands are available to you.

## Commands

All of the following comands have the following options available:

-- `-d, --debug` – Enable debugging mode with verbose logs (default: false)
-- `--silent` – Don't log anything (default: false)
-- `-h, --help` – Display help for command

### `init [path]`

Creates a new plugin at the given path.

### `build`

Builds your current package based on the configuration in your `package.json`.

- `--minify` – minifies the output (default `false`).
- `--sourcemap` – generates sourcemaps for the output (default `true`).

```sh
yarn run build
```

### `watch`

Watch & compile your strapi plugin for local development.

```sh
yarn run watch
```

### `watch:link`

Recompiles your plugin automatically on changes and runs yalc push --publish

```sh
yarn run watch:link
```

### `verify`

Verifies the output of your plugin before publishing it

```sh
yarn run verify
```
