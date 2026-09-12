import { existsSync, readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import tls from 'node:tls'
import { guessMatchesPlace } from '../src/lib/identify.ts'

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
}

type GeneratedQuest = {
  category: string
  title: string
  place_name: string
  clue: string
  default_hint: string
  bonus_hint: string
}

const INTEREST_QUERY_VARIANTS: Record<string, Array<(city: string, country: string) => string>> = {
  Landmarks: [
    (city, country) => `famous landmarks monuments and historic sites in ${city}, ${country}`,
    (city, country) => `lesser known historic sites and local monuments in ${city}, ${country}`,
    (city, country) => `viewpoints bridges fountains and civic landmarks in ${city}, ${country}`,
  ],
  Food: [
    (city, country) => `iconic local restaurants historic cafes and regional cuisine in ${city}, ${country}`,
    (city, country) => `neighborhood trattorias bistros and family kitchens in ${city}, ${country}`,
    (city, country) => `bakeries pastry shops and breakfast rooms in ${city}, ${country}`,
    (city, country) => `street food wine bars and casual regional cooking in ${city}, ${country}`,
    (city, country) => `fine dining and chef-driven restaurants in ${city}, ${country}`,
  ],
  Museums: [
    (city, country) => `museums galleries and cultural archives in ${city}, ${country}`,
    (city, country) => `smaller house museums and specialist collections in ${city}, ${country}`,
    (city, country) => `art galleries and historic libraries in ${city}, ${country}`,
  ],
  Nature: [
    (city, country) => `parks gardens riversides and scenic green spaces in ${city}, ${country}`,
    (city, country) => `quiet gardens botanical collections and hidden courtyards in ${city}, ${country}`,
    (city, country) => `waterfront walks hills and nature reserves in ${city}, ${country}`,
  ],
  Nightlife: [
    (city, country) => `historic bars cocktail lounges cabarets and nightlife in ${city}, ${country}`,
    (city, country) => `neighborhood wine bars and late cafes in ${city}, ${country}`,
    (city, country) => `jazz clubs speakeasies and old taverns in ${city}, ${country}`,
  ],
  Architecture: [
    (city, country) => `historic architecture palaces churches and notable buildings in ${city}, ${country}`,
    (city, country) => `art nouveau palazzi and hidden courtyards in ${city}, ${country}`,
    (city, country) => `civic halls libraries and remarkable facades in ${city}, ${country}`,
  ],
  Shopping: [
    (city, country) => `historic markets bazaars shopping streets and covered passages in ${city}, ${country}`,
    (city, country) => `local food markets and artisan stalls in ${city}, ${country}`,
    (city, country) => `bookshops antique streets and independent shops in ${city}, ${country}`,
  ],
}

const COMMON_WORDS = new Set([
  'the', 'and', 'of', 'de', 'du', 'des', 'la', 'le', 'les', 'el', 'los', 'las', 'von', 'van',
  'museum', 'musee', 'museo', 'park', 'garden', 'cafe', 'restaurant', 'bar', 'hotel', 'church',
  'cathedral', 'palace', 'castle', 'tower', 'bridge', 'square', 'market', 'gallery', 'house',
  'street', 'avenue', 'place', 'plaza', 'city', 'old', 'new', 'grand', 'great', 'national',
])

const NARRATOR_VOICE = `You are the narrator of MotME — Mystery of the Midnight Express, a detective-casebook travel app styled like a 1930s Orient Express investigation.
You write atmospheric, noir-tinged mystery clues about real places for a traveler to go find in person.
Never break character with modern app language. Never say "app", "tap", "GPS", "selfie", "unlock", "click", or "download".
Never say the place's name outright — the player must deduce it. Do not use official names, common nicknames, or any token that would give the name away.
Each of the 3 hints gets a bit more specific:
1. Atmospheric and city-scale. Mood, light, rumor, a compass direction. A stranger could not walk straight there.
2. Neighborhood, ritual, materials, or a local habit. A seasoned traveler would begin to narrow the field.
3. Distinctive details a visitor would confirm on arrival — a view, a number, a sound, a worn threshold — still never the proper name.
Titles are pulp case-file names, italic-ready and enigmatic. Never the venue's name.`

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

function usedPlaceNames(prior: PriorCase[]) {
  return new Set(
    prior
      .flatMap(item => [item.placeName, item.title])
      .filter((value): value is string => Boolean(value && value.trim()))
      .map(value => value.trim().toLowerCase()),
  )
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
  for (const place of already) used.add(place.name.toLowerCase())
  const pool = candidates.filter(place => !used.has(place.name.toLowerCase()))
  const picked: PlaceCandidate[] = []
  const remaining = pool.slice()
  while (picked.length < count && remaining.length > 0) {
    remaining.sort(
      (a, b) =>
        scorePlace(b, category, prior, [...already, ...picked]) -
        scorePlace(a, category, prior, [...already, ...picked]),
    )
    const next = remaining.shift()
    if (!next || scorePlace(next, category, prior, [...already, ...picked]) < -50) continue
    picked.push(next)
  }
  return picked
}

function queriesFor(category: string, city: string, country: string, prior: PriorCase[]) {
  const variants = INTEREST_QUERY_VARIANTS[category] || INTEREST_QUERY_VARIANTS.Landmarks
  const loved = prior.filter(item => item.category === category && item.liked === true)
  const passed = prior.filter(item => item.category === category && item.liked === false)
  const start = passed.length > loved.length ? 1 : 0
  const chosen = variants.slice(start, start + 3)
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

async function searchPlacesNew(query: string, apiKey: string): Promise<PlaceCandidate[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.types,places.editorialSummary,places.rating,places.userRatingCount,places.primaryType,places.generativeSummary',
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'en', pageSize: 20 }),
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

