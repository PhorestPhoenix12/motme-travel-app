import type { IncomingMessage, ServerResponse } from 'node:http'
import { drizzle } from 'drizzle-orm/neon-http'

export const config = { maxDuration: 10 }

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ ok: true, drizzle: typeof drizzle }))
}
