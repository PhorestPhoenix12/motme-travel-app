import type { IncomingMessage, ServerResponse } from 'node:http'
import { withApiPath } from './_lib/node-api'

export const config = { maxDuration: 30 }

function fail(res: ServerResponse, error: unknown) {
  if (res.headersSent) return
  res.statusCode = 500
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Photo API failed' }))
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const incoming = withApiPath(req, '/api/photo')
    const url = new URL(incoming.url || '/api/photo', 'http://localhost')
    const key = url.searchParams.get('k') || ''
    if (!key) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Invalid photograph key' }))
      return
    }
    const { serveAlbumPhoto } = await import('./_lib/serve-photo')
    await serveAlbumPhoto(key, res)
  } catch (error) {
    fail(res, error)
  }
}
