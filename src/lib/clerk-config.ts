export async function loadClerkPublishableKey(): Promise<string> {
  const fromBuild = String(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '').trim()
  if (fromBuild) return fromBuild

  try {
    const res = await fetch('/api/config')
    if (!res.ok) return ''
    const data = (await res.json()) as { clerkPublishableKey?: string }
    return String(data.clerkPublishableKey || '').trim()
  } catch {
    return ''
  }
}
