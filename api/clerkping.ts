import type { IncomingMessage, ServerResponse } from 'node:http'
import { verifyToken } from '@clerk/backend'

export const config = { maxDuration: 10 }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      ok: true,
      clerk: typeof verifyToken,
      hasSecret: Boolean(process.env.CLERK_SECRET_KEY),
      hasToken: Boolean(token),
    }))
  } catch (error) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'clerk ping failed' }))
  }
}
