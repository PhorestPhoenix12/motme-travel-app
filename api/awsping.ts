import type { IncomingMessage, ServerResponse } from 'node:http'
import { S3Client } from '@aws-sdk/client-s3'

export const config = { maxDuration: 10 }

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ ok: true, s3: typeof S3Client }))
}
