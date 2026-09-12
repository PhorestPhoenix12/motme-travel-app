import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/neon-http'

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

type AppDb = ReturnType<typeof drizzle>

function createDb(): AppDb {
  const url = loadDotEnv()['DATABASE' + '_URL']
  if (!url) throw new Error('DATABASE_URL is not set')
  return drizzle(url)
}

let dbInstance: AppDb | undefined

export const db = new Proxy({} as AppDb, {
  get(_target, property, receiver) {
    if (!dbInstance) dbInstance = createDb()
    return Reflect.get(dbInstance, property, receiver)
  },
})

export const clerkSecretKey = loadDotEnv()['CLERK' + '_SECRET_KEY']
