import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../src/db/client'
import { placeCards } from './schema'

export type PreferenceMap = Record<string, string[]>

export type CatalogCard = {
  id: string
  googlePlaceId: string
  googlePlaceName: string
  address: string
  city: string
  country: string
  category: string
  placeTypes: string[]
  primaryType: string
  lat: number | null
  lng: number | null
  rating: number | null
  ratingsCount: number
  googleSummary: string
  geminiDescription: string
  title: string
  hint1: string
  hint2: string
  hint3: string
  identityFacts: string[]
  sources: Record<string, string>
}

export type CatalogLike = {
  googlePlaceId: string
  googlePlaceName: string
  address: string
  category?: string
  primaryType?: string
  lat?: number | null
  lng?: number | null
  hint1?: string
  identityFacts?: string[]
  placeTypes?: string[]
  rating?: number | null
  ratingsCount?: number
}

export type CatalogPrior = {
  placeName?: string
  title?: string
  placeAddress?: string
  placeTypes?: string[]
  category?: string
  liked?: boolean | null
  note?: string
}

const CATEGORY_TYPE: Record<string, string> = {
  Landmarks: 'landmark',
  Food: 'restaurant',
  Museums: 'museum',
  Nature: 'park',
  Nightlife: 'bar',
  Architecture: 'landmark',
  Shopping: 'shop',
}

export function placeTypeLabel(types: string[] = [], primaryType = '', category = '') {
  const set = new Set(
    [...types, primaryType]
      .map(type => type.toLowerCase().replace(/\s+/g, '_'))
      .filter(Boolean),
  )
  if (set.has('library')) return 'library'
  if (set.has('museum')) return 'museum'
  if (set.has('art_gallery')) return 'gallery'
  if (set.has('book_store')) return 'shop'
  if (set.has('clothing_store') || set.has('shopping_mall') || set.has('store') || set.has('shoe_store') || set.has('jewelry_store')) {
    return 'shop'
  }
  if (set.has('market') || set.has('grocery_store') || set.has('supermarket') || set.has('food')) return 'market'
  if (set.has('restaurant') || set.has('meal_takeaway') || set.has('meal_delivery')) return 'restaurant'
  if (set.has('cafe')) return 'cafe'
  if (set.has('bakery')) return 'bakery'
  if (set.has('bar') || set.has('night_club') || set.has('liquor_store')) return 'bar'
  if (set.has('park') || set.has('campground') || set.has('garden')) return 'park'
  if (set.has('zoo') || set.has('aquarium')) return 'park'
  if (
    set.has('church') ||
    set.has('cathedral') ||
    set.has('place_of_worship') ||
    set.has('hindu_temple') ||
    set.has('mosque') ||
    set.has('synagogue')
  ) {
    return 'church'
  }
  if (set.has('bridge')) return 'bridge'
  if (set.has('university') || set.has('school') || set.has('college')) return 'university'
  if (set.has('city_hall') || set.has('local_government_office') || set.has('courthouse')) return 'landmark'
  if (set.has('route') || set.has('street_address') || set.has('neighborhood') || set.has('premise')) return 'street'
  if (set.has('tourist_attraction') || set.has('historical_landmark') || set.has('monument')) return 'landmark'
  if (set.has('performing_arts_theater') || set.has('movie_theater')) return 'theater'
  return CATEGORY_TYPE[category] || 'place'
}

export function archiveDescription(input: {
  name: string
  address: string
  type: string
  googleSummary?: string
  geminiDescription?: string
}) {
  const gemini = (input.geminiDescription || '').replace(/\s+/g, ' ').trim()
  if (gemini.length >= 24) return gemini
  const google = (input.googleSummary || '').replace(/\s+/g, ' ').trim()
  const lead = `${input.name} is a ${input.type} at ${input.address}.`
  if (google.length >= 20) {
    const nameStub = (input.name || '').toLowerCase().slice(0, 8)
    if (nameStub && google.toLowerCase().includes(nameStub)) return google
    return `${lead} ${google}`
  }
  return lead
}

export function questHasPlaceFacts(quest: {
  place_name?: string
  place_address?: string
  place_type?: string
  description?: string
  gemini_description?: string
}) {
  const name = (quest.place_name || '').trim()
  const address = (quest.place_address || '').trim()
  const type = (quest.place_type || '').trim()
  const description = (quest.description || quest.gemini_description || '').trim()
  if (!name || name.toLowerCase() === 'unknown place') return false
  if (address.length < 4) return false
  if (!type) return false
  if (description.length < 12) return false
  return true
}

