const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
]
const USER_AGENT = 'MotME/1.0 (Mystery of the Midnight Express; place catalog)'

export type OsmPlace = {
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
  category: string
}

type OsmElement = {
  type?: string
  id?: number
  lat?: number
  lon?: number
  center?: { lat?: number; lon?: number }
  tags?: Record<string, string>
}

let gate = Promise.resolve()

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function enqueue<T>(work: () => Promise<T>) {
  const run = gate.then(work, work)
  gate = run.then(() => undefined, () => undefined).then(() => sleep(1100))
  return run
}

function osmAddress(tags: Record<string, string>, city: string, country: string) {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ').trim()
  const locality = tags['addr:suburb'] || tags['addr:district'] || tags['addr:neighbourhood'] || ''
  const parts = [street, locality, tags['addr:city'] || city, tags['addr:country'] || country].filter(Boolean)
  return [...new Set(parts)].join(', ')
}

function classify(tags: Record<string, string>): { category: string; types: string[]; primaryType: string; summary: string } | null {
  const tourism = tags.tourism || ''
  const amenity = tags.amenity || ''
  const leisure = tags.leisure || ''
  const historic = tags.historic || ''
  const shop = tags.shop || ''
  const natural = tags.natural || ''
  const types = [tourism, amenity, leisure, historic, shop, natural, tags.building].filter(Boolean)
  const summary = (tags['description:en'] || tags.description || tags.note || '').trim()

  if (tourism === 'museum' || amenity === 'arts_centre' || tourism === 'gallery') {
    return { category: 'Museums', types, primaryType: tourism || amenity || 'museum', summary }
  }
  if (['restaurant', 'cafe', 'fast_food', 'food_court', 'ice_cream'].includes(amenity) || shop === 'bakery' || amenity === 'marketplace') {
    return { category: 'Food', types, primaryType: amenity || shop || 'restaurant', summary }
  }
  if (['park', 'garden', 'nature_reserve', 'beach_resort'].includes(leisure) || natural || leisure === 'marina') {
    return { category: 'Nature', types, primaryType: leisure || natural || 'park', summary }
  }
  if (['bar', 'pub', 'nightclub', 'biergarten', 'theatre', 'casino'].includes(amenity) || tourism === 'hotel') {
    return { category: 'Nightlife', types, primaryType: amenity || tourism, summary }
  }
  if (shop || amenity === 'marketplace') {
    return { category: 'Shopping', types, primaryType: shop || 'shop', summary }
  }
  if (historic || ['attraction', 'viewpoint', 'artwork', 'monument', 'yes'].includes(tourism) || tags.building === 'cathedral' || tags.building === 'church') {
    return { category: 'Landmarks', types, primaryType: historic || tourism || tags.building || 'attraction', summary }
  }
  return null
}

async function nominatimGeocode(city: string, country: string) {
  const url = new URL(NOMINATIM)
  url.searchParams.set('q', `${city}, ${country}`)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  const res = await enqueue(() =>
    fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    }),
  )
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  const data = (await res.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>
  const hit = data[0]
  const lat = Number(hit?.lat)
  const lng = Number(hit?.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng, label: hit?.display_name || `${city}, ${country}` }
}

async function overpassAround(lat: number, lng: number) {
  const query = `[out:json][timeout:20];
(
  nwr["tourism"~"attraction|museum|gallery|artwork|viewpoint|monument"](around:7000,${lat},${lng});
  nwr["historic"](around:7000,${lat},${lng});
  nwr["amenity"~"restaurant|cafe|marketplace|arts_centre"](around:7000,${lat},${lng});
  nwr["leisure"~"park|garden|nature_reserve"](around:7000,${lat},${lng});
);
out center;`
  let lastError = 'Overpass failed'
  for (const endpoint of OVERPASS) {
    try {
      const res = await enqueue(() =>
        fetch(endpoint, {
          method: 'POST',
          headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'text/plain' },
          body: query,
          signal: AbortSignal.timeout(35000),
        }),
      )
      if (!res.ok) {
        lastError = `Overpass ${res.status}`
        continue
      }
      const data = (await res.json()) as { elements?: OsmElement[] }
      return (data.elements || []).slice(0, 80)
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Overpass failed'
    }
  }
  throw new Error(lastError)
}

function elementToPlace(element: OsmElement, city: string, country: string): OsmPlace | null {
  const tags = element.tags || {}
  const name = (tags['name:en'] || tags.name || '').trim()
  if (!name) return null
  const classified = classify(tags)
  if (!classified) return null
  const lat = element.lat ?? element.center?.lat
  const lng = element.lon ?? element.center?.lon
  const id = `osm:${element.type || 'node'}:${element.id || name}`
  return {
    id,
    name,
    address: osmAddress(tags, city, country),
    types: classified.types,
    summary: classified.summary,
    rating: null,
    ratings: 0,
    primaryType: classified.primaryType,
    lat,
    lng,
    category: classified.category,
  }
}

const cityCache = new Map<string, Promise<OsmPlace[]>>()

export async function geocodeOsm(city: string, country: string) {
  try {
    return await nominatimGeocode(city, country)
  } catch (error) {
    console.error('OSM geocode failed:', error instanceof Error ? error.message : error)
    return null
  }
}

export async function loadOsmPlaces(city: string, country: string, bias?: { lat: number; lng: number } | null): Promise<OsmPlace[]> {
  const key = `${city}|${country}`.toLowerCase()
  const pending = cityCache.get(key)
  if (pending) return pending
  const work = (async () => {
    const geo = bias && typeof bias.lat === 'number' && typeof bias.lng === 'number'
      ? { lat: bias.lat, lng: bias.lng }
      : await nominatimGeocode(city, country)
    if (!geo) return []
    const elements = await overpassAround(geo.lat, geo.lng)
    const seen = new Set<string>()
    const places: OsmPlace[] = []
    for (const element of elements) {
      const place = elementToPlace(element, city, country)
      if (!place) continue
      const fold = place.name.toLowerCase()
      if (seen.has(fold) || seen.has(place.id)) continue
      seen.add(fold)
      seen.add(place.id)
      places.push(place)
    }
    return places
  })().catch(error => {
    console.error(`OSM places failed for ${city}, ${country}:`, error instanceof Error ? error.message : error)
    cityCache.delete(key)
    return [] as OsmPlace[]
  })
  cityCache.set(key, work)
  return work
}

export function osmPlacesForInterest(places: OsmPlace[], interest: string) {
  const direct = places.filter(place => place.category === interest)
  if (direct.length > 0) return direct
  if (interest === 'Architecture') return places.filter(place => place.category === 'Landmarks')
  if (interest === 'Landmarks') return places
  return places.filter(place => place.category === 'Landmarks' || place.category === interest)
}
