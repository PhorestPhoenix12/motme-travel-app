import type { IncomingMessage, ServerResponse } from 'node:http'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { verifyToken } from '@clerk/backend'
import { clerkSecretKey, db } from './db'
import { foldKey, placeTypeLabel, savePlaceCard } from './case-catalog'
import { placeCards, profiles, trips, type TripCase } from './schema'
import {
  albumPhotoKey,
  hasObjectStorage,
  isDataUrl,
  photoKeyFromUrl,
  photoProxyPath,
  uploadDataUrl,
} from './storage'
import { serveAlbumPhoto } from './serve-photo'

type QuestPayload = {
  id: string
  category: string
  title: string
  hints: string[]
  unlockedHints: number
  solved: boolean
  photoUrl: string | null
  note: string
  liked: boolean | null
  placeCardId?: string | null
  placeName?: string
  placeAddress?: string
  placeTypes?: string[]
  placeType?: string
  placeDescription?: string
  identification?: string
}

type ProfilePayload = {
  firstName: string
  lastName: string
  email: string
  phone: string
  visitedCities: string[]
  interests: Record<string, string[]>
}

type TripPayload = {
  country: string
  city: string
  keys: number
  quests: QuestPayload[]
}

const MAX_INLINE_PHOTO = 180_000

function uuidOrNull(value?: string | null) {
  if (!value) return null
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const preloaded = (req as IncomingMessage & { body?: unknown }).body
  if (typeof preloaded === 'string' && preloaded.length > 0) return JSON.parse(preloaded) as T
  if (preloaded && typeof preloaded === 'object') return preloaded as T

  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buf.length
    if (size > 4.5 * 1024 * 1024) {
      throw new Error('Payload too large')
    }
    chunks.push(buf)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) throw new Error('Empty request body')
  return JSON.parse(raw) as T
}

async function clerkUserId(req: IncomingMessage): Promise<string | null> {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token || !clerkSecretKey) return null
  try {
    const payload = await verifyToken(token, { secretKey: clerkSecretKey })
    return payload.sub ?? null
  } catch {
    return null
  }
}

async function storePhoto(key: string, dataUrl: string) {
  if (hasObjectStorage()) {
    const uploaded = await uploadDataUrl(key, dataUrl)
    if (uploaded) return { photoKey: key, photoData: null as string | null }
  }
  return {
    photoKey: key,
    photoData: dataUrl.length <= MAX_INLINE_PHOTO ? dataUrl : null,
  }
}

async function rememberDestination(userId: string, country: string, city: string) {
  const label = `${city}, ${country}`
  const [profile] = await db.select().from(profiles).where(eq(profiles.clerkUserId, userId))
  const visited = new Set(profile?.visitedCities ?? [])
  visited.add(label)
  await db
    .insert(profiles)
    .values({
      clerkUserId: userId,
      email: profile?.email || '',
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      phone: profile?.phone,
      visitedCities: [...visited],
      interests: profile?.interests ?? {},
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profiles.clerkUserId,
      set: { visitedCities: [...visited], updatedAt: new Date() },
    })
}

function markFromQuest(
  quest: QuestPayload,
  previous: TripCase | undefined,
  photos: { photoKey: string | null; photoData: string | null },
): TripCase {
  const placeCardId = uuidOrNull(quest.placeCardId) || previous?.placeCardId || null
  const mark: TripCase = {
    id: quest.id,
    placeCardId,
    unlockedHints: quest.unlockedHints,
    solved: quest.solved,
    photoKey: photos.photoKey,
    photoData: photos.photoData,
    note: quest.note,
    liked: quest.liked,
    identification: quest.identification || previous?.identification || null,
  }
  if (!placeCardId) {
    mark.category = quest.category
    mark.title = quest.title
    mark.hints = quest.hints
  }
  return mark
}

