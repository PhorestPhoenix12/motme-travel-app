import type { IncomingMessage, ServerResponse } from 'node:http'
import { handlePersistApi } from '../../server/persist-api.ts'

export const config = { maxDuration: 60 }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const handled = await handlePersistApi(req, res)
  if (!handled) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Not found' }))
  }
}
