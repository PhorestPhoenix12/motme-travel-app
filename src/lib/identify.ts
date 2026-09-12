const STOP = new Set([
  'the', 'and', 'of', 'de', 'du', 'des', 'di', 'del', 'della', 'dei', 'la', 'le', 'les', 'el', 'los',
  'a', 'an', 'in', 'on', 'at', 'to', 'by', 'for', 'with', 'dell', 'this', 'that', 'from', 'into',
])

const PAD = new Set([
  ...STOP,
  'file', 'case', 'clerk', 'night', 'stamps', 'sealed', 'briefing', 'dossier', 'evidence', 'classified',
  'still', 'before', 'after', 'another', 'wrong', 'envelope', 'look', 'take', 'walk', 'stand', 'count',
  'note', 'order', 'keep', 'city', 'cities', 'people', 'public', 'never', 'always', 'where', 'when',
  'what', 'which', 'their', 'them', 'then', 'than', 'also', 'even', 'very', 'just', 'over', 'under',
])

const ALIAS: Record<string, string[]> = {
  st: ['saint', 'san', 'santa', 'sainte', 'santo'],
  saint: ['st', 'san', 'santa', 'sainte', 'santo'],
  san: ['st', 'saint', 'santa', 'santo'],
  santa: ['st', 'saint', 'san', 'sainte'],
  santo: ['st', 'saint', 'san'],
  marco: ['mark', 'marks', 'marcus'],
  mark: ['marco', 'marks', 'marcus'],
  marks: ['marco', 'mark'],
  basilica: ['cathedral', 'duomo', 'church', 'kirk', 'dom'],
  cathedral: ['basilica', 'duomo', 'church', 'dom'],
  duomo: ['cathedral', 'basilica', 'church'],
  church: ['basilica', 'cathedral', 'duomo', 'kirk', 'chapel', 'parish'],
  chapel: ['church', 'cappella'],
  museum: ['musee', 'museo', 'museums', 'gallery', 'galleria', 'galerie'],
  musee: ['museum', 'museo', 'gallery'],
  museo: ['museum', 'musee', 'gallery'],
  gallery: ['gallerie', 'galleries', 'galerie', 'galleria', 'museum'],
  gallerie: ['gallery', 'galleries', 'galerie', 'galleria'],
  galleries: ['gallerie', 'gallery', 'galerie'],
  galleria: ['gallery', 'museum'],
  square: ['piazza', 'plaza', 'platz', 'place', 'campo'],
  piazza: ['square', 'plaza', 'place', 'campo'],
  plaza: ['square', 'piazza', 'platz'],
  tower: ['tour', 'torre', 'campanile', 'belfry', 'spire'],
  tour: ['tower', 'torre'],
  torre: ['tower', 'tour'],
  campanile: ['tower', 'belfry', 'bell'],
  belfry: ['tower', 'campanile', 'bells'],
  palace: ['palazzo', 'palais', 'schloss', 'castle'],
  palazzo: ['palace', 'palais'],
  palais: ['palace', 'palazzo'],
  garden: ['gardens', 'park', 'giardino', 'jardin', 'gardens'],
  park: ['garden', 'gardens', 'jardin', 'giardino'],
  bridge: ['ponte', 'pont', 'span', 'crossing'],
  ponte: ['bridge', 'pont', 'span'],
  pont: ['bridge', 'ponte'],
  fountain: ['fontana', 'fontaine'],
  gate: ['porta', 'port', 'gateway', 'walls', 'wall'],
  wall: ['walls', 'gate', 'rampart'],
  cafe: ['café', 'coffee', 'caffe'],
  restaurant: ['trattoria', 'bistro', 'osteria', 'kitchen'],
  trattoria: ['restaurant', 'osteria', 'bistro'],
  bakery: ['boulangerie', 'patisserie', 'pastry', 'bread'],
  market: ['mercato', 'marche', 'bazaar', 'stall'],
  bar: ['pub', 'tavern', 'osteria'],
  library: ['biblioteca', 'archive', 'archives'],
}

