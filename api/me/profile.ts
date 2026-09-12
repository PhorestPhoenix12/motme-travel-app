import type { IncomingMessage, ServerResponse } from 'node:http'
import { runNodeApi, withApiPath } from '../_lib/node-api'

export const config = { maxDuration: 60 }

function fail(res: ServerResponse, error: unknown) {
  if (res.headersSent) return
  res.statusCode = 500
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'API failed' }))
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const { handlePersistApi } = await import('../_lib/persist-api')
    await runNodeApi(withApiPath(req, '/api/me/profile'), res, handlePersistApi)
  } catch (error) {
    fail(res, error)
  }
}
