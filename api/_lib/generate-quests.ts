import { existsSync, readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import tls from 'node:tls'
import { guessFitsCase } from '../../src/lib/identify'

try {
  tls.setDefaultCACertificates([
    ...tls.getCACertificates(),
    ...tls.getCACertificates('system'),
  ])
} catch {
  // Older Node builds without bundled+system CA merge still proceed.
}

function loadEnv() {
  const values: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string' && value.length > 0) values[key] = value
  }
  for (const file of ['.env.local', '.env']) {
    const full = resolve(process.cwd(), file)
    if (!existsSync(full)) continue
    for (const line of readFileSync(full, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      values[key] = value.trim()
    }
  }
  return values
}

export type PriorCase = {
  city?: string
  country?: string
  category?: string
  title?: string
  placeName?: string
  placeAddress?: string
  placeTypes?: string[]
  liked?: boolean | null
  note?: string
}

type GenerateRequest = {
  country?: string
  city?: string
  interests?: string[]
  counts?: Record<string, number>
  priorCases?: PriorCase[]
}

const MAX_PER_CATEGORY = 10
const MAX_DOSSIER = 20

type PlaceCandidate = {
  id: string
  name: string
  address: string
  types: string[]
  summary: string
  rating: number | null
  ratings: number
  primaryType: string
  lat?: number
  lng?: number
}

type GeneratedQuest = {
  category: string
  title: string
  place_name: string
  place_address?: string
  place_types?: string[]
  clue: string
  default_hint: string
  bonus_hint: string
}

const INTEREST_QUERY_VARIANTS: Record<string, Array<(city: string, country: string) => string>> = {
  Landmarks: [
    (city, country) => `famous landmarks monuments and historic sites in ${city}, ${country}`,
    (city, country) => `lesser known historic sites and local monuments in ${city}, ${country}`,
    (city, country) => `viewpoints bridges fountains and civic landmarks in ${city}, ${country}`,
    (city, country) => `statues squares and public memorials in ${city}, ${country}`,
    (city, country) => `old town walls gates and historic towers in ${city}, ${country}`,
    (city, country) => `waterfront landmarks and lookout points in ${city}, ${country}`,
    (city, country) => `quiet neighborhood landmarks away from tourist squares in ${city}, ${country}`,
  ],
  Food: [
    (city, country) => `iconic local restaurants historic cafes and regional cuisine in ${city}, ${country}`,
    (city, country) => `neighborhood trattorias bistros and family kitchens in ${city}, ${country}`,
    (city, country) => `bakeries pastry shops and breakfast rooms in ${city}, ${country}`,
    (city, country) => `street food wine bars and casual regional cooking in ${city}, ${country}`,
    (city, country) => `fine dining and chef-driven restaurants in ${city}, ${country}`,
    (city, country) => `seafood market kitchens and cicchetti bacari in ${city}, ${country}`,
    (city, country) => `quiet residential district restaurants away from tourist squares in ${city}, ${country}`,
  ],
  Museums: [
    (city, country) => `museums galleries and cultural archives in ${city}, ${country}`,
    (city, country) => `smaller house museums and specialist collections in ${city}, ${country}`,
    (city, country) => `art galleries and historic libraries in ${city}, ${country}`,
    (city, country) => `science history and design museums in ${city}, ${country}`,
    (city, country) => `palace museums and civic collections in ${city}, ${country}`,
    (city, country) => `neighborhood galleries away from the main museum district in ${city}, ${country}`,
  ],
  Nature: [
    (city, country) => `parks gardens riversides and scenic green spaces in ${city}, ${country}`,
    (city, country) => `quiet gardens botanical collections and hidden courtyards in ${city}, ${country}`,
    (city, country) => `waterfront walks hills and nature reserves in ${city}, ${country}`,
    (city, country) => `tree-lined promenades and public gardens in ${city}, ${country}`,
    (city, country) => `islands lagoons and waterside parks in ${city}, ${country}`,
    (city, country) => `small neighborhood parks away from the main tourist garden in ${city}, ${country}`,
  ],
  Nightlife: [
    (city, country) => `historic bars cocktail lounges cabarets and nightlife in ${city}, ${country}`,
    (city, country) => `neighborhood wine bars and late cafes in ${city}, ${country}`,
    (city, country) => `jazz clubs speakeasies and old taverns in ${city}, ${country}`,
    (city, country) => `canal-side or courtyard aperitivo bars in ${city}, ${country}`,
    (city, country) => `historic pubs and local drinking rooms in ${city}, ${country}`,
    (city, country) => `quiet evening cafes away from the main nightlife strip in ${city}, ${country}`,
  ],
  Architecture: [
    (city, country) => `historic architecture palaces churches and notable buildings in ${city}, ${country}`,
    (city, country) => `art nouveau palazzi and hidden courtyards in ${city}, ${country}`,
    (city, country) => `civic halls libraries and remarkable facades in ${city}, ${country}`,
    (city, country) => `chapels cloisters and lesser known churches in ${city}, ${country}`,
    (city, country) => `bridges staircases and remarkable public works in ${city}, ${country}`,
    (city, country) => `quiet palazzi away from the main square in ${city}, ${country}`,
  ],
  Shopping: [
    (city, country) => `historic markets bazaars shopping streets and covered passages in ${city}, ${country}`,
    (city, country) => `local food markets and artisan stalls in ${city}, ${country}`,
    (city, country) => `bookshops antique streets and independent shops in ${city}, ${country}`,
    (city, country) => `covered galleries and historic shopping arcades in ${city}, ${country}`,
    (city, country) => `craft workshops and specialty food shops in ${city}, ${country}`,
    (city, country) => `neighborhood markets away from the main tourist street in ${city}, ${country}`,
  ],
}

const INCLUDED_TYPES: Record<string, string[]> = {
  Landmarks: ['tourist_attraction', 'church', 'city_hall'],
  Food: ['restaurant', 'cafe', 'bakery'],
  Museums: ['museum', 'art_gallery', 'library'],
  Nature: ['park', 'zoo', 'campground'],
  Nightlife: ['bar', 'night_club', 'liquor_store'],
  Architecture: ['church', 'city_hall', 'university'],
  Shopping: ['book_store', 'clothing_store', 'shopping_mall'],
}

const COMMON_WORDS = new Set([
  'the', 'and', 'of', 'de', 'du', 'des', 'la', 'le', 'les', 'el', 'los', 'las', 'von', 'van',
  'museum', 'musee', 'museo', 'park', 'garden', 'cafe', 'restaurant', 'bar', 'hotel', 'church',
  'cathedral', 'palace', 'castle', 'tower', 'bridge', 'square', 'market', 'gallery', 'house',
  'street', 'avenue', 'place', 'plaza', 'city', 'old', 'new', 'grand', 'great', 'national',
])

const NARRATOR_VOICE = `You are the night clerk of MotME — Mystery of the Midnight Express. You write sealed case-file clues in a 1930s rail-investigation voice.
Never break character with modern app language. Never say "app", "tap", "GPS", "selfie", "unlock", "click", or "download".
Never say the place's official name, a common nickname, or any token that would give the name away.
Every hint keeps mystery diction (clerk, file, sealed, porters, depot, briefing, evidence, classified) while staying factually clear.

Hint 1 is 1–2 sentences that DIRECTLY state at least two of: function, appearance, history or age, location, significance. Facts first, atmosphere in the same breath. Example: "The night clerk stamps this on the 16th-century stone footbridge that still carries people over the canal; shops cling to both sides of the span."
Do not open with empty poetry, "they say the stones", or a uniqueness disclaimer.
Hint 2: how to recognize it from the pavement — materials, neighbors, doors — still as a briefing.
Hint 3: a confirmation detail to file as evidence — still never the proper name.
Titles are pulp case-file names. Never the venue's name.`

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
    if (size > 2 * 1024 * 1024) throw new Error('Payload too large')
    chunks.push(buf)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? (JSON.parse(raw) as T) : ({} as T)
}

