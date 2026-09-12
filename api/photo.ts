import type { IncomingMessage, ServerResponse } from 'node:http'
import { serveAlbumPhoto } from './_lib/serve-photo'

export const config = { maxDuration: 30 }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const raw = req.url || '/api/photo'
    const url = new URL(raw, 'http://localhost')
    const key = url.searchParams.get('k') || ''
    await serveAlbumPhoto(key, res)
  } catch (error) {
    if (res.headersSent) return
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Photo API failed' }))
  }
}
