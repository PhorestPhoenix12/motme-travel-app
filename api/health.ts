import type { IncomingMessage, ServerResponse } from 'node:http'

export const config = { maxDuration: 10 }

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      ok: true,
      hasDatabase: Boolean(process.env.DATABASE_URL),
      hasClerk: Boolean(process.env.CLERK_SECRET_KEY),
      hasGemini: Boolean(process.env.GEMINI_API_KEY),
      hasPlaces: Boolean(process.env.GOOGLE_PLACE_API_KEY),
    }),
  )
}
