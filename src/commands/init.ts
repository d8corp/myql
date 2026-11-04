import logger from '@cantinc/logger'
import chalk from 'chalk'
import spawn from 'cross-spawn'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/** Create an app folder whose package.json only lists the base plugins. */
export function init (name: string) {
  const dir = resolve(name)
  const packageJsonPath = join(name, 'package.json')

  logger.start('Check the target folder is free', () => {
    if (existsSync(packageJsonPath)) {
      throw Error(`${name} already contains a package.json`)
    }
  })

  logger.start('Write the app', () => {
    mkdirSync(name)

    const pkg = JSON.stringify({
      name,
      private: true,
      dependencies: {},
    }, null, 2) + '\n'

    writeFileSync(packageJsonPath, pkg)
  })

  logger.start('Install dependencies', () => {
    const result = spawn.sync('npm', ['install'], { cwd: dir })

    if (result.error) {
      throw Error(`Failed to run npm: ${result.error.message}`)
    }

    if (result.status !== 0) {
      const output = result.stderr?.toString() || result.stdout?.toString()
      throw Error(`npm install failed:\n${output}`)
    }
  })

  logger.log(`Created ${chalk.white(name)} in ${chalk.white(dir)}`)
  logger.log(`Next: ${chalk.white('cd')} ${name} && ${chalk.white('myql start')}`)
}
