import tls from 'node:tls'

try {
  tls.setDefaultCACertificates([
    ...tls.getCACertificates(),
    ...tls.getCACertificates('system'),
  ])
} catch {
  // Node without system CA merge still geocodes when the host already trusts OSM.
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
]
const USER_AGENT = 'MotME/1.0 (Mystery of the Midnight Express; place catalog)'
const GENERIC_GEO = new Set(['city', 'town', 'district', 'province', 'county', 'region', 'municipality', 'village', 'area'])

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

export function geocodeQueries(city: string, country: string): string[] {
  const raw = city.trim()
  const stripped = raw.replace(/^[\s'"‘’‛′`ʿʾ]+/u, '').replace(/[\s'"‘’‛′`]+$/u, '').trim()
  const folded = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
  const tokens = folded.split(/\s+/).filter(token => token.length >= 4 && !GENERIC_GEO.has(token.toLowerCase()))
  const last = tokens[tokens.length - 1]
  const withCountry = (name: string) => (country ? `${name}, ${country}` : name)
  return [...new Set([
    withCountry(raw),
    stripped && stripped !== raw ? withCountry(stripped) : '',
    folded && folded.toLowerCase() !== raw.toLowerCase() ? withCountry(folded) : '',
    last && tokens.length > 1 ? withCountry(last) : '',
  ].filter(Boolean))]
}

export function citySearchLabels(city: string): string[] {
  const raw = city.trim()
  const stripped = raw.replace(/^[\s'"‘’‛′`ʿʾ]+/u, '').replace(/[\s'"‘’‛′`]+$/u, '').trim()
  const folded = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
  const tokens = folded.split(/\s+/).filter(token => token.length >= 4 && !GENERIC_GEO.has(token.toLowerCase()))
  const last = tokens[tokens.length - 1]
  return [...new Set([raw, stripped, last && tokens.length > 1 ? last : ''].filter(Boolean))]
}

function classify(tags: Record<string, string>): { category: string; types: string[]; primaryType: string; summary: string } | null {
  const tourism = tags.tourism || ''
  const amenity = tags.amenity || ''
  const leisure = tags.leisure || ''
  const historic = tags.historic || ''
  const shop = tags.shop || ''
  const natural = tags.natural || ''
  const waterway = tags.waterway || ''
  const building = tags.building || ''
  const religion = tags.religion || ''
  const types = [tourism, amenity, leisure, historic, shop, natural, waterway, building, religion].filter(Boolean)
  const summary = (tags['description:en'] || tags.description || tags.note || '').trim()

  if (tourism === 'museum' || amenity === 'arts_centre' || tourism === 'gallery' || amenity === 'library') {
    return { category: 'Museums', types, primaryType: tourism || amenity || 'museum', summary }
  }
  if (['restaurant', 'cafe', 'fast_food', 'food_court', 'ice_cream'].includes(amenity) || shop === 'bakery' || amenity === 'marketplace') {
    return { category: 'Food', types, primaryType: amenity || shop || 'restaurant', summary }
  }
  if (
    ['park', 'garden', 'nature_reserve', 'beach_resort'].includes(leisure) ||
    ['wood', 'water', 'peak', 'beach', 'wetland', 'grassland'].includes(natural) ||
    leisure === 'marina' ||
    waterway === 'river' ||
    amenity === 'fountain'
  ) {
    return { category: 'Nature', types, primaryType: leisure || natural || waterway || 'park', summary }
  }
  if (['bar', 'pub', 'nightclub', 'biergarten', 'theatre', 'casino'].includes(amenity) || tourism === 'hotel') {
    return { category: 'Nightlife', types, primaryType: amenity || tourism, summary }
  }
  if (shop || amenity === 'marketplace') {
    return { category: 'Shopping', types, primaryType: shop || 'shop', summary }
  }
  if (
    historic ||
    ['attraction', 'viewpoint', 'artwork', 'monument', 'yes'].includes(tourism) ||
    ['cathedral', 'church', 'mosque', 'temple'].includes(building) ||
    amenity === 'place_of_worship' ||
    amenity === 'townhall' ||
    amenity === 'community_centre' ||
    amenity === 'school' ||
    religion
  ) {
    return { category: 'Landmarks', types, primaryType: historic || tourism || amenity || building || 'attraction', summary }
  }
  return null
}

async function nominatimSearch(query: string, limit = 1) {
  const url = new URL(NOMINATIM)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('addressdetails', '1')
  const res = await enqueue(() =>
    fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    }),
  )
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  return (await res.json()) as Array<{
    lat?: string
    lon?: string
    display_name?: string
    name?: string
    type?: string
    class?: string
    category?: string
    osm_type?: string
    osm_id?: number
    boundingbox?: string[]
    address?: { state?: string; county?: string; country?: string }
  }>
}

async function nominatimGeocode(city: string, country: string) {
  for (const query of geocodeQueries(city, country)) {
    const data = await nominatimSearch(query, 1)
    const hit = data[0]
    const lat = Number(hit?.lat)
    const lng = Number(hit?.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const bbox = parseBBox(hit?.boundingbox)
    const parent = await nominatimReverse(lat, lng)
    return {
      lat,
      lng,
      label: hit?.display_name || query,
      state: parent?.state || hit?.address?.state,
      county: parent?.county || hit?.address?.county,
      bbox: bbox || parent?.bbox,
    }
  }
  return null
}

function parseBBox(raw?: string[]) {
  if (!raw || raw.length < 4) return null
  const south = Number(raw[0])
  const north = Number(raw[1])
  const west = Number(raw[2])
  const east = Number(raw[3])
  if (![south, north, west, east].every(Number.isFinite)) return null
  return { south, north, west, east }
}

async function nominatimReverse(lat: number, lng: number) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('zoom', '8')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('accept-language', 'en')
  const res = await enqueue(() =>
    fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    }),
  )
  if (!res.ok) return null
  const data = (await res.json()) as {
    display_name?: string
    boundingbox?: string[]
    address?: { state?: string; county?: string; country?: string }
  }
  return {
    state: data.address?.state,
    county: data.address?.county,
    bbox: parseBBox(data.boundingbox),
    label: data.display_name,
  }
}

