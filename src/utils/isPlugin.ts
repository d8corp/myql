import { logger } from '@cantinc/logger'
import chalk from 'chalk'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { readJsonFileSync } from './readJsonFileSync'

export function isPlugin (name: string) {
  const pkgPath = join('node_modules', name, 'package.json')

  if (!existsSync(pkgPath)) {
    logger.log(chalk.red(`Plugin ${name} not found`))

    return {
      server: false,
      client: false,
    }
  }

  const { exports } = readJsonFileSync<{ exports?: Record<string, unknown> }>(pkgPath)

  const server = Boolean(exports?.['./server'])
  const client = Boolean(exports?.['./client'])

  if (!server && !client) {
    logger.log(chalk.red(`Plugin ${name} does not export server or client`))
  }

  return {
    server,
    client,
  }
}