const RELATED: Record<string, string[]> = {
  church: ['tower', 'spire', 'belfry', 'bells', 'bell', 'parish', 'nave', 'aisle', 'sacristan', 'duomo', 'cathedral', 'basilica', 'campanile'],
  tower: ['church', 'spire', 'belfry', 'bells', 'campanile', 'clock', 'parish'],
  bridge: ['span', 'arches', 'crossing', 'parapet', 'canal', 'river', 'shops', 'ponte'],
  square: ['piazza', 'statue', 'fountain', 'column', 'campo', 'plaza'],
  fountain: ['basins', 'statue', 'square', 'piazza', 'water'],
  gate: ['wall', 'walls', 'arch', 'siege', 'rampart', 'bastion', 'porta'],
  museum: ['gallery', 'galleria', 'palace', 'collection', 'paintings', 'antiquities'],
  cafe: ['coffee', 'pastry', 'marble', 'zinc'],
  restaurant: ['trattoria', 'kitchen', 'chalkboard', 'menu'],
  bakery: ['bread', 'oven', 'pastry', 'tarts'],
  park: ['garden', 'tree', 'lawn', 'green', 'fountain'],
  bar: ['tavern', 'pub', 'counter', 'pour'],
  bridge_extra: [],
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
  const related = RELATED[token] || []
  return [token, ...(ALIAS[token] || []), ...related]
}

function covers(haystack: string, needle: string) {
  return Boolean(needle) && haystack.includes(needle)
}

function editDistance(a: string, b: string) {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > 2) return 9
  const rows = a.length + 1
  const cols = b.length + 1
  const grid = Array.from({ length: rows }, () => new Array<number>(cols).fill(0))
  for (let i = 0; i < rows; i += 1) grid[i][0] = i
  for (let j = 0; j < cols; j += 1) grid[0][j] = j
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      grid[i][j] = Math.min(grid[i - 1][j] + 1, grid[i][j - 1] + 1, grid[i - 1][j - 1] + cost)
    }
  }
  return grid[a.length][b.length]
}

function looselyHas(haystack: string, token: string) {
  if (!token) return false
  if (covers(haystack, token)) return true
  if (token.length < 5) return false
  const allowed = token.length >= 8 ? 2 : 1
  return tokensOf(haystack).some(part => part.length >= 4 && editDistance(part, token) <= allowed)
}

function isGenericToken(token: string) {
  return PAD.has(token) || token in ALIAS || token in RELATED
}

export type CaseGuess = {
  placeName?: string
  address?: string
  title?: string
  hints?: string[]
}

export function guessMatchesPlace(guess: string, placeName?: string, address?: string) {
  return guessFitsCase(guess, { placeName, address })
}

export function guessFitsCase(guess: string, casefile: CaseGuess) {
  const g = foldIdentify(guess)
  if (g.length < 3) return false

  const placeName = casefile.placeName?.trim() || ''
  const n = foldIdentify(placeName)
  if (n) {
    if (g === n || covers(g, n) || (g.length >= 4 && covers(n, g))) return true

    const nameTokens = tokensOf(placeName)
    const distinctive = nameTokens.filter(token => token.length >= 4 && !isGenericToken(token))
    if (distinctive.some(token => expansions(token).some(alias => looselyHas(g, alias)))) return true

    const guessHits = nameTokens.filter(token => expansions(token).some(alias => looselyHas(g, alias)))
    if (guessHits.length >= 1 && (nameTokens.length === 1 || distinctive.length <= 1 || guessHits.length >= 2)) return true
    if (guessHits.length >= 1 && g.length >= 8) return true

    const typeHits = nameTokens.filter(token => isGenericToken(token) && expansions(token).some(alias => looselyHas(g, alias)))
    if (typeHits.length >= 1 && (guessHits.length >= 1 || distinctive.length === 0)) return true
  }

  if (casefile.address) {
    const streetTokens = tokensOf(casefile.address).filter(token => token.length >= 5 && !/^\d+$/.test(token) && !isGenericToken(token))
    if (streetTokens.some(token => looselyHas(g, token))) return true
  }

  const corpus = foldIdentify(
    [placeName, casefile.address || '', casefile.title || '', ...(casefile.hints || [])].join(' '),
  )
  if (corpus.length >= 8) {
    const corpusTokens = tokensOf(corpus).filter(token => token.length >= 4 && !PAD.has(token))
    const guessTokens = tokensOf(g)
    const shared = guessTokens.filter(token =>
      corpusTokens.some(other => other === token || expansions(other).includes(token) || expansions(token).includes(other) || (token.length >= 5 && editDistance(token, other) <= 1)),
    )
    if (shared.length >= 2) return true
    if (shared.some(token => token.length >= 6 && !isGenericToken(token))) return true

    for (const type of Object.keys(ALIAS)) {
      const forms = expansions(type)
      const inGuess = forms.some(form => looselyHas(g, form))
      const inCase = forms.some(form => looselyHas(corpus, form))
      if (inGuess && inCase) return true
    }
  }

  return false
}