function apiKeys() {
  const env = loadEnv()
  const gemini = (env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim()
  const places = (env.GOOGLE_PLACE_API_KEY || process.env.GOOGLE_PLACE_API_KEY || '').trim()
  return { gemini, places }
}

function foldName(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|and|of|de|di|da|del|della|il|la|le|los|las|el)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isSamePlace(a: PlaceCandidate, b: PlaceCandidate) {
  if (a.id && b.id && a.id === b.id) return true
  const na = foldName(a.name)
  const nb = foldName(b.name)
  if (na && na === nb) return true
  const streetA = foldName((a.address || '').split(',')[0] || '')
  const streetB = foldName((b.address || '').split(',')[0] || '')
  if (na && nb && streetA && streetA === streetB && Math.min(na.length, nb.length) >= 8) {
    if (na.includes(nb) || nb.includes(na)) return true
  }
  return false
}

const CITY_ALIASES: Record<string, string[]> = {
  venice: ['venezia'],
  florence: ['firenze'],
  rome: ['roma'],
  milan: ['milano'],
  naples: ['napoli'],
  turin: ['torino'],
  munich: ['munchen', 'muenchen'],
  vienna: ['wien'],
  prague: ['praha'],
  cologne: ['koln', 'koeln'],
  seville: ['sevilla'],
  brussels: ['bruxelles', 'brussel'],
  geneva: ['geneve'],
  copenhagen: ['kobenhavn'],
  warsaw: ['warszawa'],
  krakow: ['cracow'],
  cracow: ['krakow'],
}

function belongsToDestination(
  place: PlaceCandidate,
  city: string,
  country: string,
  bias?: { lat: number; lng: number } | null,
) {
  const hay = foldName(`${place.address || ''} ${place.name || ''}`)
  const cityFold = foldName(city)
  if (cityFold && hay.includes(cityFold)) return true
  if ((CITY_ALIASES[cityFold] || []).some(alias => hay.includes(alias))) return true
  if (bias && typeof place.lat === 'number' && typeof place.lng === 'number') {
    const km = distanceKm(bias.lat, bias.lng, place.lat, place.lng)
    if (km <= 22) return true
  }
  return false
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function uniquePlaces(places: PlaceCandidate[]) {
  const out: PlaceCandidate[] = []
  for (const place of places) {
    if (out.some(existing => isSamePlace(existing, place))) continue
    out.push(place)
  }
  return out
}

function usedPlaceNames(prior: PriorCase[]) {
  return new Set(
    prior
      .flatMap(item => [item.placeName, item.title])
      .filter((value): value is string => Boolean(value && value.trim()))
      .map(value => value.trim().toLowerCase()),
  )
}

function matchesUsedPlace(place: PlaceCandidate, used: Set<string>, already: PlaceCandidate[]) {
  if (used.has(place.name.toLowerCase())) return true
  if (used.has(foldName(place.name))) return true
  if (already.some(item => isSamePlace(item, place))) return true
  for (const value of used) {
    if (foldName(value) && foldName(value) === foldName(place.name)) return true
  }
  return false
}

function placeTypesOf(item: { types?: string[]; placeTypes?: string[]; primaryType?: string }) {
  return [...(item.placeTypes || item.types || []), item.primaryType || '']
    .filter(Boolean)
    .map(type => type.toLowerCase())
}

function neighborhoodOf(address?: string) {
  return (address || '').split(',').slice(0, 2).join(',').toLowerCase().trim()
}

function scorePlace(
  place: PlaceCandidate,
  category: string,
  prior: PriorCase[],
  already: PlaceCandidate[],
) {
  const loved = prior.filter(item => item.category === category && item.liked === true)
  const passed = prior.filter(item => item.category === category && item.liked === false)
  const popularity = (place.rating ?? 3.8) * Math.log10((place.ratings || 8) + 10)
  let score = popularity

  const types = new Set(placeTypesOf(place))
  const passedTypes = new Set(passed.flatMap(placeTypesOf))
  const lovedTypes = new Set(loved.flatMap(placeTypesOf))
  const passedNames = new Set(
    passed.map(item => item.placeName?.trim().toLowerCase()).filter((value): value is string => Boolean(value)),
  )
  const passedHoods = new Set(passed.map(item => neighborhoodOf(item.placeAddress)).filter(hood => hood.length > 4))

  if (passedNames.has(place.name.toLowerCase())) return -100
  for (const type of types) {
    if (passedTypes.has(type)) score -= 3.4
    if (lovedTypes.has(type)) score += 2.1
  }
  const hood = neighborhoodOf(place.address)
  if (hood && passedHoods.has(hood)) score -= 2.4
  if (passed.length > loved.length) {
    score += (place.ratings || 0) > 12000 ? -2.8 : 1.1
  } else if (loved.length > 0) {
    score += (place.rating ?? 0) >= 4.5 ? 0.5 : 0.15
  }
  if (place.primaryType && already.filter(item => item.primaryType === place.primaryType).length >= 2) score -= 2.6
  if (hood && already.some(item => neighborhoodOf(item.address) === hood)) score -= 1.3
  return score
}

function pickPlaces(
  candidates: PlaceCandidate[],
  category: string,
  prior: PriorCase[],
  count: number,
  already: PlaceCandidate[],
) {
  const used = usedPlaceNames(prior)
  const pool = uniquePlaces(candidates).filter(place => !matchesUsedPlace(place, used, already))
  const picked: PlaceCandidate[] = []

  const take = (strict: boolean) => {
    const remaining = pool.filter(place => !picked.some(item => isSamePlace(item, place)))
    remaining.sort(
      (a, b) =>
        scorePlace(b, category, prior, [...already, ...picked]) -
        scorePlace(a, category, prior, [...already, ...picked]),
    )
    for (const next of remaining) {
      if (picked.length >= count) return
      if (scorePlace(next, category, prior, [...already, ...picked]) < -50) continue
      if (strict) {
        const hood = neighborhoodOf(next.address)
        if (hood && hood.length > 4 && picked.some(item => neighborhoodOf(item.address) === hood)) continue
      }
      picked.push(next)
    }
  }

  take(true)
  if (picked.length < count) take(false)
  return picked
}

function queriesFor(category: string, city: string, country: string, prior: PriorCase[], count = 1) {
  const variants = INTEREST_QUERY_VARIANTS[category] || INTEREST_QUERY_VARIANTS.Landmarks
  const loved = prior.filter(item => item.category === category && item.liked === true)
  const passed = prior.filter(item => item.category === category && item.liked === false)
  const start = passed.length > loved.length ? 1 : 0
  const chosen = count > 1
    ? variants.slice()
    : variants.slice(start, start + 3)
  if (chosen.length < 2 && variants.length > 1) chosen.push(variants[variants.length - 1])
  return chosen.map(build => build(city, country))
}

function normalizeCounts(interests: string[], counts?: Record<string, number>) {
  const next: Record<string, number> = {}
  let remaining = MAX_DOSSIER
  for (const interest of interests) {
    const requested = Math.floor(Number(counts?.[interest]) || 1)
    const allowed = Math.min(MAX_PER_CATEGORY, Math.max(1, requested), remaining)
    next[interest] = allowed
    remaining -= allowed
  }
  return next
}

function redactName(text: string, placeName: string) {
  if (!text || !placeName) return text
  let next = text
  const escaped = placeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  next = next.replace(new RegExp(escaped, 'gi'), 'the marked location')
  for (const token of placeName.split(/[\s,.'’"()/+-]+/)) {
    if (token.length < 4 || COMMON_WORDS.has(token.toLowerCase())) continue
    next = next.replace(new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), 'the marked location')
  }
  return next.replace(/\s{2,}/g, ' ').trim()
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced?.[1] ?? text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Gemini returned no dossier')
  return JSON.parse(raw.slice(start, end + 1))
}

async function searchPlacesNew(
  query: string,
  apiKey: string,
  options?: { includedType?: string; bias?: { lat: number; lng: number } | null },
): Promise<PlaceCandidate[]> {
  const payload: Record<string, unknown> = { textQuery: query, languageCode: 'en', pageSize: 20 }
  if (options?.includedType) payload.includedType = options.includedType
  if (options?.bias) {
    payload.locationBias = {
      circle: {
        center: { latitude: options.bias.lat, longitude: options.bias.lng },
        radius: 18000,
      },
    }
  }
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.types,places.editorialSummary,places.rating,places.userRatingCount,places.primaryType,places.generativeSummary,places.location',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Places New ${res.status}: ${detail.slice(0, 280)}`)
  }
  const data = (await res.json()) as {
    places?: Array<{
      id?: string
      displayName?: { text?: string }
      formattedAddress?: string
      types?: string[]
      editorialSummary?: { text?: string }
      generativeSummary?: { overview?: { text?: string } }
      rating?: number
      userRatingCount?: number
      primaryType?: string
      location?: { latitude?: number; longitude?: number }
    }>
  }
  return (data.places ?? []).map(place => ({
    id: place.id || place.displayName?.text || query,
    name: place.displayName?.text || 'Unknown place',
    address: place.formattedAddress || '',
    types: place.types || [],
    summary: place.editorialSummary?.text || place.generativeSummary?.overview?.text || '',
    rating: place.rating ?? null,
    ratings: place.userRatingCount ?? 0,
    primaryType: place.primaryType || '',
    lat: place.location?.latitude,
    lng: place.location?.longitude,
  }))
}

async function searchPlacesLegacy(query: string, apiKey: string): Promise<PlaceCandidate[]> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
  url.searchParams.set('query', query)
  url.searchParams.set('key', apiKey)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Places legacy HTTP ${res.status}`)
  const data = (await res.json()) as {
    status?: string
    error_message?: string
    results?: Array<{
      place_id?: string
      name?: string
      formatted_address?: string
      types?: string[]
      rating?: number
      user_ratings_total?: number
    }>
  }
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places legacy ${data.status}: ${data.error_message || ''}`.trim())
  }
  return (data.results ?? []).map(place => ({
    id: place.place_id || place.name || query,
    name: place.name || 'Unknown place',
    address: place.formatted_address || '',
    types: place.types || [],
    summary: '',
    rating: place.rating ?? null,
    ratings: place.user_ratings_total ?? 0,
    primaryType: place.types?.[0] || '',
  }))
}

