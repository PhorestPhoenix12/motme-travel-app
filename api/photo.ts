import type { IncomingMessage, ServerResponse } from 'node:http'

export const config = { maxDuration: 30 }

function fail(res: ServerResponse, error: unknown) {
  if (res.headersSent) return
  res.statusCode = 500
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Photo API failed' }))
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const raw = req.url || '/api/photo'
    const url = new URL(raw, 'http://localhost')
    const key = url.searchParams.get('k') || ''
    if (!key) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify({ error: 'Invalid photograph key' }))
      return
    }
    const { serveAlbumPhoto } = await import('./_lib/serve-photo')
    await serveAlbumPhoto(key, res)
  } catch (error) {
    fail(res, error)
  }
}