async function overpassAround(lat: number, lng: number, bbox?: { south: number; north: number; west: number; east: number } | null, radius = 12000) {
  const area = bbox
    ? `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`
    : `(around:${radius},${lat},${lng})`
  const timeout = onServerless() ? 8 : 25
  const query = `[out:json][timeout:${timeout}];
(
  nwr["tourism"]${area};
  nwr["historic"]${area};
  nwr["amenity"~"restaurant|cafe|marketplace|arts_centre|place_of_worship|townhall|community_centre|school|library|fountain"]${area};
  nwr["leisure"~"park|garden|nature_reserve|marina"]${area};
  nwr["shop"]${area};
  nwr["natural"~"wood|water|peak|beach|wetland"]${area};
  nwr["waterway"="river"]${area};
);
out center;`
  let lastError = 'Overpass failed'
  const endpoints = onServerless() ? OVERPASS.slice(0, 1) : OVERPASS
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'text/plain' },
        body: query,
        signal: AbortSignal.timeout(timeout * 1000 + 2000),
      })
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

function nominatimHitToPlace(
  hit: {
    lat?: string
    lon?: string
    display_name?: string
    name?: string
    type?: string
    class?: string
    category?: string
    osm_type?: string
    osm_id?: number
  },
  city: string,
  country: string,
): OsmPlace | null {
  const name = (hit.name || hit.display_name?.split(',')[0] || '').trim()
  if (!name) return null
  const kind = hit.class || hit.category || ''
  if (kind === 'place' || kind === 'boundary' || kind === 'highway' || kind === 'railway') return null
  if (['administrative', 'city', 'town', 'village', 'county', 'state', 'tertiary', 'secondary', 'primary', 'residential', 'track', 'path', 'unclassified', 'service'].includes(hit.type || '')) {
    return null
  }
  const tags: Record<string, string> = {}
  if (['amenity', 'tourism', 'leisure', 'historic', 'shop', 'natural', 'waterway'].includes(kind)) {
    tags[kind] = hit.type || kind
  } else if (hit.type) {
    tags.amenity = hit.type
    if (hit.type !== 'administrative') tags.tourism = hit.type
  }
  const classified = classify(tags) || {
    category: 'Landmarks',
    types: [hit.type || 'attraction'],
    primaryType: hit.type || 'attraction',
    summary: '',
  }
  const lat = Number(hit.lat)
  const lng = Number(hit.lon)
  return {
    id: hit.osm_id ? `osm:${hit.osm_type || 'node'}:${hit.osm_id}` : `osm:nominatim:${foldId(name)}`,
    name,
    address: hit.display_name || osmAddress({}, city, country),
    types: classified.types,
    summary: classified.summary,
    rating: null,
    ratings: 0,
    primaryType: classified.primaryType,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    category: classified.category,
  }
}

