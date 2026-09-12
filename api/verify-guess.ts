import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleQuestApi } from './_lib/generate-quests'

export const config = { maxDuration: 60 }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await handleQuestApi(req, res)
  } catch (error) {
    if (res.headersSent) return
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Verify API failed to load' }))
  }
}
