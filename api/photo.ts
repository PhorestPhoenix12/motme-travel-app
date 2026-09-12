import type { IncomingMessage, ServerResponse } from 'node:http'
import { handlePersistApi } from './_lib/persist-api'
import { runNodeApi, withApiPath } from './_lib/node-api'

export const config = { maxDuration: 60 }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await runNodeApi(withApiPath(req, '/api/photo'), res, handlePersistApi)
}
