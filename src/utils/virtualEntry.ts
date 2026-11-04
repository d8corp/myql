import type { RolldownPluginOption } from 'rolldown'

export const virtualInput = 'virtual:entry'

export function virtualEntry (code: string, input = virtualInput): RolldownPluginOption {
  const resolvedInput = '\0' + input

  return {
    name: 'virtual-entry',
    resolveId (source, importer) {
      if (source === input) return resolvedInput

      if (importer === resolvedInput) {
        return this.resolve(
          source,
          undefined,
          { skipSelf: true },
        )
      }
    },
    load (id) {
      if (id === resolvedInput) return code
    },
  }
}
