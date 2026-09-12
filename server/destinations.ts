import { existsSync, readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { countryByCode, countryByName } from '../src/data/countries'

const CITY_TYPES = new Set([
  'locality',
  'postal_town',
  'administrative_area_level_3',
  'colloquial_area',
])

const SUGGEST_CACHE_MS = 6 * 60 * 60 * 1000
const SUGGEST_CACHE_MAX = 1500
const MIN_QUERY = 2

type AddressComponent = {
  longText?: string
  shortText?: string
  types?: string[]
}

export type CitySuggestion = {
  placeId: string
  city: string
  secondary: string
}

export type ResolvedCity = {
  city: string
  country: string
  countryCode: string
  placeId?: string
}

type SuggestBody = {
  action?: string
  query?: string
  countryCode?: string
  countryName?: string
  sessionToken?: string
  placeId?: string
}

type AutocompletePrediction = {
  placePrediction?: {
    placeId?: string
    text?: { text?: string }
    structuredFormat?: {
      mainText?: { text?: string }
      secondaryText?: { text?: string }
    }
    types?: string[]
  }
}

type PlaceDetails = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  types?: string[]
  addressComponents?: AddressComponent[]
}

const suggestCache = new Map<string, { at: number; suggestions: CitySuggestion[] }>()
let gazetteer: Record<string, string[]> | null = null

function loadGazetteer() {
  if (gazetteer) return gazetteer
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    resolve(process.cwd(), 'src/data/cities-by-country.json'),
    resolve(process.cwd(), 'public/data/cities-by-country.json'),
    join(here, '../src/data/cities-by-country.json'),
    join(here, '../../src/data/cities-by-country.json'),
  ]
  for (const full of candidates) {
    if (!existsSync(full)) continue
    gazetteer = JSON.parse(readFileSync(full, 'utf8')) as Record<string, string[]>
    return gazetteer
  }
  gazetteer = {}
  return gazetteer
}

function gazetteerCities(countryCode: string) {
  if (!countryCode) return []
  return loadGazetteer()[countryCode.toUpperCase()] || []
}

function gazetteerSuggestions(countryCode: string): CitySuggestion[] {
  return gazetteerCities(countryCode).map(city => ({ placeId: '', city, secondary: '' }))
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

function apiKeys() {
  const env = loadEnv()
  return {
    gemini: (env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim(),
    places: (env.GOOGLE_PLACE_API_KEY || process.env.GOOGLE_PLACE_API_KEY || '').trim(),
  }
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
    if (size > 32 * 1024) throw new Error('Payload too large')
    chunks.push(buf)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? (JSON.parse(raw) as T) : ({} as T)
}

function cacheGet(key: string) {
  const hit = suggestCache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > SUGGEST_CACHE_MS) {
    suggestCache.delete(key)
    return null
  }
  return hit.suggestions
}

function cacheSet(key: string, suggestions: CitySuggestion[]) {
  if (suggestCache.size >= SUGGEST_CACHE_MAX) {
    const oldest = suggestCache.keys().next().value
    if (oldest) suggestCache.delete(oldest)
  }
  suggestCache.set(key, { at: Date.now(), suggestions })
}

function looksLikeCity(types: string[] | undefined) {
  return (types || []).some(type => CITY_TYPES.has(type))
}

function componentOf(parts: AddressComponent[] | undefined, type: string) {
  return (parts || []).find(part => part.types?.includes(type))
}

function canonicalCountry(code?: string, name?: string) {
  const byCode = code ? countryByCode(code) : undefined
  if (byCode) return byCode
  return name ? countryByName(name) : undefined
}

function cityFromDetails(details: PlaceDetails): ResolvedCity | null {
  const parts = details.addressComponents || []
  const city =
    componentOf(parts, 'locality')?.longText ||
    componentOf(parts, 'postal_town')?.longText ||
    componentOf(parts, 'administrative_area_level_3')?.longText ||
    (looksLikeCity(details.types) ? details.displayName?.text : '') ||
    ''
  const countryPart = componentOf(parts, 'country')
  const gazetteer = canonicalCountry(countryPart?.shortText, countryPart?.longText)
  if (!city.trim() || !gazetteer) return null
  return {
    city: city.trim(),
    country: gazetteer.name,
    countryCode: gazetteer.code,
    placeId: details.id,
  }
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced?.[1] ?? text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Gemini returned no ledger')
  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>
}

async function askGeminiJson(prompt: string, apiKey: string): Promise<Record<string, unknown>> {
  const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash']
  let lastError = 'Gemini refused every model'

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
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
      return extractJson(text)
    }
  }

  throw new Error(lastError)
}

