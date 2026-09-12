import type { IncomingMessage, ServerResponse } from 'node:http'
import { runPersistApi } from '../_lib/node-api'

export const config = { maxDuration: 60 }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await runPersistApi(req, res, '/api/me/profile')
}
