# AGENTS.md

Guidance for AI coding agents working in this repository.

## Overview

`myql` is a CLI (TypeScript, pure ESM). It bundles a "myql app" into `server/index.mjs` and `client/index.js` with rolldown, then supervises the server process.

A myql app is a `package.json` whose direct `dependencies` are plugins. A plugin asks for a rebuild and restart by exiting with code `75` (`RESTART_CODE` in `src/constants.ts`).

## Commands

| Command            | Purpose                                                                                                     |
|--------------------|-------------------------------------------------------------------------------------------------------------|
| `npm test`         | Jest. There are no test files yet; the script uses `--passWithNoTests`, so it passes until tests are added. |
| `npm run build`    | Release build via `innetjs`: typechecks, lints, outputs to `release/`.                                      |
| `npm run lint:fix` | ESLint autofix (import sorting and other fixable style issues).                                             |

- **`npm run build` is the only correct build path.** The raw sources are not runnable as-is, so don't try `tsc` or `node src/...`.
- `npm install` needs access to the npm registry.

## Before you finish

1. `npm test` passes.
2. `npm run build` passes (typecheck under `strict: true` and lint).
3. No new `console.*` calls, no default import of `@cantinc/logger`, no `import.meta.resolve(..., parentURL)` (see [Gotchas](#gotchas)).

## Project map

| Path                        | Role                                                                                                                                                                                   |
|-----------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `src/bin/myql.ts`           | CLI entry, a commander program. Runs `await program.parseAsync()` in try/catch. The logger has already printed the error, so the catch only sets `exitCode`.                           |
| `src/commands/init.ts`      | Scaffolds the app folder. `dependencies` is intentionally empty because the base plugin list is TBD.                                                                                   |
| `src/commands/start.ts`     | Build and supervise loop. Child stdio is inherited, plus an IPC channel.                                                                                                               |
| `src/helpers/build.ts`      | Generates the virtual entry from the plugin lists and runs the two rolldown passes.                                                                                                    |
| `src/utils/isPlugin.ts`     | Plugin detection. Reads `node_modules/<name>/package.json` and checks the exports map for `./server` / `./client`. Non-plugin dependencies are skipped; that is the filter, by design. |
| `src/utils/virtualEntry.ts` | Rolldown plugin that provides the generated entry module.                                                                                                                              |

## Code style

- ESM only (`"type": "module"`).
- `strict: true` in `tsconfig`. Prefer typed `readJsonFileSync<T>` over `<any>`.
- Lint: neostandard plus `simple-import-sort`, so re-export barrels must stay sorted. `@typescript-eslint/consistent-type-imports` means `import type` / `type` imports are kept separate.
- Node builtins always use the `node:` prefix.
- `no-console` is a warning. Print through `logger` / `chalk`.
- `import.meta.env.*` is injected by the innetjs build (see `.env`). It doesn't exist when running raw sources.

## Gotchas

Each item here was learned the hard way.

- **`@cantinc/logger` has no default export.**
  - Do: `import { logger } from '@cantinc/logger'`.
  - Why: a default import crashes at startup with a SyntaxError.
- **`logger.start(id, cb)` swallows errors from synchronous callbacks.** It prints them and never rethrows.
  - Do: wrap work that must fail the command in an `async` callback and `await logger.start(...)`.
- **Don't use `import.meta.resolve(specifier, parentURL)`.**
  - Why: on Node 22–24 the second argument works only behind `--experimental-import-meta-resolve` and is *silently ignored* otherwise. Resolution happens from the module file, never from `cwd`.
  - Do: read the exports map from `node_modules` directly, as `isPlugin.ts` does.
- **`child.on('exit')` doesn't fire when spawn itself fails.** Only `error` and then `close` fire.
  - Do: anything awaiting an exit-based promise must also resolve from the `error` handler. See `spawnApp()` in `src/commands/start.ts`.

## Plugin contract (when writing plugins or docs)

- A plugin declares `"./server"` and/or `"./client"` in its `exports` map. Omitting one is fine: that side just isn't imported.
- The client bundle marks nothing as external, by design. Browser code must not pull in `node:*` builtins, and any unresolved bare import is a plugin bug.