async function filePlaceCard(quest: QuestPayload, city: string, country: string) {
  const existingId = uuidOrNull(quest.placeCardId)
  if (existingId) return existingId
  const name = quest.placeName?.trim() || ''
  const address = quest.placeAddress?.trim() || ''
  const description = quest.placeDescription?.trim() || ''
  if (!name || !address || !description) return null
  const saved = await savePlaceCard({
    googlePlaceId: `filed:${foldKey(country)}:${foldKey(city)}:${foldKey(name)}`,
    googlePlaceName: name,
    address,
    city,
    country,
    category: quest.category,
    placeTypes: quest.placeTypes || [],
    primaryType: quest.placeType || '',
    googleSummary: description,
    geminiDescription: description,
    title: quest.title,
    hint1: quest.hints[0] || '',
    hint2: quest.hints[1] || '',
    hint3: quest.hints[2] || '',
    identityFacts: [],
    sources: { persist: 'trip_file' },
  })
  return saved?.id || null
}

function questFromMark(mark: TripCase, card: typeof placeCards.$inferSelect): QuestPayload {
  return {
    id: mark.id,
    category: card.category,
    title: card.title,
    hints: [card.hint1, card.hint2, card.hint3],
    unlockedHints: mark.unlockedHints,
    solved: mark.solved,
    photoUrl: mark.photoKey ? photoProxyPath(mark.photoKey) : mark.photoData || null,
    note: mark.note,
    liked: mark.liked,
    placeCardId: card.id,
    placeName: card.googlePlaceName,
    placeAddress: card.address,
    placeTypes: card.placeTypes,
    placeType: placeTypeLabel(card.placeTypes, card.primaryType, card.category) || card.primaryType,
    placeDescription: card.geminiDescription || card.googleSummary,
    identification: mark.identification || undefined,
  }
}

async function serializeTrip(trip: typeof trips.$inferSelect) {
  const marks = Array.isArray(trip.cases) ? trip.cases : []
  const cardIds = [...new Set(marks.map(mark => mark.placeCardId).filter((id): id is string => Boolean(id)))]
  const cards = cardIds.length > 0
    ? await db.select().from(placeCards).where(inArray(placeCards.id, cardIds))
    : []
  const byId = new Map(cards.map(card => [card.id, card]))
  return {
    country: trip.country,
    city: trip.city,
    keys: trip.keys,
    quests: marks.flatMap(mark => {
      const card = mark.placeCardId ? byId.get(mark.placeCardId) : undefined
      return card ? [questFromMark(mark, card)] : []
    }),
  }
}

