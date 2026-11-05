import { logger } from '@cantinc/logger'
import chalk from 'chalk'
import { type ChildProcess, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { RESTART_CODE, SERVER_OUTPUT } from '../constants'
import { build } from '../helpers'

let current: ChildProcess | null = null
let stopping = false

function spawnApp (): Promise<{ code: number | null; signal: string | null }> {
  return new Promise((settle) => {
    const child = spawn(process.execPath, [SERVER_OUTPUT], {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      env: process.env,
    })

    current = child

    child.on('error', (e) => {
      logger.log(chalk.red(`[myql] failed to start: ${e.message}`))
      current = null
      settle({ code: 1, signal: null })
    })

    child.on('exit', (code, signal) => {
      current = null
      settle({ code, signal })
    })
  })
}

export async function start (appPath = '.'): Promise<void> {
  await logger.start('Check the app folder', async () => {
    const dir = resolve(appPath)

    if (!existsSync(join(dir, 'package.json'))) {
      throw Error(`${dir} does not contain a package.json`)
    }

    process.chdir(dir)
  })

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      stopping = true
      if (current) current.kill(signal)
      else process.exit(0)
    })
  }

  await logger.start('Bundle', build)

  for (;;) {
    const { code, signal } = await spawnApp()

    if (stopping) return

    if (code === RESTART_CODE) {
      await logger.start('Bundle', build)
      continue
    }

    if (code === 0 && signal === null) {
      logger.log(chalk.cyan('[myql] the app stopped'))

      return
    }

    logger.log(chalk.red(`[myql] the app exited with code ${code ?? signal}`))
    process.exitCode = code ?? 1

    return
  }
}
