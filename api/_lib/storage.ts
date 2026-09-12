import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { loadDotEnv } from '../../src/db/client'

const BUCKET = 'pictures'

function envName(suffix: string) {
  return loadDotEnv()['AWS_' + suffix]
}

function createS3() {
  const accessKeyId = envName('ACCESS_KEY_ID')
  const secretAccessKey = envName('SECRET_ACCESS_KEY')
  const endpoint = envName('ENDPOINT_URL_S3')
  const region = envName('REGION') || 'us-east-2'
  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error('Neon object storage credentials are not set')
  }
  return new S3Client({
    forcePathStyle: true,
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  })
}

export function albumPhotoKey(userId: string, country: string, city: string, questKey: string) {
  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `albums/${userId}/${safe(country)}/${safe(city)}/${safe(questKey)}.jpg`
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
    }),
  )
  return true
}

export async function signedPhotoUrl(key: string) {
  return getSignedUrl(createS3(), new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 60 * 60 })
}

export function isDataUrl(value: string | null | undefined) {
  return Boolean(value?.startsWith('data:'))
}