async function placesAutocomplete(
  query: string,
  apiKey: string,
  countryCode?: string,
  sessionToken?: string,
): Promise<CitySuggestion[]> {
  const body: Record<string, unknown> = {
    input: query,
    languageCode: 'en',
    includedPrimaryTypes: ['(cities)'],
  }
  if (countryCode) {
    const code = countryCode.toLowerCase()
    body.includedRegionCodes = [code]
    body.regionCode = code
  }
  if (sessionToken) body.sessionToken = sessionToken

  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.text,suggestions.placePrediction.types',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Places autocomplete ${res.status}: ${(await res.text()).slice(0, 280)}`)
  }
  const data = (await res.json()) as { suggestions?: AutocompletePrediction[] }
  const seen = new Set<string>()
  const suggestions: CitySuggestion[] = []
  for (const item of data.suggestions || []) {
    const prediction = item.placePrediction
    const placeId = prediction?.placeId || ''
    const city = (prediction?.structuredFormat?.mainText?.text || prediction?.text?.text || '').trim()
    if (!placeId || !city) continue
    const key = city.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    suggestions.push({
      placeId,
      city,
      secondary: (prediction?.structuredFormat?.secondaryText?.text || '').trim(),
    })
    if (suggestions.length >= 8) break
  }
  return suggestions
}

