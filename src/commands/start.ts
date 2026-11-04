import logger from '@cantinc/logger'
import chalk from 'chalk'
import { type ChildProcess, spawn } from 'node:child_process'

import { RESTART_CODE, SERVER_OUTPUT } from '../constants'
import { build } from '../helpers'

let current: ChildProcess | null = null
let stopping = false

function spawnApp (): Promise<{ code: number | null; signal: string | null }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SERVER_OUTPUT], {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      env: process.env,
    })

    current = child

    child.on('exit', (code, signal) => {
      current = null
      resolve({ code, signal })
    })
  })
}

export async function start (): Promise<void> {
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
