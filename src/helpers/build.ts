import { rmSync } from 'node:fs'
import path from 'node:path'
import { rolldown } from 'rolldown'

import { ARTIFACTS, CLIENT_DIR, CLIENT_OUTPUT, SERVER_DIR, SERVER_OUTPUT } from '../constants'
import { readJsonFileSync, virtualEntry, virtualInput } from '../utils'

function generate (plugins: string[], side: 'server' | 'client'): string {
  return plugins.map(name => `import '${name}/${side}'`).join('\n')
}

export async function build (): Promise<void> {
  const pkg = readJsonFileSync<any>(path.resolve('package.json'))
  const plugins = Object.keys(pkg.dependencies || {})

  for (const artifact of ARTIFACTS) rmSync(artifact, { recursive: true, force: true })

  const server = await rolldown({
    input: virtualInput,
    platform: 'node',
    external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
    plugins: [
      virtualEntry(generate(plugins, 'server')),
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
      virtualEntry(generate(plugins, 'server')),
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
