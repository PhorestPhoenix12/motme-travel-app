import type { IncomingMessage, ServerResponse } from 'node:http'

export function withApiPath(req: IncomingMessage, fallbackPath: string): IncomingMessage {
  const raw = req.url || fallbackPath
  try {
    const url = new URL(raw, 'http://localhost')
    if (url.pathname === '/' || url.pathname === '') {
      return Object.create(req, { url: { value: fallbackPath + url.search } }) as IncomingMessage
    }
  } catch {
    return Object.create(req, { url: { value: fallbackPath } }) as IncomingMessage
  }
  return req
}

export async function runNodeApi(
  req: IncomingMessage,
  res: ServerResponse,
  handle: (req: IncomingMessage, res: ServerResponse) => Promise<boolean>,
) {
  try {
    const handled = await handle(req, res)
    if (!handled && !res.headersSent) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Not found' }))
    }
  } catch (error) {
    if (res.headersSent) return
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'API failed' }))
  }
}
