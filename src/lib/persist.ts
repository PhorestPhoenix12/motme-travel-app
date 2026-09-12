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
  placeCardId?: string
  placeName?: string
  placeAddress?: string
  placeTypes?: string[]
  placeType?: string
  placeDescription?: string
  identification?: string
}

export type PriorCase = {
  city: string
  country: string
  category: string
  title: string
  placeName?: string
  placeAddress?: string
  placeType?: string
  placeTypes?: string[]
  placeDescription?: string
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

export function secretForQuest(city: string, country: string, quest: {
  title: string
  category: string
  placeName?: string
  placeAddress?: string
  placeType?: string
  placeTypes?: string[]
  placeDescription?: string
}) {
  const match = loadDossierCases().find(item =>
    item.title === quest.title &&
    item.category === quest.category &&
    item.city === city &&
    item.country === country,
  )
  return {
    placeName: quest.placeName || match?.placeName,
    placeAddress: quest.placeAddress || match?.placeAddress,
    placeType: quest.placeType || match?.placeType,
    placeTypes: quest.placeTypes || match?.placeTypes,
    placeDescription: quest.placeDescription || match?.placeDescription,
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
        placeType: quest.placeType,
        placeTypes: quest.placeTypes,
        placeDescription: quest.placeDescription,
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

function slimTripForLocal(trip: StoredTrip): StoredTrip {
  return {
    ...trip,
    quests: trip.quests.map(quest => ({
      ...quest,
      photoUrl:
        quest.photoUrl && quest.photoUrl.startsWith('data:') && quest.photoUrl.length > 350_000
          ? null
          : quest.photoUrl,
    })),
  }
}

export function saveTripLocal(trip: StoredTrip) {
  const slim = slimTripForLocal(trip)
  try {
    localStorage.setItem(TRIP_KEY, JSON.stringify(slim))
  } catch {
    try {
      localStorage.setItem(
        TRIP_KEY,
        JSON.stringify({
          ...slim,
          quests: slim.quests.map(quest => ({
            ...quest,
            photoUrl: quest.photoUrl?.startsWith('data:') ? null : quest.photoUrl,
          })),
        }),
      )
    } catch {
      // Browser storage is full; remote persist can still keep the album.
    }
  }
}

export function mergeTripPhotos(remote: StoredTrip, local: StoredTrip | null): StoredTrip {
  if (!local || local.city !== remote.city || local.country !== remote.country) return remote
  const byId = new Map(local.quests.map(quest => [quest.id, quest]))
  return {
    ...remote,
    quests: remote.quests.map(quest => {
      const previous = byId.get(quest.id)
      if (previous?.photoUrl?.startsWith('data:')) return { ...quest, photoUrl: previous.photoUrl }
      if (quest.photoUrl) return quest
      return previous?.photoUrl ? { ...quest, photoUrl: previous.photoUrl } : quest
    }),
  }
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
  const payload: StoredTrip = {
    ...trip,
    quests: trip.quests.map(quest => ({
      ...quest,
      photoUrl:
        quest.photoUrl?.startsWith('data:') && quest.photoUrl.length > 900_000
          ? null
          : quest.photoUrl,
    })),
  }
  const res = await fetch('/api/me/trip', {
    method: 'PUT',
    headers: await authHeaders(token),
    body: JSON.stringify(payload),
  })
  return res.ok
}

export async function uploadQuestPhoto(
  token: string | null,
  payload: { country: string; city: string; questId: string; dataUrl: string },
): Promise<{ photoUrl: string; photoKey: string | null } | null> {
  if (!token || !payload.dataUrl.startsWith('data:')) return null
  try {
    const res = await fetch('/api/me/photo', {
      method: 'PUT',
      headers: await authHeaders(token),
      body: JSON.stringify(payload),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { photoUrl?: string; photoKey?: string | null }
    return data.photoUrl ? { photoUrl: data.photoUrl, photoKey: data.photoKey ?? null } : null
  } catch {
    return null
  }
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
  void saveTripRemote(token, trip).catch(() => false)
}

export function fileToCompressedDataUrl(file: File, max = 960, quality = 0.68): Promise<string> {
  return new Promise((resolve, reject) => {
    const fail = () =>
      reject(new Error('Could not read that photograph. Try a JPEG or PNG from the camera roll.'))

    const draw = (source: CanvasImageSource, width: number, height: number, close?: () => void) => {
      let nextWidth = width
      let nextHeight = height
      if (nextWidth > max || nextHeight > max) {
        const scale = max / Math.max(nextWidth, nextHeight)
        nextWidth = Math.round(nextWidth * scale)
        nextHeight = Math.round(nextHeight * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = nextWidth
      canvas.height = nextHeight
      const context = canvas.getContext('2d')
      if (!context) {
        fail()
        return
      }
      context.drawImage(source, 0, 0, nextWidth, nextHeight)
      close?.()
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      if (!dataUrl.startsWith('data:image')) fail()
      else resolve(dataUrl)
    }

    const loadThroughImage = () => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        draw(img, img.naturalWidth || img.width, img.naturalHeight || img.height)
      }
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        if ((file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp') && file.size < 1_200_000) {
          const reader = new FileReader()
          reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : fail())
          reader.onerror = fail
          reader.readAsDataURL(file)
        } else {
          fail()
        }
      }
      img.src = objectUrl
    }

    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
        .then(bitmap => draw(bitmap, bitmap.width, bitmap.height, () => bitmap.close()))
        .catch(loadThroughImage)
    } else {
      loadThroughImage()
    }
  })
}
