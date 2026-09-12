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

export function searchCountries(query: string): CountryRecord[] {
  return findCountries(query)
}

export function createCitySession() {
  return { token: newSessionToken() }
}

export async function listCities(countryCode: string, signal?: AbortSignal): Promise<CitySuggestion[]> {
  const res = await fetch('/api/destinations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ action: 'list', countryCode }),
  })
  const data = (await res.json().catch(() => ({}))) as { suggestions?: CitySuggestion[]; error?: string }
  if (!res.ok) throw new Error(data.error || `The departure board failed (${res.status}).`)
  return Array.isArray(data.suggestions) ? data.suggestions : []
}

export async function suggestCities(params: {
  query: string
  countryCode?: string
  sessionToken: string
  signal?: AbortSignal
}): Promise<CitySuggestion[]> {
  const query = params.query.trim()
  if (query.length < 2) return []
  const res = await fetch('/api/destinations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: params.signal,
    body: JSON.stringify({
      action: 'suggest',
      query,
      countryCode: params.countryCode,
      sessionToken: params.sessionToken,
    }),
  })
  const data = (await res.json().catch(() => ({}))) as { suggestions?: CitySuggestion[]; error?: string; warning?: string }
  if (!res.ok) throw new Error(data.error || `City search failed (${res.status}).`)
  return Array.isArray(data.suggestions) ? data.suggestions : []
}

export async function resolveCity(params: {
  query?: string
  placeId?: string
  countryCode?: string
  countryName?: string
  sessionToken: string
}): Promise<{ destination: ResolvedCity } | { error: string }> {
  const res = await fetch('/api/destinations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'resolve',
      query: params.query,
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
  return { error: data.error || 'The clerk cannot file that destination.' }
}
