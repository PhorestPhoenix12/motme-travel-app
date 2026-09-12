import type { IncomingMessage, ServerResponse } from 'node:http'
import { dataUrlToBuffer, getPhotoBytes, hasObjectStorage, isSafeAlbumKey } from './storage'

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export async function serveAlbumPhoto(key: string, res: ServerResponse) {
  if (!isSafeAlbumKey(key)) {
    send(res, 400, { error: 'Invalid photograph key' })
    return
  }

  if (hasObjectStorage()) {
    try {
      const object = await getPhotoBytes(key)
      if (object) {
        res.statusCode = 200
        res.setHeader('Content-Type', object.contentType)
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
        res.end(object.body)
        return
      }
    } catch {
      // Fall through to database copies.
    }
  }

  try {
    const { eq } = await import('drizzle-orm')
    const { db } = await import('./db')
    const { questRecords } = await import('./schema')
    const rows = await db.select().from(questRecords).where(eq(questRecords.photoKey, key))
    const inline = rows[0]?.photoData ? dataUrlToBuffer(rows[0].photoData) : null
    if (inline) {
      res.statusCode = 200
      res.setHeader('Content-Type', inline.contentType)
      res.setHeader('Cache-Control', 'private, max-age=3600')
      res.end(inline.body)
      return
    }
  } catch {
    // Missing database credentials should not crash the photograph route.
  }

  send(res, 404, { error: 'Photograph not found' })
}
