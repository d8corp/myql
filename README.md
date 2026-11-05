# myql

Build apps out of plugins.
In myql, **`package.json` is the app**: every dependency is a plugin, and the CLI turns them into a running server and browser bundle.

```sh
npm i -g myql
myql init my-app && cd my-app && myql start
```

> **Status:** early development. The base plugin set is not ready yet, so for now you add plugins to `dependencies` by hand.

## Why myql

- **No glue code.** You don't write an entry file. `myql start` generates it from your dependencies.
- **One bundler for both sides.** [rolldown](https://rolldown.rs) builds the server (`server/index.mjs`) and the browser bundle (`client/index.js`) in one go.
- **Self-modifying apps.** The app can install a plugin at runtime and ask the CLI to rebuild and restart it (see [Restart protocol](#restart-protocol)).

## Requirements

Node.js 20 or newer.

## Getting started

```sh
npm i -g myql

myql init my-app   # creates my-app/ with a package.json and installs dependencies
cd my-app
myql start         # builds, then runs and supervises the app
```

| Command                | What it does                                                                                        |
|------------------------|-----------------------------------------------------------------------------------------------------|
| `myql init <app-name>` | Creates the app folder with a `package.json` and installs dependencies.                             |
| `myql start [app-path]` | Bundles the app into `server/` and `client/`, runs `node server/index.mjs` and keeps it supervised. `app-path` defaults to the current folder. |

## Writing a plugin

A plugin is a regular npm package that exposes a `./server` and/or `./client` subpath export:

```json
{
  "name": "myql-hello",
  "exports": {
    "./server": "./dist/server.mjs",
    "./client": "./dist/client.mjs"
  }
}
```

For every **direct** dependency of the app, `myql start` checks the `exports` map:

| Dependency         | Result                           |
|--------------------|----------------------------------|
| exports `./server` | imported into the server bundle  |
| exports `./client` | imported into the browser bundle |
| exports neither    | skipped with a warning           |
| not installed      | reported as not found            |

A plugin may provide only one side. Only `dependencies` are scanned, not `devDependencies`.

## Restart protocol

The app runs as a child process with an IPC channel. If it exits with code **`75`**, `myql start` rebuilds the app and starts it again.

This is how a plugin installed from inside the running app takes effect: install it, then `process.exit(75)`.

## How it works

1. `build()` reads the app's `package.json`, keeps only the dependencies that pass `isPlugin()`, and generates a virtual entry module made of `import '<plugin>/<side>'` lines.
2. Two rolldown passes write the output:
  - `server/index.mjs`, platform `node`, bare specifiers kept external;
  - `client/index.js`, platform `browser`.
3. The app is spawned as a child process and supervised (see [Restart protocol](#restart-protocol)).

## Contributing

```sh
npm install      # dev dependencies for the CLI itself
npm run lint     # eslint (neostandard + import sorting / type-import rules)
npm run build    # innetjs release build to release/
```

The binary reads its version from `import.meta.env.INNETJS__PACKAGE_VERSION`, which is injected from `.env` at build time. Always build with `npm run build`, not raw `tsc`.

## License

MIT
