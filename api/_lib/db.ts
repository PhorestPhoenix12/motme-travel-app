import { drizzle } from 'drizzle-orm/neon-http'
import { loadDotEnv } from './env'

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
export { loadDotEnv } from './env'
