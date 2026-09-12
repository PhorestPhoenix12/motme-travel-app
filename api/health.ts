import type { IncomingMessage, ServerResponse } from 'node:http'

export const config = { maxDuration: 30 }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', 'http://localhost')
  const body: Record<string, unknown> = {
    ok: true,
    hasDatabase: Boolean(process.env.DATABASE_URL),
    hasClerk: Boolean(process.env.CLERK_SECRET_KEY),
    hasGemini: Boolean(process.env.GEMINI_API_KEY),
    hasPlaces: Boolean(process.env.GOOGLE_PLACE_API_KEY),
    hasStorage: Boolean(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      (process.env.AWS_ENDPOINT_URL_S3 || process.env.AWS_ENDPOINT_URL),
    ),
  }

  if (url.searchParams.get('diag') === 'persist') {
    const steps: string[] = []
    try {
      steps.push('start')
      await import('../src/db/client')
      steps.push('client')
      await import('../src/db/schema')
      steps.push('schema')
      await import('./_lib/storage')
      steps.push('storage')
      await import('@clerk/backend')
      steps.push('clerk')
      await import('drizzle-orm')
      steps.push('drizzle')
      await import('./_lib/serve-photo')
      steps.push('serve-photo')
      await import('./_lib/persist-api')
      steps.push('persist-api')
      body.diag = { ok: true, steps }
    } catch (error) {
      body.ok = false
      body.diag = {
        ok: false,
        steps,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}
