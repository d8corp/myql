import { existsSync, rmSync } from 'node:fs'
import path, { join } from 'node:path'
import { rolldown } from 'rolldown'

import { ARTIFACTS, CLIENT_DIR, CLIENT_OUTPUT, SERVER_DIR, SERVER_OUTPUT } from '../constants'
import { readJsonFileSync, virtualEntry, virtualInput } from '../utils'

function generate (plugins: string[], side: 'server' | 'client'): string {
  return plugins.map(name => `import '${name}/${side}'`).join('\n')
}

function isPlugin (name: string) {
  const pkgPath = join('node_modules', name, 'package.json')
  if (!existsSync(pkgPath)) return {}
  const { exports } = readJsonFileSync<{ exports?: Record<string, unknown> }>(pkgPath)

  return {
    server: Boolean(exports?.['./server']),
    client: Boolean(exports?.['./client']),
  }
}

export async function build (): Promise<void> {
  const pkg = readJsonFileSync<any>(path.resolve('package.json'))

  const plugins = Object.keys(pkg.dependencies || {})
  const pluginsDetection = plugins.map(name => isPlugin(name))
  const serverPlugins = plugins.filter((_, i) => pluginsDetection[i].server)
  const clientPlugins = plugins.filter((_, i) => pluginsDetection[i].client)

  for (const artifact of ARTIFACTS) rmSync(artifact, { recursive: true, force: true })

  const server = await rolldown({
    input: virtualInput,
    platform: 'node',
    external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
    plugins: [
      virtualEntry(generate(serverPlugins, 'server')),
    ],
  })

  await server.write({
    dir: SERVER_DIR,
    format: 'esm',
    entryFileNames: SERVER_OUTPUT,
    chunkFileNames: path.posix.join('chunks', '[name]-[hash].js'),
  })

  await server.close()

  const client = await rolldown({
    input: virtualInput,
    platform: 'browser',
    plugins: [
      virtualEntry(generate(clientPlugins, 'client')),
    ],
  })

  await client.write({
    dir: CLIENT_DIR,
    format: 'esm',
    entryFileNames: CLIENT_OUTPUT,
    chunkFileNames: path.posix.join('chunks', '[name]-[hash].js'),
    assetFileNames: path.posix.join('assets', '[name]-[hash][extname]'),
  })

  await client.close()
}
