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
  placeName?: string
  placeAddress?: string
  placeTypes?: string[]
  identification?: string
}

export type PriorCase = {
  city: string
  country: string
  category: string
  title: string
  placeName?: string
  placeAddress?: string
  placeTypes?: string[]
  liked: boolean | null
  note: string
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
const DOSSIER_KEY = 'motme_dossier'

function dossierKeyOf(item: PriorCase) {
  return `${item.city}|${item.country}|${item.category}|${item.placeName || item.title}`.toLowerCase()
}

export function loadDossierCases(): PriorCase[] {
  try {
    const raw = localStorage.getItem(DOSSIER_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as { priorCases?: PriorCase[] }
    return Array.isArray(data.priorCases) ? data.priorCases : []
  } catch {
    return []
  }
}

export function upsertDossierCases(incoming: PriorCase[]) {
  if (incoming.length === 0) return
  const map = new Map(loadDossierCases().map(item => [dossierKeyOf(item), item]))
  for (const item of incoming) {
    const previous = map.get(dossierKeyOf(item))
    map.set(dossierKeyOf(item), previous ? { ...previous, ...item } : item)
  }
  localStorage.setItem(DOSSIER_KEY, JSON.stringify({ priorCases: [...map.values()].slice(-80) }))
}

export function secretForQuest(city: string, country: string, quest: { title: string; category: string; placeName?: string; placeAddress?: string }) {
  if (quest.placeName && quest.placeAddress) {
    return { placeName: quest.placeName, placeAddress: quest.placeAddress }
  }
  const match = loadDossierCases().find(item =>
    item.title === quest.title &&
    item.category === quest.category &&
    item.city === city &&
    item.country === country,
  )
  return {
    placeName: quest.placeName || match?.placeName,
    placeAddress: quest.placeAddress,
  }
}

export function collectPriorCases(trips: StoredTrip[]): PriorCase[] {
  const fromTrips = trips.flatMap(trip =>
    trip.quests
      .filter(quest => quest.solved || quest.placeName)
      .map(quest => ({
        city: trip.city,
        country: trip.country,
        category: quest.category,
        title: quest.title,
        placeName: quest.placeName,
        placeAddress: quest.placeAddress,
        placeTypes: quest.placeTypes,
        liked: quest.liked,
        note: quest.note,
      })),
  )
  const map = new Map(loadDossierCases().map(item => [dossierKeyOf(item), item]))
  for (const item of fromTrips) {
    const previous = map.get(dossierKeyOf(item))
    map.set(dossierKeyOf(item), previous ? { ...previous, ...item } : item)
  }
  return [...map.values()]
}

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