export function withPlaceFacts<
  T extends {
    category?: string
    place_name?: string
    place_address?: string
    place_types?: string[]
    place_type?: string
    description?: string
    gemini_description?: string
  },
>(
  quest: T,
  extras?: {
    name?: string
    address?: string
    types?: string[]
    primaryType?: string
    summary?: string
    city?: string
    country?: string
  },
) {
  const name = (quest.place_name || extras?.name || '').trim()
  const address =
    (quest.place_address || extras?.address || '').trim() ||
    [extras?.city, extras?.country].filter(Boolean).join(', ')
  const types = (quest.place_types?.length ? quest.place_types : extras?.types) || []
  const type =
    (quest.place_type || '').trim() || placeTypeLabel(types, extras?.primaryType || '', quest.category || '')
  const description = archiveDescription({
    name,
    address,
    type,
    googleSummary: extras?.summary,
    geminiDescription: quest.description || quest.gemini_description,
  })
  return {
    ...quest,
    place_name: name,
    place_address: address,
    place_types: types.length ? types : type ? [type] : [],
    place_type: type,
    description,
    gemini_description: description,
  }
}

const PAD = new Set([
  'the', 'and', 'of', 'de', 'du', 'des', 'di', 'da', 'del', 'della', 'il', 'la', 'le', 'les', 'el', 'los', 'las',
  'von', 'van', 'a', 'an', 'in', 'on', 'at', 'to', 'by', 'for', 'with', 'file', 'case', 'clerk', 'night',
  'stamps', 'sealed', 'briefing', 'dossier', 'evidence', 'classified', 'still', 'city', 'public', 'place',
  'marked', 'location', 'this', 'that', 'from', 'into', 'over', 'under',
])

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

const TAXONOMY_TYPES: Record<string, string[]> = {
  'history:art': ['museum', 'art_gallery', 'tourist_attraction'],
  'history:war': ['tourist_attraction', 'museum', 'city_hall'],
  'history:science': ['museum', 'university', 'library'],
  'history:philosophy': ['library', 'museum', 'university'],
  'history:religion': ['church', 'place_of_worship', 'hindu_temple', 'mosque', 'synagogue', 'cathedral'],
  'history:ancient': ['tourist_attraction', 'museum'],
  'food:local': ['restaurant', 'cafe'],
  'food:traditional': ['restaurant', 'bakery'],
  'food:street': ['meal_takeaway', 'restaurant', 'cafe'],
  'food:fine-dining': ['restaurant'],
  'food:markets': ['market', 'food'],
  'food:drinks': ['bar', 'liquor_store', 'night_club'],
  'shops:street-style': ['clothing_store'],
  'shops:luxury': ['clothing_store', 'shopping_mall'],
  'shops:artisan': ['store', 'clothing_store'],
  'shops:antiques': ['store'],
  'shops:books': ['book_store', 'library'],
  'shops:local-brands': ['clothing_store', 'store'],
  'nature:parks': ['park'],
  'nature:wildlife': ['zoo', 'park'],
  'nature:mountains': ['park', 'campground'],
  'nature:water': ['park'],
  'nature:botanical': ['park'],
  'culture:museums': ['museum'],
  'culture:galleries': ['art_gallery', 'museum'],
  'culture:theatre': ['performing_arts_theater', 'tourist_attraction'],
  'culture:music': ['night_club', 'bar', 'concert_hall'],
  'culture:architecture': ['church', 'city_hall', 'university', 'tourist_attraction'],
  'culture:cinema': ['movie_theater', 'museum'],
  'hidden:underground': ['bar', 'night_club'],
  'hidden:night-markets': ['market'],
}

