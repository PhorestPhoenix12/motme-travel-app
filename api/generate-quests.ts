import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleGenerateQuests } from '../server/generate-quests.ts'

export const config = { maxDuration: 60 }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const handled = await handleGenerateQuests(req, res)
  if (!handled) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Not found' }))
  }
}
