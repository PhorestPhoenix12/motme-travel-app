import type { IncomingMessage, ServerResponse } from 'node:http'
import { and, desc, eq } from 'drizzle-orm'
import { verifyToken } from '@clerk/backend'
import { clerkSecretKey, db } from '../../src/db/client'
import { profiles, questRecords, trips } from '../../src/db/schema'
import { albumPhotoKey, isDataUrl, signedPhotoUrl, uploadDataUrl } from './storage'

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

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buf.length
    if (size > 12 * 1024 * 1024) {
      throw new Error('Payload too large')
    }
    chunks.push(buf)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T
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

async function questsWithSignedPhotos(
  tripId: string,
  records: (typeof questRecords.$inferSelect)[],
) {
  return Promise.all(
    records.map(async record => ({
      id: record.questKey,
      category: record.category,
      title: record.title,
      hints: record.hints,
      unlockedHints: record.unlockedHints,
      solved: record.solved,
      photoUrl: record.photoKey ? await signedPhotoUrl(record.photoKey) : record.photoData,
      photoKey: record.photoKey,
      note: record.note,
      liked: record.liked,
      tripId,
    })),
  )
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

async function serializeTrip(trip: typeof trips.$inferSelect) {
  const records = await db.select().from(questRecords).where(eq(questRecords.tripId, trip.id))
  return {
    country: trip.country,
    city: trip.city,
    keys: trip.keys,
    quests: await questsWithSignedPhotos(trip.id, records),
  }
}

export async function handlePersistApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url || '/api/me/', 'http://localhost')
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
      const [trip] = await db
        .insert(trips)
        .values({
          clerkUserId: userId,
          country: data.country,
          city: data.city,
          keys: data.keys,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [trips.clerkUserId, trips.country, trips.city],
          set: { keys: data.keys, updatedAt: new Date() },
        })
        .returning()

      const existing = await db.select().from(questRecords).where(eq(questRecords.tripId, trip.id))
      const existingByKey = new Map(existing.map(record => [record.questKey, record]))

      await db.delete(questRecords).where(eq(questRecords.tripId, trip.id))
      if (data.quests.length > 0) {
        const rows = []
        for (const quest of data.quests) {
          const previous = existingByKey.get(quest.id)
          let photoKey = previous?.photoKey ?? null
          if (isDataUrl(quest.photoUrl)) {
            photoKey = albumPhotoKey(userId, data.country, data.city, quest.id)
            await uploadDataUrl(photoKey, quest.photoUrl!)
          } else if (!quest.photoUrl) {
            photoKey = null
          }
          rows.push({
            tripId: trip.id,
            questKey: quest.id,
            category: quest.category,
            title: quest.title,
            hints: quest.hints,
            unlockedHints: quest.unlockedHints,
            solved: quest.solved,
            photoKey,
            photoData: null,
            note: quest.note,
            liked: quest.liked,
          })
        }
        await db.insert(questRecords).values(rows)
      }

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
