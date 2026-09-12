import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadDotEnv } from './_lib/env'

export const config = { maxDuration: 30 }

function isSafeAlbumKey(key: string) {
  return /^albums\/[A-Za-z0-9._/-]+$/.test(key) && !key.includes('..')
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || '/api/photo', 'http://localhost')
    const key = url.searchParams.get('k') || ''
    if (!isSafeAlbumKey(key)) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Invalid photograph key' }))
      return
    }

    const env = loadDotEnv()
    const hasStorage = Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && (env.AWS_ENDPOINT_URL_S3 || env.AWS_ENDPOINT_URL))
    if (hasStorage) {
      const { getPhotoBytes } = await import('./_lib/s3')
      const object = await getPhotoBytes(key)
      if (object) {
        res.statusCode = 200
        res.setHeader('Content-Type', object.contentType)
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
        res.end(object.body)
        return
      }
    }

    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Photograph not found' }))
  } catch (error) {
    if (res.headersSent) return
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Photo API failed' }))
  }
}
