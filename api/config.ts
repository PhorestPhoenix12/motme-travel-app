import type { IncomingMessage, ServerResponse } from 'node:http'

export const config = { maxDuration: 10 }

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  const clerkPublishableKey = (
    process.env.VITE_CLERK_PUBLISHABLE_KEY ||
    process.env.CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    'pk_test_d2hvbGUtc2tpbmstMjk3MS5jbGVyay5hY2NvdW50cy5kZXYk'
  ).trim()

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(
    JSON.stringify({
      clerkPublishableKey,
    }),
  )
}
