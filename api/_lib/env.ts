import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function loadDotEnv(): Record<string, string> {
  const values: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string' && value.length > 0) values[key] = value
  }
  for (const file of ['.env.local', '.env']) {
    const full = resolve(process.cwd(), file)
    if (!existsSync(full)) continue
    for (const line of readFileSync(full, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq)
      let value = trimmed.slice(eq + 1)
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      values[key] = value
    }
  }
  return values
}
