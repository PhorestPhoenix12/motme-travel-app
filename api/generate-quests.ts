import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleGenerateQuests } from '../server/generate-quests'
import { runNodeApi, withApiPath } from '../server/node-api'

export const config = { maxDuration: 60 }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await runNodeApi(withApiPath(req, '/api/generate-quests'), res, handleGenerateQuests)
}
