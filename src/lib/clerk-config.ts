const FALLBACK_PUBLISHABLE_KEY = 'pk_test_d2hvbGUtc2tpbmstMjk3MS5jbGVyay5hY2NvdW50cy5kZXYk'

export async function loadClerkPublishableKey(): Promise<string> {
  const fromBuild = String(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '').trim()
  if (fromBuild) return fromBuild

  try {
    const res = await fetch('/api/config')
    if (res.ok) {
      const data = (await res.json()) as { clerkPublishableKey?: string }
      const fromApi = String(data.clerkPublishableKey || '').trim()
      if (fromApi) return fromApi
    }
  } catch {
    // Fall through to the public key so signed-out visitors still see Clerk.
  }

  return FALLBACK_PUBLISHABLE_KEY
}