export function foldKey(text: string) {
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

export function cityKeysFor(city: string) {
  const fold = foldKey(city)
  const keys = new Set<string>([fold].filter(Boolean))
  for (const alias of CITY_ALIASES[fold] || []) keys.add(alias)
  for (const [canonical, aliases] of Object.entries(CITY_ALIASES)) {
    if (aliases.includes(fold) || canonical === fold) {
      keys.add(canonical)
      for (const alias of aliases) keys.add(alias)
    }
  }
  return [...keys]
}

export function distinctiveTokens(text: string) {
  return foldKey(text)
    .split(' ')
    .filter(token => token.length >= 4 && !PAD.has(token) && !/^\d+$/.test(token))
}

export function identityFactsOf(place: {
  name: string
  address?: string
  types?: string[]
  primaryType?: string
  summary?: string
}) {
  const street = (place.address || '').split(',')[0]?.trim() || ''
  const hood = (place.address || '').split(',').slice(0, 2).join(',').trim()
  return [...new Set([
    foldKey(place.name),
    foldKey(street),
    foldKey(hood),
    (place.primaryType || '').toLowerCase(),
    ...(place.types || []).map(type => type.toLowerCase()).slice(0, 5),
    ...distinctiveTokens(place.summary || ''),
  ].filter(Boolean))]
}

function tokenJaccard(a: string, b: string) {
  const left = new Set(distinctiveTokens(a))
  const right = new Set(distinctiveTokens(b))
  if (left.size === 0 || right.size === 0) return 0
  let overlap = 0
  for (const token of left) if (right.has(token)) overlap += 1
  return overlap / (left.size + right.size - overlap)
}

function neighborhoodOf(address?: string) {
  return (address || '').split(',').slice(0, 2).join(',').toLowerCase().trim()
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

export function cardsTooSimilar(a: CatalogLike, b: CatalogLike) {
  if (a.googlePlaceId && b.googlePlaceId && a.googlePlaceId === b.googlePlaceId) return true
  const nameA = foldKey(a.googlePlaceName)
  const nameB = foldKey(b.googlePlaceName)
  if (nameA && nameA === nameB) return true
  if (
    typeof a.lat === 'number' &&
    typeof b.lat === 'number' &&
    typeof a.lng === 'number' &&
    typeof b.lng === 'number' &&
    distanceKm(a.lat, a.lng, b.lat, b.lng) <= 0.12 &&
    (a.category === b.category || Boolean(a.primaryType && a.primaryType === b.primaryType))
  ) {
    return true
  }
  const hoodA = neighborhoodOf(a.address)
  const hoodB = neighborhoodOf(b.address)
  if (
    hoodA.length > 4 &&
    hoodA === hoodB &&
    a.category &&
    a.category === b.category &&
    a.primaryType &&
    a.primaryType === b.primaryType
  ) {
    return true
  }
  if (a.hint1 && b.hint1 && tokenJaccard(a.hint1, b.hint1) >= 0.38) return true
  const factsA = (a.identityFacts || []).join(' ')
  const factsB = (b.identityFacts || []).join(' ')
  if (factsA && factsB && tokenJaccard(factsA, factsB) >= 0.55) return true
  return false
}

export function hintCarriesIdentity(hint: string, place: { name: string; address?: string; summary?: string }) {
  const hay = foldKey(hint)
  if (hay.length < 60) return false
  const streetTokens = distinctiveTokens((place.address || '').split(',')[0] || '')
  const streetHit = streetTokens.some(token => hay.includes(token))
  const summaryHits = distinctiveTokens(place.summary || '').filter(token => hay.includes(token)).length
  const nameLeak = distinctiveTokens(place.name).filter(token => token.length >= 5 && hay.includes(token)).length
  if (nameLeak >= 2) return false
  return (streetHit && summaryHits >= 1) || summaryHits >= 2 || (streetHit && hay.length >= 90)
}

function preferredTypes(preferences: PreferenceMap) {
  const types = new Set<string>()
  for (const [group, subs] of Object.entries(preferences || {})) {
    for (const sub of subs || []) {
      for (const type of TAXONOMY_TYPES[`${group}:${sub}`] || []) types.add(type)
    }
  }
  return types
}

export function prefersHidden(preferences: PreferenceMap) {
  const hidden = preferences?.hidden || []
  return hidden.includes('offbeat') || hidden.includes('secret-spots') || hidden.includes('neighborhoods')
}

const CATEGORY_PREF_GROUPS: Record<string, string[]> = {
  Food: ['food'],
  Shopping: ['shops'],
  Nature: ['nature'],
  Museums: ['history', 'culture'],
  Nightlife: ['food', 'culture', 'hidden'],
  Architecture: ['history', 'culture'],
  Landmarks: ['history', 'culture', 'hidden'],
}

const OSM_TYPE_ALIAS: Record<string, string> = {
  attraction: 'tourist_attraction',
  artwork: 'tourist_attraction',
  monument: 'tourist_attraction',
  fast_food: 'meal_takeaway',
  gallery: 'art_gallery',
  garden: 'park',
  nature_reserve: 'park',
}

function cardTypesOf(card: CatalogLike) {
  const types = new Set(
    [...(card.placeTypes || []), card.primaryType || '']
      .map(type => type.toLowerCase().replace(/^\w+\./, ''))
      .filter(Boolean),
  )
  for (const type of [...types]) {
    const alias = OSM_TYPE_ALIAS[type]
    if (alias) types.add(alias)
  }
  return types
}

export function cardFitsPreferences(card: CatalogLike, category: string, preferences: PreferenceMap) {
  const groups = new Set(CATEGORY_PREF_GROUPS[category] || [])
  const wanted = new Set<string>()
  let hasRelevant = false
  for (const [group, subs] of Object.entries(preferences || {})) {
    if (!groups.has(group) && group !== 'hidden') continue
    for (const sub of subs || []) {
      const mapped = TAXONOMY_TYPES[`${group}:${sub}`]
      if (mapped?.length) {
        hasRelevant = true
        for (const type of mapped) wanted.add(type)
      } else if (group === 'hidden') {
        hasRelevant = true
      }
    }
  }
  if (prefersHidden(preferences) && (card.ratingsCount || 0) > 12000) return false
  if (!hasRelevant) return true
  if (wanted.size === 0) return true
  const types = cardTypesOf(card)
  for (const type of types) if (wanted.has(type)) return true
  return false
}

export function scoreCatalogCard(
  card: CatalogLike,
  category: string,
  prior: CatalogPrior[],
  already: CatalogLike[],
  preferences: PreferenceMap,
) {
  const loved = prior.filter(item => item.category === category && item.liked === true)
  const passed = prior.filter(item => item.category === category && item.liked === false)
  const popularity = (card.rating ?? 3.8) * Math.log10((card.ratingsCount || 8) + 10)
  let score = popularity

  const types = new Set((card.placeTypes || []).map(type => type.toLowerCase()))
  if (card.primaryType) types.add(card.primaryType.toLowerCase())
  const passedTypes = new Set(passed.flatMap(item => (item.placeTypes || []).map(type => type.toLowerCase())))
  const lovedTypes = new Set(loved.flatMap(item => (item.placeTypes || []).map(type => type.toLowerCase())))
  const passedNames = new Set(
    passed.map(item => item.placeName?.trim().toLowerCase()).filter((value): value is string => Boolean(value)),
  )
  const passedHoods = new Set(passed.map(item => neighborhoodOf(item.placeAddress)).filter(hood => hood.length > 4))

  if (passedNames.has(card.googlePlaceName.toLowerCase())) return -100
  for (const type of types) {
    if (passedTypes.has(type)) score -= 3.4
    if (lovedTypes.has(type)) score += 2.1
  }
  const hood = neighborhoodOf(card.address)
  if (hood && passedHoods.has(hood)) score -= 2.4
  if (card.primaryType && already.filter(item => item.primaryType === card.primaryType).length >= 2) score -= 2.6
  if (hood && already.some(item => neighborhoodOf(item.address) === hood)) score -= 1.3

  const wanted = preferredTypes(preferences)
  if (wanted.size > 0) {
    let hits = 0
    for (const type of types) if (wanted.has(type)) hits += 1
    score += hits * 1.7
  }
  if (prefersHidden(preferences)) {
    score += (card.ratingsCount || 0) > 12000 ? -2.2 : 1.4
  }
  return score
}

function usedPlaceNames(prior: CatalogPrior[]) {
  return new Set(
    prior
      .flatMap(item => [item.placeName, item.title])
      .filter((value): value is string => Boolean(value && value.trim()))
      .map(value => foldKey(value) || value.trim().toLowerCase()),
  )
}

export function pickCatalogCards(
  pool: CatalogCard[],
  category: string,
  needed: number,
  prior: CatalogPrior[],
  already: CatalogCard[],
  preferences: PreferenceMap,
  strictPreferences = true,
) {
  const used = usedPlaceNames(prior)
  const candidates = pool.filter(card => {
    if (card.category !== category) return false
    if (!questHasPlaceFacts(catalogToQuest(card))) return false
    const name = foldKey(card.googlePlaceName)
    if (name && used.has(name)) return false
    if (already.some(item => cardsTooSimilar(item, card))) return false
    if (strictPreferences && !cardFitsPreferences(card, category, preferences)) return false
    return true
  })

  candidates.sort(
    (a, b) =>
      scoreCatalogCard(b, category, prior, [...already], preferences) -
      scoreCatalogCard(a, category, prior, [...already], preferences),
  )

  const picked: CatalogCard[] = []
  for (const card of candidates) {
    if (picked.length >= needed) break
    if (scoreCatalogCard(card, category, prior, [...already, ...picked], preferences) < -50) continue
    if (picked.some(item => cardsTooSimilar(item, card))) continue
    picked.push(card)
  }
  return picked
}

function fromRow(row: typeof placeCards.$inferSelect): CatalogCard {
  return {
    id: row.id,
    googlePlaceId: row.googlePlaceId,
    googlePlaceName: row.googlePlaceName,
    address: row.address,
    city: row.city,
    country: row.country,
    category: row.category,
    placeTypes: row.placeTypes || [],
    primaryType: row.primaryType || '',
    lat: row.lat,
    lng: row.lng,
    rating: row.rating,
    ratingsCount: row.ratingsCount,
    googleSummary: row.googleSummary,
    geminiDescription: row.geminiDescription,
    title: row.title,
    hint1: row.hint1,
    hint2: row.hint2,
    hint3: row.hint3,
    identityFacts: row.identityFacts || [],
    sources: row.sources || {},
  }
}

export async function loadPlaceCards(city: string, country: string) {
  try {
    const keys = cityKeysFor(city)
    if (keys.length === 0) return []
    const rows = await db
      .select()
      .from(placeCards)
      .where(and(inArray(placeCards.cityKey, keys), eq(placeCards.countryKey, foldKey(country))))
    return rows.map(fromRow)
  } catch (error) {
    console.error('place card catalog load failed:', error)
    return []
  }
}

export type PlaceCardInsert = {
  googlePlaceId: string
  googlePlaceName: string
  address: string
  city: string
  country: string
  category: string
  placeTypes: string[]
  primaryType: string
  lat?: number
  lng?: number
  rating?: number | null
  ratingsCount?: number
  googleSummary: string
  geminiDescription: string
  title: string
  hint1: string
  hint2: string
  hint3: string
  identityFacts: string[]
  sources: Record<string, string>
}

export async function savePlaceCard(card: PlaceCardInsert): Promise<CatalogCard | null> {
  if (!card.googlePlaceName?.trim() || !card.address?.trim() || !card.geminiDescription?.trim()) {
    return null
  }
  try {
    const values = {
      googlePlaceId: card.googlePlaceId,
      googlePlaceName: card.googlePlaceName,
      address: card.address,
      city: card.city,
      country: card.country,
      cityKey: foldKey(card.city),
      countryKey: foldKey(card.country),
      category: card.category,
      placeTypes: card.placeTypes,
      primaryType: card.primaryType,
      lat: card.lat ?? null,
      lng: card.lng ?? null,
      rating: card.rating ?? null,
      ratingsCount: card.ratingsCount ?? 0,
      googleSummary: card.googleSummary,
      geminiDescription: card.geminiDescription,
      title: card.title,
      hint1: card.hint1,
      hint2: card.hint2,
      hint3: card.hint3,
      identityFacts: card.identityFacts,
      sources: card.sources,
    }
    const [row] = await db
      .insert(placeCards)
      .values(values)
      .onConflictDoUpdate({
        target: placeCards.googlePlaceId,
        set: {
          googlePlaceName: values.googlePlaceName,
          address: values.address,
          city: values.city,
          country: values.country,
          cityKey: values.cityKey,
          countryKey: values.countryKey,
          category: values.category,
          placeTypes: values.placeTypes,
          primaryType: values.primaryType,
          lat: values.lat,
          lng: values.lng,
          rating: values.rating,
          ratingsCount: values.ratingsCount,
          googleSummary: values.googleSummary,
          geminiDescription: values.geminiDescription,
          title: values.title,
          hint1: values.hint1,
          hint2: values.hint2,
          hint3: values.hint3,
          identityFacts: values.identityFacts,
          sources: values.sources,
        },
      })
      .returning()
    return row ? fromRow(row) : null
  } catch (error) {
    console.error('place card catalog save failed:', error)
    return null
  }
}

export async function loadPlaceCardsByIds(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return [] as CatalogCard[]
  try {
    const rows = await db.select().from(placeCards).where(inArray(placeCards.id, unique))
    const byId = new Map(rows.map(row => [row.id, fromRow(row)]))
    return unique.map(id => byId.get(id)).filter((card): card is CatalogCard => Boolean(card))
  } catch (error) {
    console.error('place card id load failed:', error)
    return []
  }
}

export function catalogToQuest(card: CatalogCard) {
  return withPlaceFacts(
    {
      category: card.category,
      title: card.title,
      place_name: card.googlePlaceName,
      place_address: card.address,
      place_types: card.placeTypes,
      clue: card.hint1,
      default_hint: card.hint2,
      bonus_hint: card.hint3,
      hints: [card.hint1, card.hint2, card.hint3],
      place_card_id: card.id,
      gemini_description: card.geminiDescription,
    },
    {
      name: card.googlePlaceName,
      address: card.address,
      types: card.placeTypes,
      primaryType: card.primaryType,
      summary: card.googleSummary,
      city: card.city,
      country: card.country,
    },
  )
}
