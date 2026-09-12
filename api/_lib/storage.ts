import { loadDotEnv } from './db'

const BUCKET = 'pictures'
const DATA_URL_RE = /^data:([^;]+);base64,(.+)$/

function envName(...names: string[]) {
  const env = loadDotEnv()
  for (const name of names) {
    const value = env[name]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return ''
}

function storageConfig() {
  return {
    accessKeyId: envName('AWS_ACCESS_KEY_ID'),
    secretAccessKey: envName('AWS_SECRET_ACCESS_KEY'),
    endpoint: envName('AWS_ENDPOINT_URL_S3', 'AWS_ENDPOINT_URL'),
    region: envName('AWS_REGION', 'AWS_DEFAULT_REGION') || 'us-east-2',
  }
}

export function hasObjectStorage() {
  const config = storageConfig()
  return Boolean(config.accessKeyId && config.secretAccessKey && config.endpoint)
}

async function createS3() {
  const config = storageConfig()
  if (!config.accessKeyId || !config.secretAccessKey || !config.endpoint) {
    throw new Error('Neon object storage credentials are not set')
  }
  const { S3Client } = await import('@aws-sdk/client-s3')
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

export function albumPhotoKey(userId: string, country: string, city: string, questKey: string) {
  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `albums/${userId}/${safe(country)}/${safe(city)}/${safe(questKey)}.jpg`
}

export function isSafeAlbumKey(key: string) {
  return /^albums\/[A-Za-z0-9._/-]+$/.test(key) && !key.includes('..')
}

export function photoProxyPath(key: string) {
  return `/api/photo?k=${encodeURIComponent(key)}`
}

export function photoKeyFromUrl(value: string | null | undefined) {
  if (!value) return null
  try {
    const url = value.startsWith('/') ? new URL(value, 'http://localhost') : new URL(value)
    const fromQuery = url.searchParams.get('k')
    if (fromQuery && isSafeAlbumKey(fromQuery)) return fromQuery
    const pictures = url.pathname.indexOf('/pictures/')
    if (pictures >= 0) {
      const key = decodeURIComponent(url.pathname.slice(pictures + '/pictures/'.length))
      if (isSafeAlbumKey(key)) return key
    }
    const albums = url.pathname.indexOf('/albums/')
    if (albums >= 0) {
      const key = decodeURIComponent(url.pathname.slice(albums + 1))
      if (isSafeAlbumKey(key)) return key
    }
  } catch {
    if (isSafeAlbumKey(value)) return value
  }
  return isSafeAlbumKey(value) ? value : null
}

export async function uploadDataUrl(key: string, dataUrl: string) {
  const match = dataUrl.match(DATA_URL_RE)
  if (!match) return false
  const { PutObjectCommand } = await import('@aws-sdk/client-s3')
  const body = Buffer.from(match[2], 'base64')
  await (await createS3()).send(
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
  const { GetObjectCommand } = await import('@aws-sdk/client-s3')
  const response = await (await createS3()).send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const bytes = await response.Body?.transformToByteArray()
  if (!bytes) return null
  return {
    body: Buffer.from(bytes),
    contentType: response.ContentType || 'image/jpeg',
  }
}

export async function signedPhotoUrl(key: string) {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3')
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
  return getSignedUrl(await createS3(), new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 60 * 60 })
}

export function isDataUrl(value: string | null | undefined) {
  return Boolean(value?.startsWith('data:'))
}

export function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(DATA_URL_RE)
  if (!match) return null
  return {
    contentType: match[1] || 'image/jpeg',
    body: Buffer.from(match[2], 'base64'),
  }
}
