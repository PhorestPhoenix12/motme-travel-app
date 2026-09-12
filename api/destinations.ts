import type { IncomingMessage, ServerResponse } from 'node:http'

export const config = { maxDuration: 60 }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  let body: { action?: string; query?: string; countryCode?: string } = {}
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as typeof body
  } catch {
    body = {}
  }

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      suggestions: [],
      placesConfigured: Boolean((process.env.GOOGLE_PLACE_API_KEY || '').trim()),
      geminiConfigured: Boolean((process.env.GEMINI_API_KEY || '').trim()),
      diagnostic: 'destinations-entry',
      action: body.action || 'suggest',
    }),
  )
}
