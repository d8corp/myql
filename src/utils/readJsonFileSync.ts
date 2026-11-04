import { readFileSync } from 'node:fs'

export function readJsonFileSync <T = unknown> (path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}
