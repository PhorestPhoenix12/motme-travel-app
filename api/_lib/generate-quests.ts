import { existsSync, readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import tls from 'node:tls'
import { guessFitsCase } from '../../src/lib/identify'
import {
  cardsTooSimilar,
  catalogToQuest,
  hintCarriesIdentity,
  identityFactsOf,
  loadPlaceCards,
  loadPlaceCardsByIds,
  pickCatalogCards,
  prefersHidden,
  questHasPlaceFacts,
  savePlaceCard,
  withPlaceFacts,
  type CatalogCard,
  type PreferenceMap,
} from './case-catalog'
import { citySearchLabels, geocodeOsm, geocodeQueries, loadOsmPlaces, osmPlacesForInterest } from './osm-places'
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
  preferences?: PreferenceMap
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
  place_address: string
  place_type: string
  place_types: string[]
  description: string
  clue: string
  default_hint: string
  bonus_hint: string
  place_card_id?: string
  gemini_description?: string
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

/** Case-file rules for every briefing, catalog or freshly minted:
 * 1. Choose the venue first. Hints are written knowing that sealed answer.
 * 2. Every file has a real name, address, human type, and description.
 * 3. Each hint, with the city alone, must reverse to that exact venue.
 * 4. Served hints are the hint_1/2/3 columns on place_cards.
 * 5. Missing or preference-mismatched cards are minted, then filed, then served.
 * 6. Never serve a case that is not a row in place_cards.
 */
const NARRATOR_VOICE = `You are the night clerk of MotME — Mystery of the Midnight Express. You write sealed case-file clues in a 1930s rail-investigation voice.
Never break character with modern app language. Never say "app", "tap", "GPS", "selfie", "unlock", "click", or "download".
Never say the place's official name, a common nickname, or any token that would give the name away.
Every hint keeps mystery diction (clerk, file, sealed, porters, depot, briefing, evidence, classified) while staying factually clear.

Each of the three hints must independently reverse to the sealed venue. A clerk who knows the city and is given THAT HINT ALONE — no other hint, no proper name — must be able to name the exact answer. If two places in this city could fit the same sentence, that hint fails.
Every hint therefore states the street or a precise quarter, the kind of place, and at least one fact no sibling venue shares (a neighbor, a material, an age, a use, a view). Facts first, atmosphere in the same breath.
Hint 1: 1–2 sentences. Function, appearance, or history plus the exact street. Example: "The night clerk stamps this on the 16th-century stone footbridge that still carries people over the canal; shops cling to both sides of the span."
Hint 2: pavement recognition for the SAME answer — door, materials, neighbors, house number — still enough on its own to name the venue.
Hint 3: a confirmation detail from the field notes plus the street or quarter — still enough on its own, still never the proper name.
Do not open with empty poetry, "they say the stones", or a uniqueness disclaimer.
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
  maxKm = 22,
) {
  const hay = foldName(`${place.address || ''} ${place.name || ''}`)
  const cityFold = foldName(city)
  if (cityFold && hay.includes(cityFold)) return true
  const tokens = cityFold.split(' ').filter(token => token.length >= 4)
  if (tokens.some(token => hay.includes(token))) return true
  if ((CITY_ALIASES[cityFold] || []).some(alias => hay.includes(alias))) return true
  if (bias && typeof place.lat === 'number' && typeof place.lng === 'number') {
    const km = distanceKm(bias.lat, bias.lng, place.lat, place.lng)
    if (km <= maxKm) return true
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

function queriesFor(
  category: string,
  city: string,
  country: string,
  prior: PriorCase[],
  count = 1,
  preferences: PreferenceMap = {},
) {
  const variants = INTEREST_QUERY_VARIANTS[category] || INTEREST_QUERY_VARIANTS.Landmarks
  const loved = prior.filter(item => item.category === category && item.liked === true)
  const passed = prior.filter(item => item.category === category && item.liked === false)
  const subs = new Set(Object.values(preferences).flat())
  let start = passed.length > loved.length ? 1 : 0
  if (prefersHidden(preferences)) start = Math.max(start, 1)
  const chosen = count > 1
    ? variants.slice()
    : variants.slice(start, start + 3)
  if (category === 'Food' && (subs.has('street') || subs.has('markets'))) {
    chosen.unshift(variants[3], variants[1])
  }
  if (category === 'Shopping' && subs.has('books')) {
    chosen.unshift(variants[2])
  }
  if (category === 'Nightlife' && (subs.has('drinks') || subs.has('music') || subs.has('underground'))) {
    chosen.unshift(variants[2], variants[1])
  }
  if (chosen.length < 2 && variants.length > 1) chosen.push(variants[variants.length - 1])
  const labels = citySearchLabels(city)
  const primary = labels[0] || city
  const extras = labels.slice(1).map(label => chosen[0](label, country))
  return [...new Set([...chosen.map(build => build(primary, country)), ...extras])]
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

let placesNewDisabled = false
let googlePlacesDisabled = false

async function searchPlacesNew(
  query: string,
  apiKey: string,
  options?: { includedType?: string; bias?: { lat: number; lng: number } | null },
): Promise<PlaceCandidate[]> {
  if (googlePlacesDisabled || placesNewDisabled) return []
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
    if (res.status === 429) {
      placesNewDisabled = true
      googlePlacesDisabled = true
    }
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
    name: place.displayName?.text || '',
    address: place.formattedAddress || '',
    types: place.types || [],
    summary: place.editorialSummary?.text || place.generativeSummary?.overview?.text || '',
    rating: place.rating ?? null,
    ratings: place.userRatingCount ?? 0,
    primaryType: place.primaryType || '',
    lat: place.location?.latitude,
    lng: place.location?.longitude,
  })).filter(place => Boolean(place.name && place.name.toLowerCase() !== 'unknown place'))
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
    if (data.status === 'REQUEST_DENIED' || data.status === 'OVER_QUERY_LIMIT') googlePlacesDisabled = true
    throw new Error(`Places legacy ${data.status}: ${data.error_message || ''}`.trim())
  }
  return (data.results ?? []).map(place => ({
    id: place.place_id || place.name || query,
    name: place.name || '',
    address: place.formatted_address || '',
    types: place.types || [],
    summary: '',
    rating: place.rating ?? null,
    ratings: place.user_ratings_total ?? 0,
    primaryType: place.types?.[0] || '',
  })).filter(place => Boolean(place.name && place.name.toLowerCase() !== 'unknown place'))
}

async function findPlaces(
  query: string,
  apiKey: string,
  bias?: { lat: number; lng: number } | null,
) {
  if (googlePlacesDisabled) return [] as PlaceCandidate[]
  try {
    const latest = await searchPlacesNew(query, apiKey, { bias })
    if (latest.length > 0) return latest
  } catch (error) {
    console.error('Places New search failed:', error instanceof Error ? error.message : error)
  }
  if (googlePlacesDisabled) return [] as PlaceCandidate[]
  try {
    return await searchPlacesLegacy(query, apiKey)
  } catch (error) {
    console.error('Places legacy search failed:', error instanceof Error ? error.message : error)
    return []
  }
}

async function geocodeCity(city: string, country: string, apiKey: string) {
  if (apiKey && !placesNewDisabled) {
    for (const query of geocodeQueries(city, country)) {
      const hits = await searchPlacesNew(query, apiKey).catch(() => [])
      const hit = hits.find(place => typeof place.lat === 'number' && typeof place.lng === 'number')
      if (hit && hit.lat != null && hit.lng != null) return { lat: hit.lat, lng: hit.lng }
    }
  }
  const osm = await geocodeOsm(city, country)
  return osm ? { lat: osm.lat, lng: osm.lng } : null
}

async function fetchPlaceDetails(id: string, apiKey: string): Promise<Partial<PlaceCandidate> | null> {
  const placeId = id.startsWith('places/') ? id : `places/${id}`
  try {
    const res = await fetch(`https://places.googleapis.com/v1/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'id,displayName,formattedAddress,types,editorialSummary,generativeSummary,primaryType,location,rating,userRatingCount',
      },
    })
    if (!res.ok) return null
    const place = (await res.json()) as {
      id?: string
      displayName?: { text?: string }
      formattedAddress?: string
      types?: string[]
      editorialSummary?: { text?: string }
      generativeSummary?: { overview?: { text?: string } }
      primaryType?: string
      location?: { latitude?: number; longitude?: number }
      rating?: number
      userRatingCount?: number
    }
    return {
      id: place.id || id,
      name: place.displayName?.text || '',
      address: place.formattedAddress || '',
      types: place.types || [],
      summary: place.editorialSummary?.text || place.generativeSummary?.overview?.text || '',
      primaryType: place.primaryType || '',
      lat: place.location?.latitude,
      lng: place.location?.longitude,
      rating: place.rating ?? null,
      ratings: place.userRatingCount ?? 0,
    }
  } catch {
    return null
  }
}

