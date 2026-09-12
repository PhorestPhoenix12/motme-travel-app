import type { IncomingMessage, ServerResponse } from 'node:http'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'

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

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || ''
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || ''
    const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.AWS_ENDPOINT_URL || ''
    const region = process.env.AWS_REGION || 'us-east-2'

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Photograph not found', hasStorage: false }))
      return
    }

    const client = new S3Client({
      forcePathStyle: true,
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    })
    const response = await client.send(new GetObjectCommand({ Bucket: 'pictures', Key: key }))
    const bytes = await response.Body?.transformToByteArray()
    if (!bytes) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Photograph not found' }))
      return
    }

    res.statusCode = 200
    res.setHeader('Content-Type', response.ContentType || 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
    res.end(Buffer.from(bytes))
  } catch (error) {
    if (res.headersSent) return
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Photo API failed' }))
  }
}