function foldGeo(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function foldId(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function onServerless() {
  return Boolean(process.env.VERCEL)
}

async function geocodeOpenMeteo(city: string, country: string) {
  const countryFold = foldGeo(country)
  const labels = [...citySearchLabels(city)].reverse()
  for (const name of labels) {
    try {
      const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
      url.searchParams.set('name', name)
      url.searchParams.set('count', '8')
      url.searchParams.set('language', 'en')
      url.searchParams.set('format', 'json')
      const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const data = (await res.json()) as {
        results?: Array<{ name?: string; latitude?: number; longitude?: number; country?: string; admin1?: string; country_code?: string }>
      }
      const hits = data.results || []
      const hit =
        hits.find(item => foldGeo(item.country || '') === countryFold) ||
        hits.find(item => countryFold.includes(foldGeo(item.country || '')) || foldGeo(item.country || '').includes(countryFold)) ||
        null
      if (!hit || !Number.isFinite(Number(hit.latitude)) || !Number.isFinite(Number(hit.longitude))) continue
      return {
        lat: Number(hit.latitude),
        lng: Number(hit.longitude),
        label: [hit.name, hit.admin1, hit.country].filter(Boolean).join(', '),
        state: hit.admin1,
        county: hit.name,
        bbox: null as { south: number; north: number; west: number; east: number } | null,
      }
    } catch (error) {
      console.error('Open-Meteo geocode failed:', error instanceof Error ? error.message : error)
    }
  }
  return null
}

async function photonSearch(query: string, limit = 8) {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('lang', 'en')
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Photon ${res.status}`)
  const data = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates?: number[] }
      properties?: {
        name?: string
        country?: string
        city?: string
        street?: string
        osm_key?: string
        osm_value?: string
        osm_id?: number
        osm_type?: string
        state?: string
      }
    }>
  }
  return data.features || []
}

async function geocodePhoton(city: string, country: string) {
  const countryFold = foldGeo(country)
  for (const query of geocodeQueries(city, country)) {
    try {
      const features = await photonSearch(query, 5)
      const hit = features.find(item => foldGeo(item.properties?.country || '') === countryFold) || features[0]
      const coords = hit?.geometry?.coordinates
      const lng = Number(coords?.[0])
      const lat = Number(coords?.[1])
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      const props = hit.properties || {}
      return {
        lat,
        lng,
        label: [props.name, props.city, props.state, props.country].filter(Boolean).join(', '),
        state: props.state,
        county: props.city || props.name,
        bbox: null as { south: number; north: number; west: number; east: number } | null,
      }
    } catch (error) {
      console.error('Photon geocode failed:', error instanceof Error ? error.message : error)
    }
  }
  return null
}

async function nominatimPois(city: string, country: string, region?: string): Promise<OsmPlace[]> {
  const cityLabels = citySearchLabels(city)
  const regionName = region?.replace(/\s+Province$/i, '').replace(/\s+Governorate$/i, '').trim()
  const labels = [...new Set([regionName, cityLabels[cityLabels.length - 1]].filter(Boolean))]
  const terms = ['market', 'bazaar', 'shop', 'mosque', 'park']
  const places: OsmPlace[] = []
  const seen = new Set<string>()
  for (const focus of labels) {
    for (const term of terms) {
      if (places.length >= 16) return places
      try {
        const hits = await nominatimSearch(`${term} ${focus}, ${country}`, 5)
        for (const hit of hits) {
          const place = nominatimHitToPlace(hit, city, country)
          if (!place) continue
          const key = place.name.toLowerCase()
          if (seen.has(key) || seen.has(place.id)) continue
          seen.add(key)
          seen.add(place.id)
          places.push(place)
        }
      } catch (error) {
        console.error('Nominatim POI search failed:', error instanceof Error ? error.message : error)
      }
    }
  }
  return places
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
    return (await geocodeOpenMeteo(city, country)) || (await geocodePhoton(city, country)) || (await nominatimGeocode(city, country))
  } catch (error) {
    console.error('OSM geocode failed:', error instanceof Error ? error.message : error)
    return null
  }
}

function photonFeatureToPlace(
  feature: {
    geometry?: { coordinates?: number[] }
    properties?: {
      name?: string
      country?: string
      city?: string
      street?: string
      osm_key?: string
      osm_value?: string
      osm_id?: number
      osm_type?: string
      state?: string
    }
  },
  city: string,
  country: string,
): OsmPlace | null {
  const props = feature.properties || {}
  const name = (props.name || '').trim()
  if (!name) return null
  const key = props.osm_key || ''
  const value = props.osm_value || ''
  if (['place', 'boundary', 'highway', 'railway'].includes(key)) return null
  const classified = classify({ [key]: value }) || {
    category: key === 'shop' ? 'Shopping' : 'Landmarks',
    types: [value || key || 'attraction'],
    primaryType: value || key || 'attraction',
    summary: '',
  }
  const lng = Number(feature.geometry?.coordinates?.[0])
  const lat = Number(feature.geometry?.coordinates?.[1])
  const address = [props.street, props.city || city, props.state, props.country || country].filter(Boolean).join(', ')
  return {
    id: props.osm_id ? `osm:${props.osm_type || 'node'}:${props.osm_id}` : `osm:photon:${foldId(name)}`,
    name,
    address,
    types: classified.types,
    summary: classified.summary,
    rating: null,
    ratings: 0,
    primaryType: classified.primaryType,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    category: classified.category,
  }
}

async function photonPois(city: string, country: string, region?: string): Promise<OsmPlace[]> {
  const cityLabels = citySearchLabels(city)
  const regionName = region?.replace(/\s+Province$/i, '').replace(/\s+Governorate$/i, '').trim()
  const focus = regionName || cityLabels[cityLabels.length - 1]
  if (!focus) return []
  const terms = ['market', 'bazaar', 'shop', 'mosque', 'park']
  const batches = await Promise.all(
    terms.map(async term => {
      try {
        return await photonSearch(`${term} ${focus} ${country}`, 8)
      } catch (error) {
        console.error('Photon POI search failed:', error instanceof Error ? error.message : error)
        return []
      }
    }),
  )
  const places: OsmPlace[] = []
  const seen = new Set<string>()
  for (const feature of batches.flat()) {
    const place = photonFeatureToPlace(feature, city, country)
    if (!place) continue
    const key = place.name.toLowerCase()
    if (seen.has(key) || seen.has(place.id)) continue
    seen.add(key)
    seen.add(place.id)
    places.push(place)
    if (places.length >= 16) break
  }
  return places
}

export async function loadOsmPlaces(city: string, country: string, bias?: { lat: number; lng: number } | null): Promise<OsmPlace[]> {
  const key = `${city}|${country}`.toLowerCase()
  const pending = cityCache.get(key)
  if (pending) return pending
  const work = (async () => {
    const located = await geocodeOsm(city, country)
    const geo = located || (bias && typeof bias.lat === 'number'
      ? { lat: bias.lat, lng: bias.lng, state: undefined as string | undefined, bbox: null as { south: number; north: number; west: number; east: number } | null }
      : null)
    if (!geo) return []
    let elements: OsmElement[] = []
    if (!onServerless()) {
      try {
        elements = await overpassAround(geo.lat, geo.lng, geo.bbox ?? null)
      } catch (error) {
        console.error(`Overpass failed for ${city}, ${country}:`, error instanceof Error ? error.message : error)
      }
    }
    const seen = new Set<string>()
    const places: OsmPlace[] = []
    const add = (place: OsmPlace | null) => {
      if (!place) return
      const fold = place.name.toLowerCase()
      if (seen.has(fold) || seen.has(place.id)) return
      seen.add(fold)
      seen.add(place.id)
      places.push(place)
    }
    for (const element of elements) add(elementToPlace(element, city, country))
    const region = geo.state
    if (places.length < 8) {
      for (const place of await photonPois(city, country, region)) add(place)
    }
    if (places.length < 8 && !onServerless()) {
      for (const place of await nominatimPois(city, country, region)) add(place)
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
  if (interest === 'Shopping' && direct.length > 0) return [...direct, ...places.filter(place => place.category !== 'Shopping')]
  if (direct.length > 0) return direct
  if (interest === 'Architecture') return places.filter(place => place.category === 'Landmarks')
  if (interest === 'Landmarks' || interest === 'Shopping') return places
  return places.filter(place => place.category === 'Landmarks' || place.category === interest)
}