async function completePlace(
  place: PlaceCandidate,
  apiKey: string,
  city: string,
  country: string,
): Promise<PlaceCandidate> {
  const needsAddress = !place.address.trim()
  const needsTypes = place.types.length === 0 && !place.primaryType
  const needsSummary = !place.summary.trim()
  let next = { ...place }
  if (place.id.startsWith('osm:')) {
    return {
      ...next,
      address: next.address.trim() || `${city}, ${country}`,
    }
  }
  if ((needsAddress || needsTypes || needsSummary) && place.id && place.id !== place.name) {
    const details = await fetchPlaceDetails(place.id, apiKey)
    if (details) {
      next = {
        ...next,
        name: next.name || details.name || '',
        address: next.address || details.address || '',
        types: next.types.length ? next.types : details.types || [],
        summary: next.summary || details.summary || '',
        primaryType: next.primaryType || details.primaryType || '',
        lat: next.lat ?? details.lat,
        lng: next.lng ?? details.lng,
        rating: next.rating ?? details.rating ?? null,
        ratings: next.ratings || details.ratings || 0,
      }
    }
  }
  if (!next.address.trim()) next.address = `${city}, ${country}`
  return next
}

function factsForQuest(
  quest: GeneratedQuest,
  place: PlaceCandidate & { category?: string },
  city: string,
  country: string,
): GeneratedQuest {
  return withPlaceFacts(quest, {
    name: place.name,
    address: place.address,
    types: place.types,
    primaryType: place.primaryType,
    summary: place.summary,
    city,
    country,
  })
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
  const defaultHint = `From the pavement in ${district}, the mark is the ${kind} whose address begins ${street}. It ${placeRole(place)}. Match ${placeLook(place)}.`
  const bonusHint = fieldNote
    ? `Seal the case on the ${kind} at ${street}: ${fieldNote}`
    : `Stand at ${street} and file the ${kind} that ${placeRole(place)} — ${placeLook(place)} is the tell no neighboring ${kind} in ${city} can steal.`
  const description = place.summary
    ? `${place.name} is a ${kind} at ${place.address || street}. ${place.summary.replace(/\s+/g, ' ').trim()}`
    : `${place.name} is a ${kind} at ${place.address || street}.`
  return withPlaceFacts({
    category,
    title: `${titleByCategory[category] || 'The File Without a Cover'} — ${street}`,
    place_name: place.name,
    place_address: place.address,
    place_types: place.types,
    clue,
    default_hint: defaultHint,
    bonus_hint: bonusHint,
    gemini_description: description,
    description,
    place_type: '',
  }, {
    name: place.name,
    address: place.address,
    types: place.types,
    primaryType: place.primaryType,
    summary: place.summary,
    city,
  })
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

Write clues for each location card below. The card — name, address, type, and description — is already chosen. That card is the sealed answer. Do not invent another venue, do not swap in a more famous sibling, and do not write a clue that could equally fit two places.
Each hint is tested ALONE with the city. A clerk who reads only Hint 1, or only Hint 2, or only Hint 3, must be able to name this exact answer from that hint and the city. Put the street or a precise quarter, the kind of place, and one exclusive fact in every hint.
Use the Address, Types, and Summary as the only facts. The archive description MAY use the official name. The three hints must never speak it.

${placeLines}

Return JSON only, in this shape:
{
  "quests": [
    {
      "category": "Landmarks",
      "title": "enigmatic case-file title",
      "place_name": "exact true name from the briefing — the sealed answer",
      "description": "2-3 factual sentences for the archive, using the real name, address, and type",
      "clue": "hint 1: independently uniquely identifying facts aimed at this sealed answer",
      "default_hint": "hint 2: independently uniquely identifying pavement facts for this same answer",
      "bonus_hint": "hint 3: independently uniquely identifying confirmation for this same answer"
    }
  ]
}

Each hint is two to four sentences, second person, MotME night-clerk voice. Every hint is uniquely solvable to the sealed answer on its own.`
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
      return quests.map((quest: Partial<GeneratedQuest> & { description?: string }) => ({
        category: String(quest.category || ''),
        title: String(quest.title || 'The File Without a Cover'),
        place_name: String(quest.place_name || ''),
        place_address: String(quest.place_address || ''),
        place_type: String(quest.place_type || ''),
        place_types: Array.isArray(quest.place_types) ? quest.place_types.map(String) : [],
        description: String(quest.description || quest.gemini_description || ''),
        clue: String(quest.clue || ''),
        default_hint: String(quest.default_hint || ''),
        bonus_hint: String(quest.bonus_hint || ''),
        gemini_description: String(quest.gemini_description || quest.description || ''),
      }))
    }
  }

  throw new Error(lastError)
}

function polishQuests(
  generated: GeneratedQuest[],
  selected: Array<PlaceCandidate & { category: string }>,
  city: string,
  country: string,
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
    return factsForQuest(
      {
        category: place.category,
        title,
        place_name: place.name,
        place_address: place.address,
        place_type: '',
        place_types: place.types,
        description: match.description || match.gemini_description || place.summary || '',
        clue: stripMetaUniqueness(redactName(match.clue, place.name)),
        default_hint: stripMetaUniqueness(redactName(match.default_hint, place.name)),
        bonus_hint: stripMetaUniqueness(redactName(match.bonus_hint, place.name)),
        gemini_description: match.gemini_description || place.summary || '',
      },
      place,
      city,
      country,
    )
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

    send(res, 200, {
      match: Boolean(guess),
      reason: guess ? undefined : 'The clerk needs something on the page before the wax can drop.',
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

function catalogAsPlace(card: CatalogCard): PlaceCandidate & { category: string } {
  return {
    id: card.googlePlaceId,
    name: card.googlePlaceName,
    address: card.address,
    types: card.placeTypes,
    summary: card.googleSummary || card.geminiDescription,
    rating: card.rating,
    ratings: card.ratingsCount,
    primaryType: card.primaryType,
    lat: card.lat ?? undefined,
    lng: card.lng ?? undefined,
    category: card.category,
  }
}

function placeAsLike(place: PlaceCandidate & { category?: string }, hint1 = '') {
  return {
    googlePlaceId: place.id,
    googlePlaceName: place.name,
    address: place.address,
    category: place.category,
    primaryType: place.primaryType,
    lat: place.lat,
    lng: place.lng,
    hint1,
    identityFacts: identityFactsOf({
      name: place.name,
      address: place.address,
      types: place.types,
      primaryType: place.primaryType,
      summary: place.summary,
    }),
    placeTypes: place.types,
    rating: place.rating,
    ratingsCount: place.ratings,
  }
}

function readGuessName(entry: unknown) {
  if (typeof entry === 'string') return entry.trim()
  if (!entry || typeof entry !== 'object') return ''
  const row = entry as { place_name?: string; placeName?: string; name?: string }
  return String(row.place_name || row.placeName || row.name || '').trim()
}

type HintSlot = 'clue' | 'default_hint' | 'bonus_hint'
const HINT_SLOTS: HintSlot[] = ['clue', 'default_hint', 'bonus_hint']

async function verifyHintBatch(
  items: Array<{ text: string; placeName: string; address?: string; summary?: string; category?: string }>,
  city: string,
  country: string,
  geminiKey: string,
) {
  if (items.length === 0) return [] as Array<{ ok: boolean; guess: string }>
  try {
    const parsed = await askGeminiJson(
      `You are a well-traveled night clerk who knows ${city}, ${country}.
Each briefing is independent. For that briefing ALONE — plus the city — name the real venue it describes. Do not use the other briefings. Do not pick a more famous sibling of the same type.
Return JSON: { "guesses": [{ "index": 1, "place_name": "official name, or empty if unknown" }] }

${items.map((item, index) => `${index + 1}. Specialty: ${item.category || 'unknown'}. Briefing: ${item.text}`).join('\n\n')}`,
      geminiKey,
    )
    const guesses = Array.isArray(parsed.guesses) ? parsed.guesses : []
    return items.map((item, index) => {
      const guess = readGuessName(guesses.find((row: { index?: number }) => Number(row.index) === index + 1) || guesses[index])
      if (guess && guessFitsCase(guess, { placeName: item.placeName, address: item.address })) {
        return { ok: true, guess }
      }
      return {
        ok: hintCarriesIdentity(item.text, { name: item.placeName, address: item.address, summary: item.summary }),
        guess,
      }
    })
  } catch {
    return items.map(item => ({
      ok: hintCarriesIdentity(item.text, { name: item.placeName, address: item.address, summary: item.summary }),
      guess: '',
    }))
  }
}

async function rewriteHint(
  quest: GeneratedQuest,
  place: PlaceCandidate & { category: string },
  city: string,
  geminiKey: string,
  slot: HintSlot,
  wrongGuess?: string,
) {
  const street = streetOf(place)
  const kind = placeKind(place)
  const previous = quest[slot]
  const angle =
    slot === 'clue'
      ? 'Use the street, the kind of place, and one historical or summary fact no sibling shares.'
      : slot === 'default_hint'
        ? 'Use the street or house number, the door and materials, and a neighbor or view that pins this exact venue.'
        : 'Use the street or quarter plus one confirmation detail from the field notes that only this venue has.'
  try {
    const parsed = await askGeminiJson(
      `${NARRATOR_VOICE}

Rewrite one hint for a sealed case in ${city}.
The previous briefing failed uniqueness. ${wrongGuess ? `A clerk who only had that briefing named "${wrongGuess}".` : 'A clerk who only had that briefing could not name the venue.'}
Previous briefing: ${previous}
True name (never speak it): ${place.name}
Address: ${place.address || 'unlisted'}
Kind: ${kind}
Street: ${street}
Summary: ${place.summary || 'none on file'}

A clerk given ONLY this city and this one hint must name this exact venue. ${angle} Never speak the official name.
Return JSON: { "hint": "..." }`,
      geminiKey,
    )
    const hint = redactName(String(parsed.hint || parsed.clue || '').trim(), place.name)
    if (hint.length >= 40) return hint
  } catch {
    // Fall through to the field-note briefing.
  }
  const fallback = fallbackQuest(place.category, place, city)
  return fallback[slot]
}

async function persistGeneratedCard(
  place: PlaceCandidate & { category: string },
  quest: GeneratedQuest,
  city: string,
  country: string,
): Promise<GeneratedQuest | null> {
  const complete = factsForQuest(quest, place, city, country)
  if (!questHasPlaceFacts(complete)) return null
  const saved = await savePlaceCard({
    googlePlaceId: place.id,
    googlePlaceName: complete.place_name,
    address: complete.place_address,
    city,
    country,
    category: place.category,
    placeTypes: complete.place_types,
    primaryType: place.primaryType,
    lat: place.lat,
    lng: place.lng,
    rating: place.rating,
    ratingsCount: place.ratings,
    googleSummary: place.summary || '',
    geminiDescription: complete.description,
    title: complete.title,
    hint1: complete.clue,
    hint2: complete.default_hint,
    hint3: complete.bonus_hint,
    identityFacts: identityFactsOf({
      name: complete.place_name,
      address: complete.place_address,
      types: complete.place_types,
      primaryType: place.primaryType,
      summary: place.summary,
    }),
    sources: {
      google: place.summary ? 'places_summary' : 'places_search',
      gemini: complete.description ? 'gemini_description' : 'composed_description',
    },
  })
  if (!saved?.id) return null
  return {
    ...complete,
    place_card_id: saved.id,
    gemini_description: saved.geminiDescription,
    description: saved.geminiDescription || complete.description,
  }
}

const BASE_SPECIALTIES = ['Landmarks', 'Food', 'Museums', 'Nature']

async function choosePlacesForNeeds(params: {
  city: string
  country: string
  shortfalls: Array<{ interest: string; needed: number }>
  catalog: CatalogCard[]
  alreadyChosen: CatalogCard[]
  priorCases: PriorCase[]
  preferences: PreferenceMap
  placesKey: string
  lean?: boolean
}) {
  const { city, country, shortfalls, catalog, alreadyChosen, priorCases, preferences, placesKey, lean } = params
  const selected: Array<PlaceCandidate & { category: string }> = []
  if (shortfalls.length === 0) return selected

  const totalCases = shortfalls.reduce((sum, item) => sum + item.needed, 0)
  const spread = lean ? false : totalCases > 1 || alreadyChosen.length > 0 || catalog.length > 0
  const bias = await geocodeCity(city, country, placesKey)
  const blocked = [...catalog.map(catalogAsPlace), ...alreadyChosen.map(catalogAsPlace)]

  const searchResults = !placesKey || googlePlacesDisabled
    ? shortfalls.map(({ interest, needed }) => ({ interest, needed, found: [] as PlaceCandidate[] }))
    : await Promise.all(
    shortfalls.map(async ({ interest, needed }) => {
      const queries = queriesFor(
        interest,
        city,
        country,
        priorCases,
        spread ? Math.max(needed, 2) : needed,
        preferences,
      ).slice(0, lean ? 1 : undefined)
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
      const local = merged.filter(place => belongsToDestination(place, city, country, bias, 22))
      const regional = merged.filter(place => belongsToDestination(place, city, country, bias, 220))
      const pool = local.length >= needed ? local : regional.length > 0 ? regional : merged
      const found = pool.filter(place => {
        const like = placeAsLike({ ...place, category: interest })
        if (blocked.some(item => isSamePlace(item, place) || cardsTooSimilar(placeAsLike(item), like))) return false
        if (selected.some(item => isSamePlace(item, place) || cardsTooSimilar(placeAsLike(item), like))) return false
        return true
      })
      return { interest, found, needed }
    }),
  )

  const needsOsm = searchResults.some(item => item.found.length < item.needed)
  const osmPool = needsOsm ? await loadOsmPlaces(city, country, bias) : []
  const withOsm = searchResults.map(item => {
    if (item.found.length >= item.needed) return item
    const extra = osmPlacesForInterest(osmPool, item.interest).map(place => ({
      id: place.id,
      name: place.name,
      address: place.address,
      types: place.types,
      summary: place.summary,
      rating: place.rating,
      ratings: place.ratings,
      primaryType: place.primaryType,
      lat: place.lat,
      lng: place.lng,
    }))
    const merged = uniquePlaces([...item.found, ...extra]).filter(place => {
      const like = placeAsLike({ ...place, category: item.interest })
      if (blocked.some(blockedPlace => isSamePlace(blockedPlace, place) || cardsTooSimilar(placeAsLike(blockedPlace), like))) return false
      return belongsToDestination(place, city, country, bias) || extra.some(osmPlace => osmPlace.id === place.id)
    })
    return { ...item, found: merged }
  })

  for (const { interest, found, needed } of withOsm) {
    const chosen = pickPlaces(found, interest, priorCases, needed, [...blocked, ...selected])
    const filled = await Promise.all(chosen.map(place => completePlace(place, placesKey, city, country)))
    for (const place of filled) {
      if (!place.name.trim() || !place.address.trim()) continue
      const like = placeAsLike({ ...place, category: interest })
      if (alreadyChosen.some(card => cardsTooSimilar(card, like))) continue
      if (selected.some(item => isSamePlace(item, place) || cardsTooSimilar(placeAsLike(item), like))) continue
      selected.push({ ...place, category: interest })
    }
  }

  const uniqueSelected: Array<PlaceCandidate & { category: string }> = []
  for (const place of selected) {
    if (uniqueSelected.some(item => isSamePlace(item, place))) continue
    uniqueSelected.push(place)
  }
  return uniqueSelected
}

async function ensureHintsObeyRules(
  minted: GeneratedQuest[],
  selected: Array<PlaceCandidate & { category: string }>,
  city: string,
  country: string,
  gemini: string,
): Promise<GeneratedQuest[]> {
  if (minted.length === 0) return minted

  const withFallback = minted.map(quest => {
    const place = selected.find(item => foldName(item.name) === foldName(quest.place_name))
    if (!place) return quest
    const fallback = fallbackQuest(place.category, place, city)
    const next = { ...quest }
    for (const slot of HINT_SLOTS) {
      const text = String(next[slot] || '').trim()
      if (!text || !hintCarriesIdentity(text, { name: place.name, address: place.address, summary: place.summary })) {
        next[slot] = fallback[slot]
      }
    }
    return next
  })

  if (!gemini) return withFallback

  const checks = withFallback.flatMap((quest, questIndex) => {
    const place = selected.find(item => foldName(item.name) === foldName(quest.place_name))
    return HINT_SLOTS.map(slot => ({
      questIndex,
      slot,
      text: quest[slot],
      placeName: quest.place_name,
      address: quest.place_address || place?.address,
      summary: place?.summary,
      category: quest.category,
    }))
  })
  const solved = await verifyHintBatch(checks, city, country, gemini)
  return Promise.all(
    withFallback.map(async (quest, questIndex) => {
      const place = selected.find(item => foldName(item.name) === foldName(quest.place_name))
      if (!place) return quest
      const fallback = fallbackQuest(place.category, place, city)
      let next = quest
      for (const [offset, slot] of HINT_SLOTS.entries()) {
        const result = solved[questIndex * HINT_SLOTS.length + offset]
        if (result?.ok) continue
        const hint = await rewriteHint(next, place, city, gemini, slot, result?.guess)
        const usable =
          hintCarriesIdentity(hint, { name: place.name, address: place.address, summary: place.summary })
            ? hint
            : fallback[slot]
        next = { ...next, [slot]: usable }
      }
      return next
    }),
  )
}

async function writeHintsForChosenPlaces(
  selected: Array<PlaceCandidate & { category: string }>,
  city: string,
  country: string,
  interests: string[],
  priorCases: PriorCase[],
  gemini: string,
) {
  if (selected.length === 0) return [] as GeneratedQuest[]
  if (!gemini) {
    return ensureHintsObeyRules(
      selected.map(place => fallbackQuest(place.category, place, city)),
      selected,
      city,
      country,
      '',
    )
  }

  let minted: GeneratedQuest[] = []
  const chunkSize = 6
  for (let i = 0; i < selected.length; i += chunkSize) {
    const chunk = selected.slice(i, i + chunkSize)
    try {
      const generated = await writeWithGemini(buildPrompt(city, country, interests, chunk, priorCases), gemini)
      minted = minted.concat(polishQuests(generated, chunk, city, country))
    } catch (error) {
      console.error('Gemini briefing failed, using field notes:', error)
      minted = minted.concat(chunk.map(place => fallbackQuest(place.category, place, city)))
    }
  }

  return ensureHintsObeyRules(minted, selected, city, country, gemini)
}

async function persistChosenCards(
  selected: Array<PlaceCandidate & { category: string }>,
  minted: GeneratedQuest[],
  alreadyChosen: CatalogCard[],
  city: string,
  country: string,
) {
  const remaining = [...selected]
  const kept: GeneratedQuest[] = []
  for (const quest of minted) {
    const idx = remaining.findIndex(item => foldName(item.name) === foldName(quest.place_name))
    const place = idx >= 0 ? remaining.splice(idx, 1)[0] : remaining.shift()
    if (!place) continue
    const like = placeAsLike(place, quest.clue)
    if (alreadyChosen.some(card => cardsTooSimilar(card, like))) continue
    if (kept.some(item => foldName(item.place_name) === foldName(place.name))) continue
    const sibling = kept.find(item => {
      const other = selected.find(placeItem => foldName(placeItem.name) === foldName(item.place_name))
      return other ? cardsTooSimilar(placeAsLike(other, item.clue), like) : false
    })
    if (sibling) continue
    const saved = await persistGeneratedCard(place, quest, city, country)
    if (saved) kept.push(saved)
  }
  for (const place of remaining) {
    const like = placeAsLike(place)
    if (alreadyChosen.some(card => cardsTooSimilar(card, like))) continue
    if (kept.some(item => foldName(item.place_name) === foldName(place.name))) continue
    const saved = await persistGeneratedCard(place, fallbackQuest(place.category, place, city), city, country)
    if (saved) kept.push(saved)
  }
  return kept
}

export async function mintBaseCardsForCity(
  city: string,
  country: string,
  options?: { min?: number; priorCases?: PriorCase[]; preferences?: PreferenceMap; useGemini?: boolean; lean?: boolean },
) {
  const keys = apiKeys()
  const gemini = options?.useGemini === false ? '' : keys.gemini
  const placesKey = keys.places
  const min = options?.min ?? 3
  const catalog = await loadPlaceCards(city, country)
  if (catalog.length >= min) {
    return { saved: 0, existing: catalog.length, quests: [] as GeneratedQuest[] }
  }

  const haveCategories = new Set(catalog.map(card => card.category))
  const shortfalls = BASE_SPECIALTIES
    .filter(interest => !haveCategories.has(interest))
    .map(interest => ({ interest, needed: 1 }))
  if (shortfalls.length === 0) {
    shortfalls.push({ interest: 'Landmarks', needed: Math.max(1, min - catalog.length) })
  } else {
    while (shortfalls.reduce((sum, item) => sum + item.needed, 0) < min - catalog.length) {
      shortfalls.push({ interest: BASE_SPECIALTIES[shortfalls.length % BASE_SPECIALTIES.length], needed: 1 })
    }
  }

  const selected = await choosePlacesForNeeds({
    city,
    country,
    shortfalls,
    catalog,
    alreadyChosen: [],
    priorCases: options?.priorCases || [],
    preferences: options?.preferences || {},
    placesKey,
    lean: options?.lean,
  })
  const drafted = await writeHintsForChosenPlaces(
    selected,
    city,
    country,
    shortfalls.map(item => item.interest),
    options?.priorCases || [],
    gemini,
  )
  const quests = await persistChosenCards(selected, drafted, [], city, country)
  if (quests.length === 0) {
    console.error(`mintBaseCardsForCity empty for ${city}, ${country}: key=${Boolean(placesKey)} selected=${selected.length} drafted=${drafted.length}`)
  }
  return { saved: quests.length, existing: catalog.length, quests }
}

export async function ensureBaseCards(
  city: string,
  country: string,
  options?: { priorCases?: PriorCase[]; preferences?: PreferenceMap },
) {
  const catalog = await loadPlaceCards(city, country)
  if (catalog.length >= 3) return catalog
  await mintBaseCardsForCity(city, country, { min: 3, ...options })
  return loadPlaceCards(city, country)
}

async function enforceCaseRulesOnCards(
  cards: CatalogCard[],
  city: string,
  country: string,
  gemini: string,
): Promise<CatalogCard[]> {
  if (cards.length === 0) return []
  const places = cards.map(catalogAsPlace)
  const drafted = cards.map(card => catalogToQuest(card) as GeneratedQuest)
  const enforced = await ensureHintsObeyRules(drafted, places, city, country, gemini)
  const next: CatalogCard[] = []
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index]
    const quest = enforced[index]
    if (
      quest.clue === card.hint1 &&
      quest.default_hint === card.hint2 &&
      quest.bonus_hint === card.hint3
    ) {
      next.push(card)
      continue
    }
    const saved = await persistGeneratedCard(places[index], quest, city, country)
    const [fresh] = saved?.place_card_id ? await loadPlaceCardsByIds([saved.place_card_id]) : []
    next.push(fresh || card)
  }
  return next
}

function remainingNeeds(
  interests: string[],
  counts: Record<string, number>,
  have: CatalogCard[],
) {
  return interests
    .map(interest => ({
      interest,
      needed: Math.max(0, (counts[interest] || 1) - have.filter(card => card.category === interest).length),
    }))
    .filter(item => item.needed > 0)
}

function mergeCards(base: CatalogCard[], extra: CatalogCard[]) {
  const next = [...base]
  for (const card of extra) {
    if (next.some(item => item.id === card.id || foldName(item.googlePlaceName) === foldName(card.googlePlaceName))) continue
    next.push(card)
  }
  return next
}

function fillFromCatalog(catalog: CatalogCard[], already: CatalogCard[], needed: number, interests?: string[]) {
  const extra: CatalogCard[] = []
  const wanted = interests && interests.length > 0 ? new Set(interests) : null
  for (const card of catalog) {
    if (extra.length >= needed) break
    if (wanted && !wanted.has(card.category)) continue
    if (!questHasPlaceFacts(catalogToQuest(card))) continue
    if (already.some(item => item.id === card.id) || extra.some(item => item.id === card.id)) continue
    extra.push(card)
  }
  return extra
}

async function mintForNeeds(params: {
  city: string
  country: string
  shortfalls: Array<{ interest: string; needed: number }>
  catalog: CatalogCard[]
  alreadyChosen: CatalogCard[]
  priorCases: PriorCase[]
  preferences: PreferenceMap
  placesKey: string
  gemini: string
  lean?: boolean
}) {
  if (params.shortfalls.length === 0) return [] as CatalogCard[]
  const selected = await choosePlacesForNeeds({
    city: params.city,
    country: params.country,
    shortfalls: params.shortfalls,
    catalog: params.catalog,
    alreadyChosen: params.alreadyChosen,
    priorCases: params.priorCases,
    preferences: params.preferences,
    placesKey: params.placesKey,
    lean: params.lean,
  })
  const drafted = await writeHintsForChosenPlaces(
    selected,
    params.city,
    params.country,
    params.shortfalls.map(item => item.interest),
    params.priorCases,
    params.gemini,
  )
  const minted = await persistChosenCards(selected, drafted, params.alreadyChosen, params.city, params.country)
  return loadPlaceCardsByIds(minted.map(quest => quest.place_card_id || '').filter(Boolean))
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
    const preferences = payload.preferences || {}

    if (!city || !country || interests.length === 0) {
      send(res, 400, { error: 'Destination and fields of inquiry are required.' })
      return true
    }

    const { gemini, places: placesKey } = apiKeys()
    let catalog = await ensureBaseCards(city, country, { priorCases, preferences })
    let selectedCards: CatalogCard[] = []

    const takeMatching = (strict: boolean) => {
      for (const interest of interests) {
        const needed = remainingNeeds(interests, counts, selectedCards).find(item => item.interest === interest)?.needed || 0
        if (needed <= 0) continue
        selectedCards = mergeCards(
          selectedCards,
          pickCatalogCards(catalog, interest, needed, priorCases, selectedCards, strict ? preferences : {}, strict),
        )
      }
    }

    takeMatching(true)
    let shortfalls = remainingNeeds(interests, counts, selectedCards)
    if (shortfalls.length > 0) {
      selectedCards = mergeCards(selectedCards, await mintForNeeds({
        city, country, shortfalls, catalog, alreadyChosen: selectedCards, priorCases, preferences, placesKey, gemini,
      }))
      catalog = await loadPlaceCards(city, country)
    }

    takeMatching(false)
    shortfalls = remainingNeeds(interests, counts, selectedCards)
    if (shortfalls.length > 0) {
      selectedCards = mergeCards(selectedCards, await mintForNeeds({
        city, country, shortfalls, catalog, alreadyChosen: selectedCards, priorCases, preferences: {}, placesKey, gemini,
      }))
      catalog = await loadPlaceCards(city, country)
    }

    const wanted = interests.reduce((sum, interest) => sum + (counts[interest] || 1), 0)
    if (selectedCards.length < wanted) {
      selectedCards = mergeCards(selectedCards, fillFromCatalog(catalog, selectedCards, wanted - selectedCards.length, interests))
    }

    if (selectedCards.length === 0) {
      await mintBaseCardsForCity(city, country, { min: Math.max(3, wanted), priorCases, preferences })
      catalog = await loadPlaceCards(city, country)
      takeMatching(false)
      selectedCards = mergeCards(selectedCards, fillFromCatalog(catalog, selectedCards, wanted || 1, interests))
    }

    if (selectedCards.length === 0) {
      selectedCards = mergeCards(selectedCards, await mintForNeeds({
        city,
        country,
        shortfalls: [{ interest: interests[0] || 'Landmarks', needed: Math.max(1, wanted) }],
        catalog,
        alreadyChosen: [],
        priorCases,
        preferences: {},
        placesKey,
        gemini,
        lean: true,
      }))
    }

    selectedCards = await enforceCaseRulesOnCards(selectedCards, city, country, gemini)
    const filed = await loadPlaceCardsByIds(selectedCards.map(card => card.id).filter(Boolean))
    const seenVenues = new Set<string>()
    const quests = filed
      .map(catalogToQuest)
      .filter(quest => {
        if (!quest.place_card_id || !questHasPlaceFacts(quest)) return false
        const key = foldName(quest.place_name) || foldName(quest.title)
        if (!key || seenVenues.has(key)) return false
        seenVenues.add(key)
        return true
      })

    if (quests.length === 0) {
      send(res, 502, { error: 'The field office found no complete venues in that city.' })
      return true
    }

    send(res, 200, { quests })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The wire went dead.'
    send(res, 500, { error: message })
  }

  return true
}