async function findPlaces(
  query: string,
  apiKey: string,
  bias?: { lat: number; lng: number } | null,
) {
  try {
    const latest = await searchPlacesNew(query, apiKey, { bias })
    if (latest.length > 0) return latest
  } catch {
    // Fall through to the classic Places Text Search.
  }
  try {
    return await searchPlacesLegacy(query, apiKey)
  } catch {
    return []
  }
}

async function geocodeCity(city: string, country: string, apiKey: string) {
  const hits = await searchPlacesNew(`${city}, ${country}`, apiKey).catch(() => [])
  const hit = hits.find(place => typeof place.lat === 'number' && typeof place.lng === 'number')
  if (!hit || hit.lat == null || hit.lng == null) return null
  return { lat: hit.lat, lng: hit.lng }
}

function placeKind(place: PlaceCandidate): string {
  const types = new Set([...(place.types || []), place.primaryType || ''].map(type => type.toLowerCase()))
  if (types.has('bridge')) return 'historic bridge or crossing'
  if (types.has('church') || types.has('place_of_worship') || types.has('hindu_temple') || types.has('mosque') || types.has('synagogue') || types.has('cathedral')) {
    return 'church, temple, or civic place of worship'
  }
  if (types.has('city_hall') || types.has('local_government_office')) return 'town hall or civic building'
  if (types.has('museum')) return 'museum'
  if (types.has('art_gallery')) return 'gallery'
  if (types.has('library')) return 'library or archive'
  if (types.has('park') || types.has('campground')) return 'park or garden'
  if (types.has('zoo') || types.has('aquarium')) return 'menagerie or aquarium'
  if (types.has('restaurant')) return 'restaurant or trattoria'
  if (types.has('cafe')) return 'cafe'
  if (types.has('bakery')) return 'bakery or pastry shop'
  if (types.has('bar') || types.has('liquor_store')) return 'bar or tavern'
  if (types.has('night_club')) return 'late room with a floor or stage'
  if (types.has('book_store')) return 'bookshop'
  if (types.has('clothing_store') || types.has('shopping_mall')) return 'shop or emporium'
  if (types.has('university')) return 'university building or college court'
  if (types.has('tourist_attraction')) return 'public landmark'
  return 'marked public place'
}

