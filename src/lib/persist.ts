export type StoredQuest = {
  id: string
  category: string
  title: string
  hints: string[]
  unlockedHints: number
  solved: boolean
  photoUrl: string | null
  note: string
  liked: boolean | null
}

export type StoredTrip = {
  country: string
  city: string
  keys: number
  quests: StoredQuest[]
}

export type StoredProfile = {
  firstName: string
  lastName: string
  email: string
  phone: string
  visitedCities: string[]
  interests: Record<string, string[]>
}

const TRIP_KEY = 'motme_trip'

export function loadTripLocal(): StoredTrip | null {
  try {
    const raw = localStorage.getItem(TRIP_KEY)
    return raw ? (JSON.parse(raw) as StoredTrip) : null
  } catch {
    return null
  }
}

export function saveTripLocal(trip: StoredTrip) {
  localStorage.setItem(TRIP_KEY, JSON.stringify(trip))
}

async function authHeaders(token: string | null): Promise<HeadersInit> {
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

export async function loadTripRemote(token: string | null, country?: string, city?: string): Promise<StoredTrip | null> {
  if (!token) return null
  const params = country && city ? `?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}` : ''
  const res = await fetch(`/api/me/trip${params}`, { headers: await authHeaders(token) })
  if (!res.ok) return null
  return (await res.json()) as StoredTrip | null
}

export async function loadAllTripsRemote(token: string | null): Promise<StoredTrip[]> {
  if (!token) return []
  const res = await fetch('/api/me/trips', { headers: await authHeaders(token) })
  if (!res.ok) return []
  return (await res.json()) as StoredTrip[]
}

export async function saveTripRemote(token: string | null, trip: StoredTrip): Promise<boolean> {
  if (!token) return false
  const res = await fetch('/api/me/trip', {
    method: 'PUT',
    headers: await authHeaders(token),
    body: JSON.stringify(trip),
  })
  return res.ok
}

export async function loadProfileRemote(token: string | null): Promise<StoredProfile | null> {
  if (!token) return null
  const res = await fetch('/api/me/profile', { headers: await authHeaders(token) })
  if (!res.ok) return null
  return (await res.json()) as StoredProfile | null
}

export async function saveProfileRemote(token: string | null, profile: StoredProfile): Promise<boolean> {
  if (!token) return false
  const res = await fetch('/api/me/profile', {
    method: 'PUT',
    headers: await authHeaders(token),
    body: JSON.stringify(profile),
  })
  return res.ok
}

export function persistTrip(token: string | null, trip: StoredTrip) {
  saveTripLocal(trip)
  void saveTripRemote(token, trip)
}

export function fileToCompressedDataUrl(file: File, max = 1200, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      if (width > max || height > max) {
        const scale = max / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(objectUrl)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read photo'))
    }
    img.src = objectUrl
  })
}
