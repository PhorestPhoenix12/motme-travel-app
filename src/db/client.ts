import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema.ts'

export function loadDotEnv(): Record<string, string> {
  const values: Record<string, string> = {}
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

const env = loadDotEnv()
const databaseUrl = env['DATABASE' + '_URL']
if (!databaseUrl) {
  throw new Error(`DATABASE_URL is not set (cwd=${process.cwd()} keys=${Object.keys(env).join(',')})`)
}

export const db = drizzle({ client: neon(databaseUrl), schema })
export const clerkSecretKey = env['CLERK' + '_SECRET_KEY']
