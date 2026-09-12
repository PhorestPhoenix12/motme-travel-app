import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleQuestApi } from '../server/generate-quests'
import { runNodeApi, withApiPath } from '../server/node-api'

export const config = { maxDuration: 60 }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await runNodeApi(withApiPath(req, '/api/verify-guess'), res, handleQuestApi)
}