async function findPlaces(query: string, apiKey: string) {
  try {
    const latest = await searchPlacesNew(query, apiKey)
    if (latest.length > 0) return latest
  } catch {
    // Fall through to the classic Places Text Search.
  }
  return searchPlacesLegacy(query, apiKey)
}

function fallbackQuest(category: string, place: PlaceCandidate, city: string): GeneratedQuest {
  const district = place.address.split(',').slice(0, 2).join(', ')
  const material = place.types.includes('church') || place.types.includes('place_of_worship')
    ? 'stone that has heard more confessions than trains'
    : place.types.includes('park')
      ? 'a hush of leaves where the city pretends to forget itself'
      : place.types.includes('restaurant') || place.types.includes('cafe')
        ? 'an aroma the locals follow without looking at a map'
        : 'a silhouette that has outlived several timetables'
  const titleByCategory: Record<string, string> = {
    Landmarks: 'The Sentinel That Keeps the Hour',
    Food: "The Ledger of Salt and Smoke",
    Museums: 'The Gallery of Unfiled Hours',
    Nature: 'The Garden That Corrects the Map',
    Nightlife: 'The Last Glass Before the Whistle',
    Architecture: 'The Facade That Lies Politely',
    Shopping: 'The Stall of Second Lives',
  }
  return {
    category,
    title: `${titleByCategory[category] || 'The File Without a Cover'}${district ? ` — ${district.split(',')[0]}` : ''}`,
    place_name: place.name,
    clue: `The Midnight Express does not deliver you to a name. In ${city}, follow ${material}. Word among the porters is that the truth sits where the old city still bothers to dress for evening.`,
    default_hint: `Narrow your search toward ${district || 'the quarter the guidebooks mention second'}. Those who keep regular hours pass it without looking up; those who arrive off the night train feel it before they see it.`,
    bonus_hint: place.summary
      ? redactName(`Confirm the site by this field note, stripped of its proper name: ${place.summary} If a plaque or worn threshold agrees, you have the right door.`, place.name)
      : `Stand where the light falls most severely. Count what the builders repeated — arches, windows, or steps. The number will not be fashionable. File what you find.`,
  }
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

Write one case for each of the following real places. You know the true name. The player must not.

${placeLines}

Return JSON only, in this shape:
{
  "quests": [
    {
      "category": "Landmarks",
      "title": "enigmatic case-file title",
      "place_name": "exact true name from the briefing",
      "clue": "hint 1, least specific",
      "default_hint": "hint 2, narrower",
      "bonus_hint": "hint 3, most specific without naming"
    }
  ]
}

Each hint is two to four sentences, second person, as a briefing from the Midnight Express Detective Agency.`
}

async function writeWithGemini(prompt: string, apiKey: string): Promise<GeneratedQuest[]> {
  const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash']
  let lastError = 'Gemini refused every model'

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
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
  return selected.map(place => {
    const index = selected.indexOf(place)
    const match =
      generated.find(quest => quest.place_name.toLowerCase() === place.name.toLowerCase()) ||
      generated[index] ||
      fallbackQuest(place.category, place, '')
    const title = redactName(match.title, place.name)
    return {
      category: place.category,
      title: title.toLowerCase() === place.name.toLowerCase() ? fallbackQuest(place.category, place, '').title : title,
      place_name: place.name,
      place_address: place.address,
      place_types: place.types,
      clue: redactName(match.clue, place.name),
      default_hint: redactName(match.default_hint, place.name),
      bonus_hint: redactName(match.bonus_hint, place.name),
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

    if (guessMatchesPlace(guess, placeName, placeAddress)) {
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
A traveler claims they have identified a real place. Decide if their identification refers to THIS venue — by official name, common nickname, street, or a description specific enough that a local would not confuse it with another site.

True place name: ${placeName || 'unknown'}
Address: ${placeAddress || 'unlisted'}
City: ${[payload.city, payload.country].filter(Boolean).join(', ') || 'unlisted'}
Case title (not the place name): ${payload.title || 'unlisted'}
Clues already issued (do not quote these back as if they were a correct identification): ${(payload.hints || []).join(' | ') || 'none'}

Traveler's identification:
"""${guess}"""

Rules:
- match is true only if they mean this exact venue.
- Vague answers such as "the museum", "a church", "the old square", or repeating the case title are false.
- Nicknames, translations, and partial proper names are true when unmistakable.
- Do not reveal the true name in your reason if match is false. Stay in period character. No modern app language.

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
  if (url.pathname === '/api/verify-guess') return handleVerifyGuess(req, res)
  if (url.pathname === '/api/generate-quests') return handleGenerateQuests(req, res)
  return false
}

export async function handleGenerateQuests(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url || '/', 'http://localhost')
  if (url.pathname !== '/api/generate-quests') return false

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

    const selected: Array<PlaceCandidate & { category: string }> = []
    const searchResults = await Promise.all(
      interests.map(async interest => {
        const queries = queriesFor(interest, city, country, priorCases)
        const batches = await Promise.all(queries.map(query => findPlaces(query, placesKey)))
        const found: PlaceCandidate[] = []
        const seen = new Set<string>()
        for (const batch of batches) {
          for (const place of batch) {
            const key = place.name.toLowerCase()
            if (seen.has(key)) continue
            seen.add(key)
            found.push(place)
          }
        }
        return { interest, found }
      }),
    )

    for (const { interest, found } of searchResults) {
      const chosen = pickPlaces(found, interest, priorCases, counts[interest] || 1, selected)
      for (const place of chosen) selected.push({ ...place, category: interest })
    }

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

    send(res, 200, { quests })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The wire went dead.'
    send(res, 500, { error: message })
  }

  return true
}
