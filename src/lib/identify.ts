const STOP = new Set([
  'the', 'and', 'of', 'de', 'du', 'des', 'di', 'del', 'della', 'dei', 'la', 'le', 'les', 'el', 'los',
  'a', 'an', 'in', 'on', 'at', 'to', 'by', 'for', 'with', 'dell',
])

const ALIAS: Record<string, string[]> = {
  st: ['saint', 'san', 'santa', 'sainte'],
  saint: ['st', 'san', 'santa', 'sainte'],
  san: ['st', 'saint', 'santa'],
  santa: ['st', 'saint', 'san', 'sainte'],
  basilica: ['cathedral', 'duomo', 'church'],
  cathedral: ['basilica', 'duomo', 'church'],
  duomo: ['cathedral', 'basilica', 'church'],
  church: ['basilica', 'cathedral', 'duomo', 'kirk'],
  museum: ['musee', 'museo', 'museums'],
  musee: ['museum', 'museo'],
  museo: ['museum', 'musee'],
  square: ['piazza', 'plaza', 'platz', 'place'],
  piazza: ['square', 'plaza', 'place'],
  plaza: ['square', 'piazza', 'platz'],
  tower: ['tour', 'torre'],
  tour: ['tower', 'torre'],
  palace: ['palazzo', 'palais', 'schloss'],
  palazzo: ['palace', 'palais'],
  palais: ['palace', 'palazzo'],
  garden: ['gardens', 'park', 'giardino', 'jardin'],
  park: ['garden', 'gardens', 'jardin'],
  bridge: ['ponte', 'pont'],
  ponte: ['bridge', 'pont'],
  gallerie: ['gallery', 'galleries', 'galerie'],
  gallery: ['gallerie', 'galleries', 'galerie'],
  galleries: ['gallerie', 'gallery', 'galerie'],
  accademia: ['academy', 'academie'],
}

export function foldIdentify(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[''`’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokensOf(value: string) {
  return foldIdentify(value)
    .split(' ')
    .filter(token => token.length > 2 && !STOP.has(token))
}

function expansions(token: string) {
  return [token, ...(ALIAS[token] || [])]
}

function covers(haystack: string, needle: string) {
  return haystack.includes(needle)
}

export function guessMatchesPlace(guess: string, placeName?: string, address?: string) {
  const g = foldIdentify(guess)
  if (g.length < 3) return false
  if (!placeName?.trim()) return false

  const n = foldIdentify(placeName)
  if (!n) return false
  if (g === n || covers(g, n) || (g.length >= 5 && covers(n, g))) return true

  const nameTokens = tokensOf(placeName)
  const guessHits = nameTokens.filter(token => expansions(token).some(alias => covers(g, alias)))
  if (nameTokens.length >= 2 && guessHits.length >= Math.min(2, nameTokens.length)) return true
  if (nameTokens.length === 1 && guessHits.length === 1 && nameTokens[0].length >= 5) return true

  if (address) {
    const streetTokens = tokensOf(address).filter(token => token.length >= 5 && !/^\d+$/.test(token))
    const streetHits = streetTokens.filter(token => covers(g, token))
    if (streetHits.length >= 1 && guessHits.length >= 1) return true
  }

  return false
}
