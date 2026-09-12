import type { IncomingMessage, ServerResponse } from 'node:http'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { verifyToken } from '@clerk/backend'

export const config = { maxDuration: 60 }

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function albumPhotoKey(userId: string, country: string, city: string, questKey: string) {
  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `albums/${userId}/${safe(country)}/${safe(city)}/${safe(questKey)}.jpg`
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const preloaded = (req as IncomingMessage & { body?: unknown }).body
  if (typeof preloaded === 'string' && preloaded.length > 0) return JSON.parse(preloaded) as T
  if (preloaded && typeof preloaded === 'object') return preloaded as T
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buf.length
    if (size > 4.5 * 1024 * 1024) throw new Error('Payload too large')
    chunks.push(buf)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) throw new Error('Empty request body')
  return JSON.parse(raw) as T
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.method !== 'PUT' && req.method !== 'POST') {
      send(res, 405, { error: 'Method not allowed' })
      return
    }

    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null
    const secret = process.env.CLERK_SECRET_KEY || ''
    if (!token || !secret) {
      send(res, 401, { error: 'Sign in required' })
      return
    }

    let userId: string | null = null
    try {
      const payload = await verifyToken(token, { secretKey: secret })
      userId = payload.sub ?? null
    } catch {
      userId = null
    }
    if (!userId) {
      send(res, 401, { error: 'Sign in required' })
      return
    }

    const data = await readJson<{ country: string; city: string; questId: string; dataUrl: string }>(req)
    if (!data.country || !data.city || !data.questId || !data.dataUrl?.startsWith('data:')) {
      send(res, 400, { error: 'Photograph payload is incomplete' })
      return
    }

    const match = data.dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) {
      send(res, 400, { error: 'Photograph must be a JPEG data URL' })
      return
    }

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || ''
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || ''
    const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.AWS_ENDPOINT_URL || ''
    const region = process.env.AWS_REGION || 'us-east-2'
    const photoKey = albumPhotoKey(userId, data.country, data.city, data.questId)

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      send(res, 200, { photoUrl: data.dataUrl, photoKey: null, stored: false })
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
    await client.send(
      new PutObjectCommand({
        Bucket: 'pictures',
        Key: photoKey,
        Body: Buffer.from(match[2], 'base64'),
        ContentType: match[1] || 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    )
    send(res, 200, { photoUrl: `/api/photo?k=${encodeURIComponent(photoKey)}`, photoKey, stored: true })
  } catch (error) {
    send(res, 500, { error: error instanceof Error ? error.message : 'Photograph upload failed' })
  }
}
