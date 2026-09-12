import type { IncomingMessage, ServerResponse } from 'node:http'

export const config = { maxDuration: 10 }

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(
    JSON.stringify({
      ok: true,
      albumApi: 'v2',
      hasDatabase: Boolean(process.env.DATABASE_URL),
      hasClerk: Boolean(process.env.CLERK_SECRET_KEY),
      hasGemini: Boolean(process.env.GEMINI_API_KEY),
      hasPlaces: Boolean(process.env.GOOGLE_PLACE_API_KEY),
      hasStorage: Boolean(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        (process.env.AWS_ENDPOINT_URL_S3 || process.env.AWS_ENDPOINT_URL),
      ),
    }),
  )
}