function streetOf(place: { address?: string; place_address?: string }) {
  const address = place.address || place.place_address || ''
  return address.split(',')[0]?.trim() || 'the listed street'
}

function stripMetaUniqueness(text: string) {
  return text
    .replace(/\s*This file follows[^.?!]*[.?!]/gi, '')
    .replace(/\s*It is not the same walk[^.?!]*[.?!]/gi, '')
    .replace(/\s*Unlike the other files[^.?!]*[.?!]/gi, '')
    .replace(/\s*The other files aboard this train[^.?!]*[.?!]/gi, '')
    .replace(/\s*This briefing concerns[^.?!]*; the other files[^.?!]*[.?!]/gi, '')
    .replace(/\s*Do not confuse it with another door[^.?!]*[.?!]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function placeRole(place: PlaceCandidate): string {
  const types = new Set([...(place.types || []), place.primaryType || ''].map(type => type.toLowerCase()))
  if (types.has('bridge')) return 'still carries people over water'
  if (types.has('church') || types.has('place_of_worship') || types.has('cathedral')) return 'still holds worship and marks the hours'
  if (types.has('city_hall')) return "still houses the city's civic business"
  if (types.has('museum') || types.has('art_gallery')) return "keeps the city's collections on public view"
  if (types.has('library')) return 'is still used as a reading room'
  if (types.has('park') || types.has('campground')) return 'is the green the city walks for air'
  if (types.has('zoo') || types.has('aquarium')) return 'holds a living collection'
  if (types.has('restaurant')) return "cooks the city's own food"
  if (types.has('cafe')) return 'serves coffee and pastry to regulars'
  if (types.has('bakery')) return 'still bakes for the street'
  if (types.has('bar') || types.has('night_club')) return 'keeps late hours for the neighborhood'
  if (types.has('book_store')) return 'still sells books from stacked rooms'
  if (types.has('shopping_mall') || types.has('clothing_store')) return 'has long been a place to buy'
  if (types.has('university')) return 'still teaches behind a historic facade'
  if (types.has('tourist_attraction')) return 'is a public marker the city orients itself by'
  return 'still stands in public use'
}

function placeLook(place: PlaceCandidate): string {
  const types = new Set([...(place.types || []), place.primaryType || ''].map(type => type.toLowerCase()))
  if (types.has('bridge')) return 'arches or iron bays over water'
  if (types.has('church') || types.has('place_of_worship') || types.has('cathedral')) return 'stone walls and a tower, dome, or spire'
  if (types.has('city_hall')) return 'a ceremonial civic facade'
  if (types.has('museum') || types.has('art_gallery')) return 'a ticketed hall or palace front'
  if (types.has('park')) return 'gated lawns, paths, and old trees'
  if (types.has('restaurant') || types.has('cafe')) return 'a doorway and rooms made for sitting'
  if (types.has('bakery')) return 'a window of bread or pastry'
  if (types.has('bar') || types.has('night_club')) return 'a worn threshold and low interior light'
  return 'a front you can match from the street'
}

function fallbackQuest(category: string, place: PlaceCandidate, city: string): GeneratedQuest {
  const district = place.address.split(',').slice(0, 2).join(', ').trim() || 'an unlisted quarter'
  const street = streetOf(place)
  const kind = placeKind(place)
  const fieldNote = place.summary
    ? redactName(place.summary.replace(/\s+/g, ' ').trim(), place.name)
    : ''
  const titleByCategory: Record<string, string> = {
    Landmarks: 'The File on the Public Marker',
    Food: 'The File on the Local Kitchen',
    Museums: 'The File on the Quiet Rooms',
    Nature: 'The File on Open Ground',
    Nightlife: 'The File on After Hours',
    Architecture: 'The File on the Standing Work',
    Shopping: 'The File on the Working Counter',
  }
  const clue = fieldNote
    ? `The night clerk files this on the ${kind} at ${street}: ${fieldNote}`
    : `The night clerk files this on the ${kind} at ${street} — it ${placeRole(place)}. Look for ${placeLook(place)}.`
  return {
    category,
    title: `${titleByCategory[category] || 'The File Without a Cover'} — ${street}`,
    place_name: place.name,
    place_address: place.address,
    place_types: place.types,
    clue,
    default_hint: `From the pavement in ${district}, match the ${kind} whose address begins ${street}. Neighbors, materials, and the way the door meets the street are the tells in this briefing.`,
    bonus_hint: fieldNote
      ? `On arrival, file this against what you see at ${street}: ${fieldNote} That match is the seal on the case.`
      : `Stand at ${street} and file one detail a copyist could not steal from another ${kind} in ${city} — a number, a view, a worn threshold, or a neighbor you can name by trade.`,
  }
}

function ensureDistinctQuests(quests: GeneratedQuest[]): GeneratedQuest[] {
  const kept: GeneratedQuest[] = []
  const venues = new Set<string>()
  const titles = new Set<string>()
  const clues = new Set<string>()

  for (const quest of quests) {
    const venue = foldName(quest.place_name) || foldName(quest.title)
    if (venue && venues.has(venue)) continue
    if (venue) venues.add(venue)

    const street = streetOf({
      place_address: quest.place_address,
    })

    let title = stripMetaUniqueness(quest.title)
    let titleKey = foldName(title)
    if (!titleKey || titles.has(titleKey)) {
      title = `${title.replace(/ — .*$/, '')} — ${street}`
      titleKey = foldName(title)
    }
    titles.add(titleKey)

    let clue = stripMetaUniqueness(quest.clue)
    let clueKey = foldName(clue)
    if (!clueKey || clues.has(clueKey) || (street && !foldName(clue).includes(foldName(street).split(' ')[0] || street))) {
      clue = `The trail is the ${quest.category.toLowerCase()} site on ${street}. ${clue}`.trim()
      clueKey = foldName(clue)
    }
    clues.add(clueKey)

    let hint = stripMetaUniqueness(quest.default_hint)
    if (kept.some(item => foldName(item.default_hint) === foldName(hint)) || (street && !foldName(hint).includes(foldName(street).split(' ')[0] || street))) {
      hint = `Stay on ${street}. ${hint}`.trim()
    }

    const bonus = stripMetaUniqueness(quest.bonus_hint)
    kept.push({ ...quest, title, clue, default_hint: hint, bonus_hint: bonus })
  }
  return kept
}

function buildPrompt(
  city: string,
  country: string,
  interests: string[],
  places: Array<PlaceCandidate & { category: string }>,
  prior: PriorCase[],
) {
  const priorLines = prior.length
    ? prior
        .slice(-12)
        .map(item => {
          const verdict = item.liked === true ? 'loved' : item.liked === false ? 'merely noted' : 'closed without verdict'
          const note = item.note?.trim() ? ` Field note: "${item.note.trim()}"` : ''
          const where = [item.city, item.country].filter(Boolean).join(', ')
          return `- ${where || 'an earlier city'}, ${item.category || 'unknown specialty'}: "${item.title || 'untitled file'}" — ${verdict}.${item.placeName ? ` (already used venue, do not reuse: ${item.placeName})` : ''}${note}`
        })
        .join('\n')
    : 'No prior case reactions are on file. Treat this as a first briefing.'

  const placeLines = places
    .map((place, index) => {
      return `${index + 1}. Category: ${place.category}
   True name (NEVER speak this to the player): ${place.name}
   Address: ${place.address || 'unlisted'}
   Types: ${(place.types.length ? place.types : [place.primaryType]).filter(Boolean).join(', ') || 'unlisted'}
   Summary: ${place.summary || 'none on file'}
   Standing among travelers: ${place.rating ?? 'unknown'} (${place.ratings} marks)`
    })
    .join('\n\n')

  return `${NARRATOR_VOICE}

The investigator is bound for ${city}, ${country}.
Fields of inquiry: ${interests.join(', ')}.

Prior case reactions — lean toward what they loved. If they passed / disliked a trail, do not repeat that venue, neighborhood, or the same kind of place:
${priorLines}

Write one distinct case for each of the following real places. You know the true name. The player must not.
If several belong to the same specialty, they are still SEPARATE files: different venue, different quarter, different kind of place, different clues.
A traveler who solved one must not be able to use that walk to close another.
Use the Address, Types, and Summary as the clues.
Hint 1 must be a direct statement of function, appearance, history or age, location, or civic significance, spoken as a night-clerk briefing. Pull age, role, and look from the Summary whenever it exists. Name the street or quarter from the Address line.
Hints 2 and 3 keep the same diction: pavement tells, then evidence to file.
Do not invent a canal, hill, or spire that is not implied by that place.

${placeLines}

Return JSON only, in this shape:
{
  "quests": [
    {
      "category": "Landmarks",
      "title": "enigmatic case-file title",
      "place_name": "exact true name from the briefing",
      "clue": "hint 1: clear facts in mystery diction — function, look, age, location, or significance",
      "default_hint": "hint 2: pavement recognition, still a briefing",
      "bonus_hint": "hint 3: confirmation to file as evidence, still without the proper name"
    }
  ]
}

Each hint is two to four sentences, second person, MotME night-clerk voice. Hint 1 stays short, factual, and atmospheric.`
}

async function writeWithGemini(prompt: string, apiKey: string): Promise<GeneratedQuest[]> {
  const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash']
  let lastError = 'Gemini refused every model'

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.45,
        responseMimeType: 'application/json',
      },
    }

    const attempts: Array<() => Promise<Response>> = [
      () =>
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(body),
        }),
      () =>
        fetch(`${url}?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
    ]

    for (const attempt of attempts) {
      const res = await attempt()
      if (!res.ok) {
        lastError = `Gemini ${model} ${res.status}: ${(await res.text()).slice(0, 280)}`
        continue
      }
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || ''
      const parsed = extractJson(text)
      const quests = Array.isArray(parsed.quests) ? parsed.quests : []
      if (quests.length === 0) {
        lastError = `Gemini ${model} returned an empty dossier`
        continue
      }
      return quests.map((quest: Partial<GeneratedQuest>) => ({
        category: String(quest.category || ''),
        title: String(quest.title || 'The File Without a Cover'),
        place_name: String(quest.place_name || ''),
        clue: String(quest.clue || ''),
        default_hint: String(quest.default_hint || ''),
        bonus_hint: String(quest.bonus_hint || ''),
      }))
    }
  }

  throw new Error(lastError)
}

function polishQuests(
  generated: GeneratedQuest[],
  selected: Array<PlaceCandidate & { category: string }>,
) {
  const usedTitles = new Set<string>()
  return selected.map(place => {
    const index = selected.indexOf(place)
    const match =
      generated.find(quest => foldName(quest.place_name) === foldName(place.name)) ||
      generated[index] ||
      fallbackQuest(place.category, place, '')
    let title = redactName(match.title, place.name)
    if (title.toLowerCase() === place.name.toLowerCase()) {
      title = fallbackQuest(place.category, place, '').title
    }
    const folded = foldName(title)
    if (!folded || usedTitles.has(folded)) {
      const district = place.address.split(',')[0]?.trim()
      title = district ? `${title.replace(/ — .*$/, '')} — ${district}` : `${title} ${index + 1}`
    }
    usedTitles.add(foldName(title))
    return {
      category: place.category,
      title,
      place_name: place.name,
      place_address: place.address,
      place_types: place.types,
      clue: stripMetaUniqueness(redactName(match.clue, place.name)),
      default_hint: stripMetaUniqueness(redactName(match.default_hint, place.name)),
      bonus_hint: stripMetaUniqueness(redactName(match.bonus_hint, place.name)),
    }
  })
}

async function askGeminiJson(prompt: string, apiKey: string): Promise<Record<string, unknown>> {
  const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash']
  let lastError = 'Gemini refused every model'

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }
    const attempts = [
      () =>
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(body),
        }),
      () =>
        fetch(`${url}?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
    ]
    for (const attempt of attempts) {
      const res = await attempt()
      if (!res.ok) {
        lastError = `Gemini ${model} ${res.status}: ${(await res.text()).slice(0, 280)}`
        continue
      }
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || ''
      return extractJson(text) as Record<string, unknown>
    }
  }

  throw new Error(lastError)
}