export async function handlePersistApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url || '/', 'http://localhost')
  const photoPath = url.pathname === '/api/photo' || url.pathname === '/photo'
  if (photoPath && (req.method === 'GET' || req.method === 'HEAD')) {
    await serveAlbumPhoto(url.searchParams.get('k') || '', res)
    return true
  }

  if (!url.pathname.startsWith('/api/me')) {
    url.pathname = `/api/me${url.pathname.startsWith('/') ? url.pathname : `/${url.pathname}`}`
  }
  if (url.pathname === '/api/me') url.pathname = '/api/me/'
  if (!url.pathname.startsWith('/api/me/')) return false

  const userId = await clerkUserId(req)
  if (!userId) {
    send(res, 401, { error: 'Sign in required' })
    return true
  }

  try {
    if (url.pathname === '/api/me/photo' && (req.method === 'PUT' || req.method === 'POST')) {
      const data = await readJson<{ country: string; city: string; questId: string; dataUrl: string }>(req)
      if (!data.country || !data.city || !data.questId || !isDataUrl(data.dataUrl)) {
        send(res, 400, { error: 'Photograph payload is incomplete' })
        return true
      }
      const photoKey = albumPhotoKey(userId, data.country, data.city, data.questId)
      try {
        const stored = await storePhoto(photoKey, data.dataUrl)
        send(res, 200, {
          photoUrl: stored.photoData ? stored.photoData : photoProxyPath(photoKey),
          photoKey,
          stored: true,
        })
      } catch {
        send(res, 200, { photoUrl: data.dataUrl, photoKey: null, stored: false })
      }
      return true
    }

    if (url.pathname === '/api/me/profile' && req.method === 'GET') {
      const [row] = await db.select().from(profiles).where(eq(profiles.clerkUserId, userId))
      send(res, 200, row ?? null)
      return true
    }

    if (url.pathname === '/api/me/profile' && req.method === 'PUT') {
      const data = await readJson<ProfilePayload>(req)
      const [row] = await db
        .insert(profiles)
        .values({
          clerkUserId: userId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          visitedCities: data.visitedCities ?? [],
          interests: data.interests ?? {},
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: profiles.clerkUserId,
          set: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            visitedCities: data.visitedCities ?? [],
            interests: data.interests ?? {},
            updatedAt: new Date(),
          },
        })
        .returning()
      send(res, 200, row)
      return true
    }

    if (url.pathname === '/api/me/trips' && req.method === 'GET') {
      const rows = await db.select().from(trips).where(eq(trips.clerkUserId, userId)).orderBy(desc(trips.updatedAt))
      send(res, 200, await Promise.all(rows.map(serializeTrip)))
      return true
    }

    if (url.pathname === '/api/me/trip' && req.method === 'GET') {
      const country = url.searchParams.get('country') || ''
      const city = url.searchParams.get('city') || ''
      const [trip] = country && city
        ? await db
            .select()
            .from(trips)
            .where(and(eq(trips.clerkUserId, userId), eq(trips.country, country), eq(trips.city, city)))
        : await db.select().from(trips).where(eq(trips.clerkUserId, userId)).orderBy(desc(trips.updatedAt)).limit(1)

      send(res, 200, trip ? await serializeTrip(trip) : null)
      return true
    }

    if (url.pathname === '/api/me/trip' && req.method === 'PUT') {
      const data = await readJson<TripPayload>(req)
      const previousCases = (
        await db
          .select({ cases: trips.cases })
          .from(trips)
          .where(and(eq(trips.clerkUserId, userId), eq(trips.country, data.country), eq(trips.city, data.city)))
      )[0]?.cases || []
      const existingByKey = new Map(previousCases.map(mark => [mark.id, mark]))

      const nextCases: TripCase[] = []
      for (const quest of data.quests) {
        const previous = existingByKey.get(quest.id)
        let photoKey = previous?.photoKey ?? photoKeyFromUrl(quest.photoUrl)
        let photoData = previous?.photoData ?? null
        if (isDataUrl(quest.photoUrl)) {
          photoKey = albumPhotoKey(userId, data.country, data.city, quest.id)
          try {
            const stored = await storePhoto(photoKey, quest.photoUrl!)
            photoKey = stored.photoKey
            photoData = stored.photoData
          } catch {
            photoKey = previous?.photoKey ?? null
            photoData = quest.photoUrl!.length <= MAX_INLINE_PHOTO ? quest.photoUrl : previous?.photoData ?? null
          }
        } else if (!quest.photoUrl) {
          photoKey = null
          photoData = null
        } else {
          photoData = photoKey ? null : photoData
        }
        const placeCardId = await filePlaceCard({ ...quest, placeCardId: quest.placeCardId || previous?.placeCardId }, data.city, data.country)
        const resolvedId = uuidOrNull(placeCardId || quest.placeCardId || previous?.placeCardId)
        if (!resolvedId) continue
        nextCases.push(markFromQuest({ ...quest, placeCardId: resolvedId }, previous, { photoKey, photoData }))
      }

      const [trip] = await db
        .insert(trips)
        .values({
          clerkUserId: userId,
          country: data.country,
          city: data.city,
          keys: data.keys,
          cases: nextCases,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [trips.clerkUserId, trips.country, trips.city],
          set: { keys: data.keys, cases: nextCases, updatedAt: new Date() },
        })
        .returning()

      await rememberDestination(userId, data.country, data.city)
      send(res, 200, { ok: true, trip: await serializeTrip(trip) })
      return true
    }

    send(res, 404, { error: 'Not found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed'
    send(res, 500, { error: message })
  }
  return true
}
