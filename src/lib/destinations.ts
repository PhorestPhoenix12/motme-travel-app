import { findCountries, type CountryRecord } from '../data/countries'

export type { CountryRecord }

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

function newSessionToken() {
  return crypto.randomUUID()
}

let gazetteerPromise: Promise<Record<string, string[]>> | null = null

async function loadGazetteer(): Promise<Record<string, string[]>> {
  if (!gazetteerPromise) {
    gazetteerPromise = import('../data/cities-by-country.json')
      .then(mod => (mod.default || mod) as Record<string, string[]>)
      .catch(error => {
        gazetteerPromise = null
        throw error
      })
  }
  return gazetteerPromise
}

function asSuggestions(cities: string[]): CitySuggestion[] {
  return cities.map(city => ({ placeId: '', city, secondary: '' }))
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

export function searchCountries(query: string): CountryRecord[] {
  return findCountries(query)
}

export function createCitySession() {
  return { token: newSessionToken() }
}

export async function listCities(countryCode: string, signal?: AbortSignal): Promise<CitySuggestion[]> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const gazetteer = await loadGazetteer()
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  return asSuggestions(gazetteer[countryCode.toUpperCase()] || [])
}

export async function suggestCities(params: {
  query: string
  countryCode?: string
  sessionToken: string
  signal?: AbortSignal
}): Promise<CitySuggestion[]> {
  const query = params.query.trim()
  const countryCode = (params.countryCode || '').toUpperCase()
  const local = countryCode
    ? (await listCities(countryCode, params.signal)).filter(item =>
        item.city.toLowerCase().includes(query.toLowerCase()),
      )
    : []
  if (query.length < 2) return local

  try {
    const res = await fetch('/api/destinations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: params.signal,
      body: JSON.stringify({
        action: 'suggest',
        query,
        countryCode,
        sessionToken: params.sessionToken,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as { suggestions?: CitySuggestion[] }
    if (res.ok && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
      return mergeSuggestions(data.suggestions, local)
    }
  } catch {
    // Places may be dark on a depot; the local gazetteer still names the city.
  }
  return local
}

export async function resolveCity(params: {
  query?: string
  placeId?: string
  countryCode?: string
  countryName?: string
  sessionToken: string
}): Promise<{ destination: ResolvedCity } | { error: string }> {
  const typed = (params.query || '').trim()
  try {
    const res = await fetch('/api/destinations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'resolve',
        query: typed,
        placeId: params.placeId,
        countryCode: params.countryCode,
        countryName: params.countryName,
        sessionToken: params.sessionToken,
      }),
    })
    const data = (await res.json()) as { destination?: ResolvedCity; error?: string }
    if (data.destination?.city && data.destination.country) {
      return { destination: data.destination }
    }
  } catch {
    // Fall through to the local ledger.
  }

  const countryCode = (params.countryCode || '').toUpperCase()
  if (typed && countryCode) {
    const local = await listCities(countryCode)
    const match = local.find(item => item.city.toLowerCase() === typed.toLowerCase())
    if (match) {
      return {
        destination: {
          city: match.city,
          country: params.countryName || countryCode,
          countryCode,
          placeId: match.placeId || undefined,
        },
      }
    }
  }

  return { error: 'The clerk cannot file that destination.' }
}