type VerifyRequest = {
  guess?: string
  placeName?: string
  placeAddress?: string
  city?: string
  country?: string
  title?: string
  hints?: string[]
}

async function handleVerifyGuess(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (req.method === 'OPTIONS') {
    send(res, 204, null)
    return true
  }
  if (req.method !== 'POST') {
    send(res, 405, { error: 'The agency only accepts sealed dispatches.' })
    return true
  }

  try {
    const payload = await readJson<VerifyRequest>(req)
    const guess = (payload.guess || '').trim()
    const placeName = (payload.placeName || '').trim()
    const placeAddress = (payload.placeAddress || '').trim()

    if (guess.length < 3) {
      send(res, 200, { match: false, reason: 'Three marks on the page, at least. The clerk will not file a shrug.' })
      return true
    }

    if (guessFitsCase(guess, {
      placeName,
      address: placeAddress,
      title: payload.title,
      hints: payload.hints,
    })) {
      send(res, 200, { match: true })
      return true
    }

    const { gemini } = apiKeys()
    if (!gemini) {
      send(res, 200, { match: false, reason: 'The ledgers do not agree. Look again, or name it more plainly.' })
      return true
    }

    const judged = await askGeminiJson(
      `You are the night clerk of MotME — Mystery of the Midnight Express, a 1930s detective-casebook.
A traveler claims they have identified a real place. Be generous. Accept the identification if it is even vaguely correct or clearly related to THIS venue.

True place name: ${placeName || 'not on the public docket — judge from the clues'}
Address: ${placeAddress || 'unlisted'}
City: ${[payload.city, payload.country].filter(Boolean).join(', ') || 'unlisted'}
Case title (not the place name): ${payload.title || 'unlisted'}
Clues already issued: ${(payload.hints || []).join(' | ') || 'none'}

Traveler's identification:
"""${guess}"""

Match is TRUE when any of these hold:
- official name, translation, nickname, abbreviation, or common misspelling
- a distinctive part of the name (one clear word is enough: Rialto, Uffizi, Accademia, San Marco)
- a description of this venue's function, look, age, or location that a local would connect to it
- they named a real site in this city that fits the clues, if no official name is on the docket
- they used a related type word that fits this file (the old bridge, the parish tower, the gallery) even if inexact

Match is FALSE only when they named a different specific place, or the guess is empty of meaning ("something", "idk", the case title copied back with no place in it).

Do not reveal the true name in your reason if match is false. Stay in period character. No modern app language.

Return JSON only: { "match": true, "reason": "one short sentence" }`,
      gemini,
    )

    send(res, 200, {
      match: Boolean(judged.match),
      reason: typeof judged.reason === 'string' ? judged.reason : undefined,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The wire went dead.'
    send(res, 500, { error: message })
  }

  return true
}

export async function handleQuestApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url || '/', 'http://localhost')
  const path = url.pathname
  if (path === '/api/verify-guess' || path === '/' || path === '') return handleVerifyGuess(req, res)
  if (path === '/api/generate-quests') return handleGenerateQuests(req, res)
  return handleVerifyGuess(req, res)
}

