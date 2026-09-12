import { COUNTRIES } from '../src/data/countries'
import { majorCitiesFor, SKIP_SEED_CODES } from '../src/data/major-cities'
import { loadPlaceCards } from '../api/_lib/case-catalog'
import { mintBaseCardsForCity } from '../api/_lib/generate-quests'

const MAX_CITIES_PER_COUNTRY = 2
const MIN_CARDS = 3
const CONCURRENCY = 2

function log(message: string) {
  process.stdout.write(`${message}\n`)
}

async function mapPool<T>(items: T[], limit: number, work: (item: T) => Promise<void>) {
  const queue = items.slice()
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift()
      if (next === undefined) return
      await work(next)
    }
  })
  await Promise.all(workers)
}

async function seedCity(city: string, country: string) {
  const existing = await loadPlaceCards(city, country)
  if (existing.length >= MIN_CARDS) {
    log(`skip ${city}, ${country} (${existing.length} on file)`)
    return { city, country, saved: 0, existing: existing.length }
  }
  const result = await Promise.race([
    mintBaseCardsForCity(city, country, { min: MIN_CARDS, useGemini: false, lean: true }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('city timed out')), 90000)),
  ])
  log(`seed ${city}, ${country}: +${result.saved} (had ${result.existing})`)
  return { city, country, ...result }
}

async function main() {
  const missing = COUNTRIES.filter(country => !SKIP_SEED_CODES.has(country.code) && majorCitiesFor(country.code).length === 0)
  if (missing.length > 0) {
    log(`No major cities listed for ${missing.length} countries: ${missing.map(item => item.code).join(', ')}`)
  }

  const jobs: Array<{ city: string; country: string }> = []
  for (const country of COUNTRIES) {
    if (SKIP_SEED_CODES.has(country.code)) continue
    const cities = majorCitiesFor(country.code).slice(0, MAX_CITIES_PER_COUNTRY)
    for (const city of cities) jobs.push({ city, country: country.name })
  }

  log(`Seeding base cards for ${jobs.length} cities across ${COUNTRIES.length} countries`)
  let saved = 0
  let skipped = 0
  let failed = 0
  await mapPool(jobs, CONCURRENCY, async job => {
    try {
      const result = await seedCity(job.city, job.country)
      saved += result.saved
      if (result.saved === 0) skipped += 1
    } catch (error) {
      failed += 1
      console.error(`failed ${job.city}, ${job.country}:`, error instanceof Error ? error.message : error)
    }
  })
  log(`Done. New cards: ${saved}. Cities already stocked: ${skipped}. Failures: ${failed}.`)
  if (saved === 0 && skipped === 0) {
    console.error('No cards were written. Check GOOGLE_PLACE_API_KEY and DATABASE_URL.')
    process.exit(1)
  }
}

void main()
