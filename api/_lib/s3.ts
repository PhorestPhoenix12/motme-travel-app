import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { loadDotEnv } from './env'

const BUCKET = 'pictures'

function storageConfig() {
  const env = loadDotEnv()
  return {
    accessKeyId: env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
    endpoint: env.AWS_ENDPOINT_URL_S3 || env.AWS_ENDPOINT_URL || '',
    region: env.AWS_REGION || env.AWS_DEFAULT_REGION || 'us-east-2',
  }
}

function createS3() {
  const config = storageConfig()
  if (!config.accessKeyId || !config.secretAccessKey || !config.endpoint) {
    throw new Error('Neon object storage credentials are not set')
  }
  return new S3Client({
    forcePathStyle: true,
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
}

export async function uploadDataUrl(key: string, dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return false
  const body = Buffer.from(match[2], 'base64')
  await createS3().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: match[1] || 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
  return true
}

export async function getPhotoBytes(key: string) {
  const response = await createS3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const bytes = await response.Body?.transformToByteArray()
  if (!bytes) return null
  return {
    body: Buffer.from(bytes),
    contentType: response.ContentType || 'image/jpeg',
  }
}

export async function signedPhotoUrl(key: string) {
  return getSignedUrl(createS3(), new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 60 * 60 })
}
