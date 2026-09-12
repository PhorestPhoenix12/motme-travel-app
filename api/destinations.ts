import type { IncomingMessage, ServerResponse } from 'node:http'

export const config = { maxDuration: 60 }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const { handleDestinationsApi } = await import('../server/destinations')
    await handleDestinationsApi(req, res)
  } catch (error) {
    if (res.headersSent) return
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Destinations API failed to load' }))
  }
}