export async function handleGenerateQuests(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (req.method === 'OPTIONS') {
    send(res, 204, null)
    return true
  }

  if (req.method !== 'POST') {
    send(res, 405, { error: 'The agency only accepts sealed dispatches.' })
    return true
  }

  try {
    const payload = await readJson<GenerateRequest>(req)
    const city = (payload.city || '').trim()
    const country = (payload.country || '').trim()
    const interests = (payload.interests || []).map(item => String(item).trim()).filter(Boolean)
    const counts = normalizeCounts(interests, payload.counts)
    const priorCases = Array.isArray(payload.priorCases) ? payload.priorCases : []

    if (!city || !country || interests.length === 0) {
      send(res, 400, { error: 'Destination and fields of inquiry are required.' })
      return true
    }

    const { gemini, places: placesKey } = apiKeys()
    if (!placesKey) {
      send(res, 500, { error: 'GOOGLE_PLACE_API_KEY is not on file.' })
      return true
    }

    const totalCases = interests.reduce((sum, interest) => sum + (counts[interest] || 1), 0)
    const spread = totalCases > 1
    const bias = await geocodeCity(city, country, placesKey)

    const selected: Array<PlaceCandidate & { category: string }> = []
    const searchResults = await Promise.all(
      interests.map(async interest => {
        const needed = counts[interest] || 1
        const queries = queriesFor(interest, city, country, priorCases, spread ? Math.max(needed, 2) : needed)
        const typed = spread
          ? (INCLUDED_TYPES[interest] || []).map(type =>
              searchPlacesNew(
                `${type.replace(/_/g, ' ')}s in ${city}, ${country}`,
                placesKey,
                { includedType: type, bias },
              ).catch(() => []),
            )
          : []
        const batches = await Promise.all([
          ...queries.map(query => findPlaces(query, placesKey, bias)),
          ...typed,
        ])
        const merged = uniquePlaces(batches.flat())
        const local = merged.filter(place => belongsToDestination(place, city, country, bias))
        const found = local.length > 0 ? local : merged
        return { interest, found, needed }
      }),
    )

    for (const { interest, found, needed } of searchResults) {
      const chosen = pickPlaces(found, interest, priorCases, needed, selected)
      for (const place of chosen) selected.push({ ...place, category: interest })
    }

    const uniqueSelected: Array<PlaceCandidate & { category: string }> = []
    for (const place of selected) {
      if (uniqueSelected.some(item => isSamePlace(item, place))) continue
      uniqueSelected.push(place)
    }
    selected.length = 0
    selected.push(...uniqueSelected)

    if (selected.length === 0) {
      send(res, 502, { error: 'The field office found no venues in that city.' })
      return true
    }

    let quests: GeneratedQuest[] = []
    if (gemini) {
      const chunkSize = 6
      for (let i = 0; i < selected.length; i += chunkSize) {
        const chunk = selected.slice(i, i + chunkSize)
        try {
          const generated = await writeWithGemini(buildPrompt(city, country, interests, chunk, priorCases), gemini)
          quests = quests.concat(polishQuests(generated, chunk))
        } catch (error) {
          console.error('Gemini briefing failed, using field notes:', error)
          quests = quests.concat(chunk.map(place => fallbackQuest(place.category, place, city)))
        }
      }
    } else {
      quests = selected.map(place => fallbackQuest(place.category, place, city))
    }

    const seenVenues = new Set<string>()
    quests = ensureDistinctQuests(
      quests.filter(quest => {
        const key = foldName(quest.place_name) || foldName(quest.title)
        if (!key || seenVenues.has(key)) return false
        seenVenues.add(key)
        return true
      }),
    )

    send(res, 200, { quests })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The wire went dead.'
    send(res, 500, { error: message })
  }

  return true
}
