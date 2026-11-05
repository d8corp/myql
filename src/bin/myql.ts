#!/usr/bin/env node
import { program } from 'commander'

import { init, start } from '../commands'

program
  .name('myql')
  .description('CLI that builds and runs myql apps assembled from plugins')
  .version(import.meta.env.INNETJS__PACKAGE_VERSION, '-v, --version')

program
  .command('init <app-name>')
  .description('create an app folder with a package.json that lists the base plugins')
  .action(init)

program
  .command('start')
  .description('build the app and run it, restarting when a plugin is applied')
  .action(start)

try {
  await program.parseAsync()
} catch {
  process.exitCode = 1
}