async function placeDetails(placeId: string, apiKey: string, sessionToken?: string): Promise<PlaceDetails> {
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`)
  if (sessionToken) url.searchParams.set('sessionToken', sessionToken)
  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,addressComponents,types',
    },
  })
  if (!res.ok) {
    throw new Error(`Place details ${res.status}: ${(await res.text()).slice(0, 280)}`)
  }
  return (await res.json()) as PlaceDetails
}

async function searchCityText(query: string, countryName: string, apiKey: string): Promise<PlaceDetails | null> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.addressComponents',
    },
    body: JSON.stringify({
      textQuery: `${query}, ${countryName}`,
      languageCode: 'en',
      pageSize: 5,
    }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { places?: PlaceDetails[] }
  const places = data.places || []
  return places.find(place => looksLikeCity(place.types)) || places[0] || null
}

function matchesRequestedCountry(resolved: ResolvedCity, countryCode?: string, countryName?: string) {
  if (!countryCode && !countryName) return true
  const requested = canonicalCountry(countryCode, countryName)
  if (!requested) return true
  return resolved.countryCode === requested.code
}

async function geminiConfirmCity(
  query: string,
  countryName: string,
  apiKey: string,
  candidates: CitySuggestion[],
) {
  const judged = await askGeminiJson(
    `You verify geographic facts for MotME (Mystery of the Midnight Express).
Decide whether the traveler named a real, currently recognized city, town, village, or equivalent populated place — not a neighborhood, airport, hotel, region, or country.

Requested country: ${countryName}
Traveler input: ${JSON.stringify(query)}
Google city candidates (may be empty): ${JSON.stringify(candidates.slice(0, 5))}

Rules:
- match is true only if the input is that kind of place AND it belongs in the requested country.
- Prefer the Google candidate whose name is the same place, including common aliases (Peking = Beijing, Kiev = Kyiv).
- If none of the candidates is the place, still return the canonical English city name if you are certain.
- Do not invent obscure hamlets. If unsure, match is false.

Return JSON only: { "match": true, "city": "canonical English name", "reason": "short clerk-like sentence" }`,
    apiKey,
  )
  return {
    match: Boolean(judged.match),
    city: typeof judged.city === 'string' ? judged.city.trim() : '',
  }
}

function filterGazetteer(countryCode: string, query: string, limit = 40) {
  const q = query.trim().toLowerCase()
  const all = gazetteerSuggestions(countryCode)
  if (!q) return all.slice(0, 400)
  return all.filter(item => item.city.toLowerCase().includes(q)).slice(0, limit)
}

function mergeSuggestions(primary: CitySuggestion[], secondary: CitySuggestion[]) {
  const seen = new Set(primary.map(item => item.city.toLowerCase()))
  const merged = [...primary]
  for (const item of secondary) {
    const key = item.city.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }
  return merged
}

function handleList(body: SuggestBody, res: ServerResponse) {
  const countryCode = (body.countryCode || '').trim().toUpperCase()
  if (!countryCode) {
    send(res, 400, { error: 'A country is required before the departure board can open.' })
    return
  }
  const suggestions = gazetteerSuggestions(countryCode)
  send(res, 200, {
    suggestions,
    placesConfigured: Boolean(apiKeys().places),
    geminiConfigured: Boolean(apiKeys().gemini),
  })
}

async function handleSuggest(body: SuggestBody, res: ServerResponse) {
  const query = (body.query || '').trim()
  const countryCode = (body.countryCode || '').trim().toUpperCase()
  const local = countryCode ? filterGazetteer(countryCode, query) : []
  if (query.length < MIN_QUERY) {
    send(res, 200, { suggestions: local, placesConfigured: Boolean(apiKeys().places) })
    return
  }

  const { places } = apiKeys()
  if (!places) {
    send(res, 200, {
      suggestions: local,
      placesConfigured: false,
      warning: 'GOOGLE_PLACE_API_KEY is not on file; the clerk is using the local gazetteer.',
    })
    return
  }

  const cacheKey = `${countryCode}|${query.toLowerCase()}`
  const cached = cacheGet(cacheKey)
  if (cached) {
    send(res, 200, { suggestions: mergeSuggestions(cached, local), cached: true, placesConfigured: true })
    return
  }

  try {
    const suggestions = await placesAutocomplete(query, places, countryCode || undefined, body.sessionToken)
    cacheSet(cacheKey, suggestions)
    send(res, 200, { suggestions: mergeSuggestions(suggestions, local), placesConfigured: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Places lookup failed'
    send(res, 200, { suggestions: local, placesConfigured: true, warning: message })
  }
}

async function handleResolve(body: SuggestBody, res: ServerResponse) {
  const query = (body.query || '').trim()
  const placeId = (body.placeId || '').trim()
  const countryCode = (body.countryCode || '').trim().toUpperCase()
  const countryName = (body.countryName || canonicalCountry(countryCode)?.name || '').trim()
  const { places, gemini } = apiKeys()

  try {
    if (places && placeId) {
      const details = await placeDetails(placeId, places, body.sessionToken)
      const resolved = cityFromDetails(details)
      if (resolved && matchesRequestedCountry(resolved, countryCode, countryName)) {
        send(res, 200, { destination: resolved })
        return
      }
    }

    if (places && query.length >= MIN_QUERY) {
      const suggestions = await placesAutocomplete(query, places, countryCode || undefined, body.sessionToken)
      const exact = suggestions.find(item => item.city.toLowerCase() === query.toLowerCase()) ||
        (suggestions.length === 1 ? suggestions[0] : undefined)

      if (exact) {
        const details = await placeDetails(exact.placeId, places, body.sessionToken)
        const resolved = cityFromDetails(details)
        if (resolved && matchesRequestedCountry(resolved, countryCode, countryName)) {
          send(res, 200, { destination: resolved })
          return
        }
      }

      const searched = countryName ? await searchCityText(query, countryName, places) : null
      const fromSearch = searched ? cityFromDetails(searched) : null
      if (fromSearch && matchesRequestedCountry(fromSearch, countryCode, countryName)) {
        const namesAgree =
          fromSearch.city.toLowerCase() === query.toLowerCase() ||
          suggestions.some(item => item.city.toLowerCase() === fromSearch.city.toLowerCase())
        if (namesAgree) {
          send(res, 200, { destination: fromSearch })
          return
        }
        if (gemini) {
          const judged = await geminiConfirmCity(query, countryName || fromSearch.country, gemini, suggestions)
          if (judged.match) {
            send(res, 200, {
              destination: {
                ...fromSearch,
                city: judged.city || fromSearch.city,
              },
            })
            return
          }
        }
      }

      if (gemini && countryName) {
        const judged = await geminiConfirmCity(query, countryName, gemini, suggestions)
        if (judged.match && judged.city) {
          const verified = await searchCityText(judged.city, countryName, places)
          const resolved = verified ? cityFromDetails(verified) : null
          if (resolved && matchesRequestedCountry(resolved, countryCode, countryName)) {
            send(res, 200, { destination: resolved })
            return
          }
        }
      }
    }
  } catch {
    // Google may refuse a lookup; Gemini and the GeoNames ledger still file a known city.
  }

  if (gemini && countryName && query.length >= MIN_QUERY) {
    try {
      const local = countryCode ? filterGazetteer(countryCode, query, 8) : []
      const judged = await geminiConfirmCity(query, countryName, gemini, local)
      if (judged.match && judged.city) {
        const ledgerCountry = canonicalCountry(countryCode, countryName)
        if (ledgerCountry) {
          send(res, 200, {
            destination: {
              city: judged.city,
              country: ledgerCountry.name,
              countryCode: ledgerCountry.code,
            },
          })
          return
        }
      }
    } catch {
      // Gemini may be dark; the gazetteer still files an exact city name.
    }
  }

  const ledgerName = gazetteerCities(countryCode).find(name => name.toLowerCase() === query.toLowerCase())
  const ledgerCountry = canonicalCountry(countryCode, countryName)
  if (ledgerName && ledgerCountry) {
    send(res, 200, {
      destination: {
        city: ledgerName,
        country: ledgerCountry.name,
        countryCode: ledgerCountry.code,
      },
    })
    return
  }

  if (query.length < MIN_QUERY && !placeId) {
    send(res, 400, { error: 'Name the city more plainly.' })
    return
  }

  send(res, 200, { error: 'The clerk cannot find that city on the recognized ledgers.' })
}

export async function handleDestinationsApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (req.method === 'OPTIONS') {
    send(res, 204, null)
    return true
  }
  if (req.method !== 'POST') {
    send(res, 405, { error: 'The agency only accepts sealed dispatches.' })
    return true
  }

  try {
    const body = await readJson<SuggestBody>(req)
    const action = (body.action || 'suggest').trim()
    if (action === 'list') {
      handleList(body, res)
      return true
    }
    if (action === 'suggest') {
      await handleSuggest(body, res)
      return true
    }
    if (action === 'resolve') {
      await handleResolve(body, res)
      return true
    }
    send(res, 400, { error: 'Unknown destination request.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The wire went dead.'
    send(res, 500, { error: message })
  }
  return true
}
