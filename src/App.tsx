import { useState, useRef, useEffect, useCallback } from 'react'
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth, useUser } from '@clerk/clerk-react'
import AccountPage from './AccountPage'
import AlbumPage from './AlbumPage'
import { fileToCompressedDataUrl, loadAllTripsRemote, loadTripLocal, loadTripRemote, persistTrip, type StoredQuest, type StoredTrip } from './lib/persist'

const CLERK_ENABLED = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

/* ═══════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════ */

type Interest = 'Landmarks' | 'Food' | 'Museums' | 'Nature' | 'Nightlife' | 'Architecture' | 'Shopping'
type Page = 'route' | 'cases' | 'album' | 'account'

interface Quest {
  id: string
  category: Interest
  title: string
  hints: string[]
  unlockedHints: number
  solved: boolean
  photoUrl: string | null
  note: string
  liked: boolean | null
  justUnlocked: boolean
  justSolved: boolean
}

/* ═══════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════ */

const COUNTRIES = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Czechia',
  'France', 'Germany', 'Greece', 'Hungary', 'Italy', 'Montenegro',
  'Poland', 'Romania', 'Serbia', 'Slovakia', 'Slovenia',
  'Switzerland', 'Turkey', 'United Kingdom',
]

const CITIES: Record<string, string[]> = {
  Austria: ['Vienna', 'Salzburg', 'Innsbruck', 'Graz'],
  Belgium: ['Brussels', 'Bruges', 'Ghent', 'Antwerp'],
  Bulgaria: ['Sofia', 'Plovdiv', 'Varna', 'Ruse'],
  Croatia: ['Zagreb', 'Split', 'Dubrovnik', 'Rijeka'],
  Czechia: ['Prague', 'Brno', 'Ostrava', 'Olomouc'],
  France: ['Paris', 'Lyon', 'Marseille', 'Nice', 'Bordeaux', 'Strasbourg'],
  Germany: ['Berlin', 'Munich', 'Hamburg', 'Cologne', 'Frankfurt', 'Dresden'],
  Greece: ['Athens', 'Thessaloniki', 'Heraklion', 'Rhodes'],
  Hungary: ['Budapest', 'Debrecen', 'Pécs', 'Győr'],
  Italy: ['Venice', 'Rome', 'Florence', 'Milan', 'Naples', 'Bologna'],
  Montenegro: ['Kotor', 'Podgorica', 'Budva', 'Herceg Novi'],
  Poland: ['Warsaw', 'Kraków', 'Gdańsk', 'Wrocław', 'Poznań'],
  Romania: ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Brașov', 'Sibiu'],
  Serbia: ['Belgrade', 'Novi Sad', 'Niš', 'Subotica'],
  Slovakia: ['Bratislava', 'Košice', 'Prešov', 'Žilina'],
  Slovenia: ['Ljubljana', 'Maribor', 'Bled', 'Piran'],
  Switzerland: ['Zurich', 'Geneva', 'Bern', 'Basel', 'Lucerne'],
  Turkey: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya'],
  'United Kingdom': ['London', 'Edinburgh', 'Oxford', 'Bath', 'York', 'Bristol'],
}

const INTEREST_META: { id: Interest; label: string; code: string }[] = [
  { id: 'Landmarks',    label: 'Landmarks',   code: 'I'   },
  { id: 'Food',         label: 'Culinary',    code: 'II'  },
  { id: 'Museums',      label: 'Archives',    code: 'III' },
  { id: 'Nature',       label: 'Natural',     code: 'IV'  },
  { id: 'Nightlife',    label: 'Nocturnal',   code: 'V'   },
  { id: 'Architecture', label: 'Structure',   code: 'VI'  },
  { id: 'Shopping',     label: 'Markets',     code: 'VII' },
]

const QUEST_TEMPLATES: Record<Interest, { title: string; hints: string[] }> = {
  Landmarks: {
    title: 'The Sentinel of the Old Quarter',
    hints: [
      "They say the stones here remember every secret spoken in their shadow. Seek the structure that has kept watch over this city since before the railway age — find the spire that catches the morning light before anything else does.",
      "The entrance faces east, toward the sunrise. A small plaque near the left door bears a date older than the railway. Count the steps to the threshold. The number matters.",
      "In the northeast corner, behind the third column from the entrance, there is a carved face — a detail most visitors walk past without seeing. File it as your evidence.",
    ],
  },
  Food: {
    title: "The Spice Merchant's Cache",
    hints: [
      "Every great investigation follows the aroma. Somewhere in this city, a vendor sells a regional blend unique to this place — the locals call it by a name with no direct translation. Track it down by smell before sight.",
      "The stall you seek occupies a corner position. The blend is sold only in wax-paper packets, never jars. The merchant knows you are looking before you ask.",
      "Sample the blend. Order the dish that uses it. Ask the vendor how long the recipe has been in the family. Note the answer precisely — it is the key to this case.",
    ],
  },
  Museums: {
    title: 'The Gallery of Buried Hours',
    hints: [
      "Within these halls, a single object holds a story that contradicts the official record. Your assignment: locate the second floor, third room from the east wing. Something there does not belong to its century.",
      "The object in question is not the centerpiece of its case — it is a secondary item, partially obscured by a larger artifact. Look to the lower shelf, toward the rear.",
      "Read the entire placard carefully. The date given is disputed by scholars whose names appear nowhere in this museum. That deliberate omission is the point of this case.",
    ],
  },
  Nature: {
    title: 'The Garden of Unfinished Maps',
    hints: [
      "A cartographer once wrote that this city's green spaces contain more stories than its libraries. Find the oldest living thing in the principal park — it bears a brass marker at its base, worn smooth by many palms over many years.",
      "At the hour when the light turns amber and horizontal, a particular bench near the old fountain is always empty — even in summer. Locals will not sit there. Ask one why.",
      "Photograph the tree's canopy from directly beneath it, looking upward. The pattern of the branches resembles a river delta seen from altitude. Or so the cartographer once claimed, in a letter never sent.",
    ],
  },
  Nightlife: {
    title: 'The Lantern and the Last Round',
    hints: [
      "At a certain hour — neither early evening nor true midnight, but the charged in-between — a particular establishment serves the drink that has been this city's quiet comfort since before the last war. Find it before last call.",
      "The sign above the door is painted, not illuminated. The door handle is brass, worn smooth on the right side from a century of hands. Inside, the bar runs along the left wall.",
      "Order the house specialty. The barman will not write it on a menu for you. Ask directly. It has no translation. This is entirely by design. Note what it tastes like in your own words.",
    ],
  },
  Architecture: {
    title: 'The Facade with Two Centuries',
    hints: [
      "Somewhere in the old quarter, a building presents one architectural period to the street and conceals an entirely different era in its inner courtyard. From outside, unremarkable. From within, extraordinary.",
      "The building does not appear on tourist maps. Find it through an archway — the street entrance is a plain wooden door between two shops. The courtyard holds a small fountain, now permanently dry.",
      "Photograph the dry fountain and the carved lintel above the inner door. The two dates carved there span three centuries. Both are correct. The contradiction between them is this investigation's resolution.",
    ],
  },
  Shopping: {
    title: 'The Market of Last Objects',
    hints: [
      "In every city there is a market where the past surfaces briefly before disappearing again. The object you seek is not valuable by price — only by story. Find something bearing a monogram, a date, or a dedication from another life.",
      "The market operates on weekend mornings only. The vendor with the most interesting objects arrives last and sets up near the corner with the loudest crowd — but is themselves very quiet.",
      "Handle at least three objects and ask each vendor one question: where did this come from? Record the most honest answer. Purchase only what speaks directly to you. Restraint is evidence of discipline.",
    ],
  },
}

function buildQuests(interests: Interest[]): Quest[] {
  return interests.map((interest, i) => ({
    id: `q${i}`,
    category: interest,
    title: QUEST_TEMPLATES[interest].title,
    hints: QUEST_TEMPLATES[interest].hints,
    unlockedHints: 1,
    solved: false,
    photoUrl: null,
    note: '',
    liked: null,
    justUnlocked: false,
    justSolved: false,
  }))
}

/* ═══════════════════════════════════════════════════════════
   ICONS
═══════════════════════════════════════════════════════════ */

function CategoryIcon({ cat, size = 16 }: { cat: Interest; size?: number }) {
  const s = size
  const paths: Record<Interest, string> = {
    Landmarks:    "M12 2L3 7v2h18V7L12 2zm-2 4V4h4v2h-4zM5 10v8H3v2h18v-2h-2v-8H5zm2 0h3v8H7v-8zm5 0h3v8h-3v-8zm5 0h2v8h-2v-8z",
    Food:         "M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z",
    Museums:      "M12 3L1 9v2h22V9L12 3zM4 12v7H2v2h20v-2h-2v-7H4zm2 0h2v7H6v-7zm5 0h2v7h-2v-7zm5 0h2v7h-2v-7z",
    Nature:       "M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 5.5-8 9H11.5C12 8 17 8 17 8z",
    Nightlife:    "M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z",
    Architecture: "M3 21v-2h2V3h14v16h2v2H3zm4-2h10V5H7v14zm2-2v-2h2v2H9zm4 0v-2h2v2h-2zm-4-4v-2h2v2H9zm4 0v-2h2v2h-2zm-4-4V7h2v2H9zm4 0V7h2v2h-2z",
    Shopping:     "M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm0 10c-1.66 0-3-1.34-3-3h2c0 .55.45 1 1 1s1-.45 1-1h2c0 1.66-1.34 3-3 3z",
  }
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={paths[cat]} />
    </svg>
  )
}

function TrainIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zm0 2c3.51 0 5.5.46 6 1.12V10H6V5.12C6.5 4.46 8.49 4 12 4zM6 12h5v2H6v-2zm7 0h5v2h-5v-2zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
    </svg>
  )
}

function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
    </svg>
  )
}

function CameraIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 15.2c1.77 0 3.2-1.43 3.2-3.2S13.77 8.8 12 8.8 8.8 10.23 8.8 12s1.43 3.2 3.2 3.2zm0 1.8a5 5 0 1 1 0-10 5 5 0 0 1 0 10zM20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
    </svg>
  )
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
  )
}

function KeyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════
   SHARED COMPONENTS
═══════════════════════════════════════════════════════════ */

function NavBar({
  page,
  city,
  country,
  questsTotal,
  questsSolved,
  onNavigate,
}: {
  page: Page
  city: string
  country: string
  questsTotal: number
  questsSolved: number
  onNavigate: (p: Page) => void
}) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8"
      style={{ background: 'rgba(11,13,28,0.96)', borderBottom: '1px solid rgba(160,126,20,0.22)', height: 56 }}
    >
      <div
        className="font-display flex items-center gap-2 cursor-pointer select-none"
        style={{ color: 'var(--gold-light)', letterSpacing: '0.06em' }}
        onClick={() => onNavigate('route')}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onNavigate('route')}
        aria-label="MotME Home"
      >
        <span style={{ fontSize: 11, color: 'var(--gold-dim)', fontFamily: 'Courier Prime, monospace', letterSpacing: '0.14em' }}>✦</span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>MotME</span>
        <span style={{ fontSize: 11, color: 'var(--gold-dim)', fontFamily: 'Courier Prime, monospace', letterSpacing: '0.14em' }}>✦</span>
      </div>

      {page !== 'route' && city && (
        <div className="hidden sm:flex items-center gap-1" style={{ color: 'rgba(200,180,140,0.55)', fontFamily: 'Courier Prime, monospace', fontSize: 11, letterSpacing: '0.1em' }}>
          {city.toUpperCase()} · {country.toUpperCase()}
        </div>
      )}

      <div className="flex items-center gap-1">
        {page !== 'route' && (
          <>
            <NavTab active={page === 'cases'} onClick={() => onNavigate('cases')}>Case Files</NavTab>
            <NavTab active={page === 'album'} onClick={() => onNavigate('album')}>Album</NavTab>
          </>
        )}
        {page !== 'route' && questsTotal > 0 && (
          <div
            className="mx-1 font-type px-2 py-0.5 rounded-sm"
            style={{ background: 'rgba(124,27,44,0.25)', color: 'var(--burgundy-light)', border: '1px solid rgba(124,27,44,0.4)', fontSize: 10 }}
          >
            {questsSolved}/{questsTotal}
          </div>
        )}
        <NavTab active={page === 'account'} onClick={() => onNavigate('account')}>Account</NavTab>
        {CLERK_ENABLED && <ClerkAuthControls />}
      </div>
    </nav>
  )
}

function AuthTextButton({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-type px-3 py-1 text-xs"
      style={{
        letterSpacing: '0.08em',
        color: 'rgba(200,180,140,0.7)',
        fontSize: 10,
        cursor: 'pointer',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  )
}

function ClerkAuthControls() {
  return (
    <div className="flex items-center gap-1 ml-1">
      <SignedOut>
        <SignInButton mode="modal">
          <button type="button" style={{ background: 'none', border: 'none', padding: 0 }}>
            <AuthTextButton>Sign In</AuthTextButton>
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="font-type px-3 py-1 text-xs"
            style={{
              letterSpacing: '0.08em',
              color: 'var(--navy)',
              background: 'var(--gold-light)',
              border: 'none',
              fontSize: 10,
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            Sign Up
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: { width: 28, height: 28 },
            },
          }}
        />
      </SignedIn>
    </div>
  )
}

function NavTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="font-type px-3 py-1 text-xs transition-all"
      style={{
        letterSpacing: '0.08em',
        color: active ? 'var(--gold-light)' : 'rgba(200,180,140,0.45)',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: active ? '1px solid var(--gold-light)' : '1px solid transparent',
        fontSize: 10,
        background: 'none',
        cursor: 'pointer',
      }}
    >
      {String(children).toUpperCase()}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════
   PAGE 1 — CHOOSE YOUR ROUTE
═══════════════════════════════════════════════════════════ */

function RoutePage({ onBegin }: { onBegin: (country: string, city: string, interests: Interest[]) => void }) {
  const [country, setCountry] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [countryOpen, setCountryOpen] = useState(false)
  const [city, setCity] = useState('')
  const [cityConfirmed, setCityConfirmed] = useState(false)
  const [citySuggestionsVisible, setCitySuggestionsVisible] = useState(false)
  const [interests, setInterests] = useState<Set<Interest>>(new Set())
  const countryRef = useRef<HTMLDivElement>(null)
  const cityRef = useRef<HTMLInputElement>(null)

  const filteredCountries = COUNTRIES.filter(c =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  )
  const citySuggestions = country ? (CITIES[country] || []).filter(c =>
    c.toLowerCase().includes(city.toLowerCase())
  ) : []

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectCountry = (c: string) => {
    setCountry(c)
    setCountrySearch(c)
    setCountryOpen(false)
    setCity('')
    setCityConfirmed(false)
    setTimeout(() => cityRef.current?.focus(), 80)
  }

  const confirmCity = (c: string) => {
    setCity(c)
    setCityConfirmed(true)
    setCitySuggestionsVisible(false)
  }

  const toggleInterest = (id: Interest) => {
    setInterests(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const canProceed = country && cityConfirmed && city.trim().length > 1 && interests.size > 0

  return (
    <div
      className="min-h-screen relative overflow-hidden page-enter"
      style={{ background: 'var(--navy)', paddingTop: 56 }}
    >
      {/* Hero image backdrop */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <img
          src="https://images.unsplash.com/photo-1770107830481-1dd16d511ac2?w=1600&h=900&fit=crop&auto=format"
          alt=""
          className="w-full h-full object-cover"
          style={{ opacity: 0.13, filter: 'sepia(60%) saturate(60%)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(11,13,28,0.5) 0%, rgba(11,13,28,0.85) 50%, var(--navy) 100%)' }} />
      </div>

      {/* Decorative rule */}
      <div className="relative z-10 flex items-center justify-center pt-10 pb-2" aria-hidden="true">
        <div className="flex items-center gap-3" style={{ color: 'var(--gold-dim)' }}>
          <div style={{ width: 60, height: 1, background: 'var(--gold-dim)' }} />
          <span className="font-type" style={{ fontSize: 10, letterSpacing: '0.22em' }}>MIDNIGHT EXPRESS DETECTIVE AGENCY</span>
          <div style={{ width: 60, height: 1, background: 'var(--gold-dim)' }} />
        </div>
      </div>

      {/* Hero headline */}
      <div className="relative z-10 text-center px-6 pt-8 pb-10">
        <p className="font-type mb-3" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'var(--gold)', textTransform: 'uppercase' }}>
          Case File No. {new Date().getFullYear().toString().slice(-3)}
        </p>
        <h1 className="font-display" style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 700, color: 'var(--cream)', lineHeight: 1.1, maxWidth: 720, margin: '0 auto' }}>
          All cities have<br />
          <em style={{ color: 'var(--gold-light)', fontStyle: 'italic' }}>secrets worth pursuing.</em>
        </h1>
        <p className="font-body mt-5" style={{ fontSize: 18, color: 'rgba(220,200,160,0.72)', maxWidth: 520, margin: '1.2rem auto 0', lineHeight: 1.6 }}>
          Board the Midnight Express. Choose your destination and your field of inquiry.
          What you uncover is yours alone to record.
        </p>
      </div>

      {/* Form area */}
      <div className="relative z-10 max-w-xl mx-auto px-6 pb-20 space-y-8">

        {/* Country selector */}
        <div>
          <label className="font-type block mb-2" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
            Theatre of Operations
          </label>
          <div ref={countryRef} className="relative">
            <input
              type="text"
              value={countrySearch}
              onChange={e => { setCountrySearch(e.target.value); setCountryOpen(true) }}
              onFocus={() => setCountryOpen(true)}
              placeholder="Search a country…"
              autoComplete="off"
              className="w-full font-type px-4 py-3 text-sm"
              style={{
                background: 'rgba(20,22,40,0.9)',
                border: '1px solid rgba(160,126,20,0.35)',
                color: 'var(--cream)',
                letterSpacing: '0.06em',
                outline: 'none',
              }}
              onKeyDown={e => {
                if (e.key === 'Escape') setCountryOpen(false)
                if (e.key === 'Enter' && filteredCountries.length === 1) selectCountry(filteredCountries[0])
              }}
            />
            <div
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gold-dim)', pointerEvents: 'none', fontSize: 10 }}
              aria-hidden="true"
            >
              ▼
            </div>
            {countryOpen && filteredCountries.length > 0 && (
              <ul
                className="departure-board absolute left-0 right-0 z-20 max-h-52 overflow-y-auto"
                style={{ top: '100%', marginTop: 2 }}
                role="listbox"
                aria-label="Country options"
              >
                {filteredCountries.map(c => (
                  <li
                    key={c}
                    className="departure-row px-4 py-2 cursor-pointer font-type text-sm"
                    style={{ color: c === country ? 'var(--gold-light)' : 'rgba(200,185,145,0.85)', letterSpacing: '0.06em' }}
                    onClick={() => selectCountry(c)}
                    role="option"
                    aria-selected={c === country}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && selectCountry(c)}
                  >
                    {c === country && <span style={{ marginRight: 8, color: 'var(--gold)' }}>→</span>}
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* City input — departure board style */}
        {country && (
          <div className="page-enter">
            <label className="font-type block mb-2" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
              Destination
            </label>
            <div className="relative">
              <input
                ref={cityRef}
                type="text"
                value={city}
                onChange={e => {
                  setCity(e.target.value)
                  setCityConfirmed(false)
                  setCitySuggestionsVisible(true)
                }}
                onFocus={() => setCitySuggestionsVisible(true)}
                placeholder="Enter city or town…"
                autoComplete="off"
                className="w-full font-type px-4 py-3 text-sm"
                style={{
                  background: 'rgba(20,22,40,0.9)',
                  border: '1px solid rgba(160,126,20,0.35)',
                  color: 'var(--cream)',
                  letterSpacing: '0.06em',
                  outline: 'none',
                }}
                onKeyDown={e => {
                  if (e.key === 'Escape') setCitySuggestionsVisible(false)
                  if (e.key === 'Enter' && city.trim().length > 1) {
                    const match = citySuggestions.length === 1 ? citySuggestions[0] : city.trim()
                    confirmCity(match)
                  }
                }}
              />
              {citySuggestionsVisible && citySuggestions.length > 0 && city.length > 0 && (
                <ul
                  className="departure-board absolute left-0 right-0 z-20"
                  style={{ top: '100%', marginTop: 2 }}
                  role="listbox"
                  aria-label="City suggestions"
                >
                  <div className="px-3 pt-2 pb-1" style={{ borderBottom: '1px solid rgba(160,126,20,0.15)' }}>
                    <span className="font-type" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
                      ── Departures from {country} ──
                    </span>
                  </div>
                  {citySuggestions.map(c => (
                    <li
                      key={c}
                      className="departure-row px-4 py-2.5 cursor-pointer font-type text-sm flex items-center justify-between"
                      style={{ color: 'rgba(200,185,145,0.85)', letterSpacing: '0.08em' }}
                      onClick={() => confirmCity(c)}
                      role="option"
                      aria-selected={false}
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && confirmCity(c)}
                    >
                      <span>{c}</span>
                      <span style={{ fontSize: 9, color: 'var(--gold-dim)' }}>BOARD →</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Interest seals */}
        {country && cityConfirmed && city.trim().length > 1 && (
          <div className="page-enter">
            <label className="font-type block mb-4" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
              Case Specialties — select your fields of inquiry
            </label>
            <div className="flex flex-wrap gap-4 justify-start">
              {INTEREST_META.map(({ id, label, code }) => {
                const active = interests.has(id)
                return (
                  <button
                    key={id}
                    onClick={() => toggleInterest(id)}
                    className="wax-seal flex-col gap-1 transition-all"
                    aria-pressed={active}
                    style={{
                      width: 76,
                      height: 76,
                      background: active ? 'var(--burgundy)' : 'rgba(20,14,8,0.7)',
                      border: `2px solid ${active ? 'var(--burgundy-light)' : 'rgba(160,126,20,0.3)'}`,
                      color: active ? '#f0ddc8' : 'rgba(180,155,110,0.6)',
                      cursor: 'pointer',
                      transform: active ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.18s ease',
                      boxShadow: active ? '0 0 18px rgba(124,27,44,0.5)' : 'none',
                    }}
                  >
                    <CategoryIcon cat={id} size={18} />
                    <span className="font-type" style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>{label}</span>
                    <span style={{ fontSize: 8, color: active ? 'rgba(240,220,200,0.5)' : 'rgba(140,110,60,0.35)', fontFamily: 'Courier Prime, monospace' }}>{code}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        {canProceed && (
          <div className="flex justify-center pt-2 page-enter">
            <button
              onClick={() => onBegin(country, city, Array.from(interests))}
              className="ticket-btn font-type px-10 py-4 text-sm transition-all hover:brightness-110 active:scale-95"
              style={{
                background: 'var(--burgundy)',
                color: 'var(--cream)',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                boxShadow: '0 0 30px rgba(124,27,44,0.4)',
              }}
            >
              Begin the Investigation
            </button>
          </div>
        )}
      </div>

      {/* Bottom decorative rule */}
      <div className="relative z-10 flex items-center justify-center pb-8" aria-hidden="true">
        <div style={{ width: 180, height: 1, background: 'linear-gradient(to right, transparent, var(--gold-dim), transparent)' }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PAGE 2 — THE CASE FILES
═══════════════════════════════════════════════════════════ */

function CasesPage({
  quests,
  city,
  country,
  keys,
  onUpdateQuest,
  onEarnKeys,
  onSpendKey,
}: {
  quests: Quest[]
  city: string
  country: string
  keys: number
  onUpdateQuest: (id: string, update: Partial<Quest>) => void
  onEarnKeys: (n: number) => void
  onSpendKey: (questId: string) => void
}) {
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [modalPhoto, setModalPhoto] = useState<string | null>(null)
  const [modalNote, setModalNote] = useState('')
  const [modalLiked, setModalLiked] = useState<boolean | null>(null)
  const [telegram, setTelegram] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const solvedCount = quests.filter(q => q.solved).length

  const openModal = (q: Quest) => {
    setActiveModal(q.id)
    setModalPhoto(q.photoUrl)
    setModalNote(q.note)
    setModalLiked(q.liked)
  }

  const closeModal = () => {
    setActiveModal(null)
    setModalPhoto(null)
    setModalNote('')
    setModalLiked(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSealCase = () => {
    if (!activeModal) return
    const q = quests.find(q => q.id === activeModal)
    if (!q) return

    onUpdateQuest(activeModal, {
      solved: true,
      photoUrl: modalPhoto,
      note: modalNote,
      liked: modalLiked,
      justSolved: true,
    })

    // Award 2 keys for solving with a photo
    const keysEarned = modalPhoto ? 2 : 0
    if (keysEarned > 0) onEarnKeys(keysEarned)

    const msg = keysEarned > 0
      ? `Case sealed. 2 keys recovered — spend them to unlock classified leads on any open file.`
      : 'Case sealed. Your evidence is on record.'
    setTelegram(msg)
    setTimeout(() => setTelegram(null), 4200)
    closeModal()

    // Clear justSolved after stamp animation
    setTimeout(() => onUpdateQuest(activeModal, { justSolved: false }), 1200)
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setModalPhoto(await fileToCompressedDataUrl(file))
  }

  const activeQuest = quests.find(q => q.id === activeModal)

  return (
    <div
      className="min-h-screen page-enter"
      style={{ background: 'var(--navy)', paddingTop: 56 }}
    >
      {/* Telegram notification */}
      {telegram && (
        <div
          className="telegram-animate fixed top-14 left-1/2 z-50 max-w-sm w-full"
          style={{ transform: 'translateX(-50%)' }}
          role="status"
          aria-live="polite"
        >
          <div
            className="mx-4 font-type text-xs p-3 flex items-start gap-3"
            style={{
              background: 'var(--navy-panel)',
              border: '1px solid var(--gold)',
              color: 'var(--cream)',
              letterSpacing: '0.06em',
              boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            }}
          >
            <span style={{ color: 'var(--gold)', fontSize: 14, flexShrink: 0 }}>✦</span>
            <span className="font-body" style={{ fontSize: 13, lineHeight: 1.5, fontStyle: 'italic' }}>{telegram}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-6 sm:px-10 pt-8 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1" aria-hidden="true">
              <div style={{ width: 24, height: 1, background: 'var(--gold-dim)' }} />
              <span className="font-type" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>Open Case Files</span>
            </div>
            <h2 className="font-display" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.4rem)', color: 'var(--cream)', fontWeight: 700 }}>
              {city}, <em style={{ color: 'var(--gold-light)', fontWeight: 400 }}>{country}</em>
            </h2>
          </div>

          {/* Key counter */}
          <div
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 mt-1"
            style={{
              background: keys > 0 ? 'rgba(160,126,20,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${keys > 0 ? 'rgba(160,126,20,0.45)' : 'rgba(255,255,255,0.08)'}`,
            }}
            aria-label={`${keys} keys available`}
          >
            <span style={{ color: keys > 0 ? 'var(--gold-light)' : 'rgba(160,140,100,0.35)' }}>
              <KeyIcon size={15} />
            </span>
            <span
              className="font-type"
              style={{ fontSize: 11, letterSpacing: '0.12em', color: keys > 0 ? 'var(--gold-light)' : 'rgba(160,140,100,0.35)', minWidth: 12, textAlign: 'center' }}
            >
              {keys}
            </span>
            <span className="font-type" style={{ fontSize: 9, letterSpacing: '0.1em', color: keys > 0 ? 'rgba(200,170,100,0.6)' : 'rgba(140,120,80,0.3)', textTransform: 'uppercase' }}>
              {keys === 1 ? 'key' : 'keys'}
            </span>
          </div>
        </div>

        {/* Progress train */}
        <div className="mt-5 flex items-center gap-3 max-w-md" role="progressbar" aria-valuenow={solvedCount} aria-valuemax={quests.length} aria-label={`${solvedCount} of ${quests.length} cases solved`}>
          <div className="relative flex-1 flex items-center" style={{ height: 24 }}>
            <div className="route-track w-full" aria-hidden="true" />
            <div className="absolute left-0 right-0 top-0 flex items-center justify-between">
              {quests.map((q, i) => (
                <div
                  key={q.id}
                  className="relative flex items-center justify-center"
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: q.solved ? 'var(--gold)' : 'var(--navy-mid)',
                    border: `1.5px solid ${q.solved ? 'var(--gold-light)' : 'rgba(160,126,20,0.35)'}`,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
              ))}
            </div>
            {/* Train icon */}
            <div
              className="absolute flex items-center transition-all duration-700"
              style={{
                left: `calc(${quests.length > 1 ? (solvedCount / Math.max(quests.length - 1, 1)) * 100 : 0}% - 10px)`,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--gold-light)',
                zIndex: 2,
              }}
              aria-hidden="true"
            >
              <TrainIcon size={18} />
            </div>
          </div>
          <span className="font-type" style={{ fontSize: 10, color: 'var(--gold-dim)', letterSpacing: '0.1em', flexShrink: 0 }}>
            {solvedCount} of {quests.length} closed
          </span>
        </div>
      </div>

      {/* Quest grid */}
      <div className="px-4 sm:px-8 pb-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {quests.map(q => (
          <QuestCard
            key={q.id}
            quest={q}
            keys={keys}
            onOpen={() => openModal(q)}
            onSpendKey={() => onSpendKey(q.id)}
          />
        ))}
      </div>

      {/* Evidence Modal */}
      {activeQuest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(8,9,18,0.88)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
          role="dialog"
          aria-modal="true"
          aria-label="File evidence"
        >
          <div
            className="w-full max-w-md relative page-enter"
            style={{
              background: '#1a1c2e',
              border: '1px solid rgba(160,126,20,0.35)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal header */}
            <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(160,126,20,0.18)' }}>
              <div className="font-type text-xs mb-1" style={{ letterSpacing: '0.15em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
                Evidence Filing
              </div>
              <div className="font-display text-base" style={{ color: 'var(--cream)', fontWeight: 600 }}>
                {activeQuest.title}
              </div>
            </div>

            <div className="px-6 pt-5 pb-6 space-y-5">
              {/* Photo upload */}
              <div>
                <label className="font-type block mb-2" style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
                  Field Photograph
                </label>
                <div
                  className="relative flex items-center justify-center cursor-pointer transition-all hover:brightness-110"
                  style={{
                    height: modalPhoto ? 'auto' : 120,
                    border: `1.5px dashed ${modalPhoto ? 'rgba(160,126,20,0.4)' : 'rgba(160,126,20,0.3)'}`,
                    background: 'rgba(11,13,28,0.6)',
                    overflow: 'hidden',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                  aria-label="Upload field photograph"
                >
                  {modalPhoto ? (
                    <img src={modalPhoto} alt="Evidence photograph" className="w-full object-cover" style={{ maxHeight: 200 }} />
                  ) : (
                    <div className="flex flex-col items-center gap-2" style={{ color: 'rgba(160,126,20,0.5)' }}>
                      <CameraIcon size={24} />
                      <span className="font-type text-xs" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>File the Evidence</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handlePhotoChange}
                    aria-label="Choose photograph file"
                  />
                </div>
              </div>

              {/* Field notes */}
              <div>
                <label className="font-type block mb-2" style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
                  Field Notes <span style={{ opacity: 0.5 }}>(optional)</span>
                </label>
                <textarea
                  value={modalNote}
                  onChange={e => setModalNote(e.target.value)}
                  placeholder="What did you observe? What surprised you?"
                  rows={3}
                  className="w-full font-type text-sm resize-none"
                  style={{
                    background: 'rgba(11,13,28,0.7)',
                    border: '1px solid rgba(160,126,20,0.25)',
                    color: 'var(--cream)',
                    padding: '10px 12px',
                    letterSpacing: '0.04em',
                    lineHeight: 1.6,
                    outline: 'none',
                    fontFamily: 'Courier Prime, monospace',
                    fontSize: 12,
                  }}
                />
              </div>

              {/* Verdict stamps */}
              <div>
                <label className="font-type block mb-3" style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
                  Investigator's Verdict
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setModalLiked(true)}
                    className="flex-1 py-2 font-type text-xs transition-all"
                    style={{
                      border: `1.5px solid ${modalLiked === true ? 'var(--gold-light)' : 'rgba(160,126,20,0.3)'}`,
                      background: modalLiked === true ? 'rgba(160,126,20,0.18)' : 'transparent',
                      color: modalLiked === true ? 'var(--gold-light)' : 'rgba(180,155,110,0.5)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                    aria-pressed={modalLiked === true}
                  >
                    ★ Loved It
                  </button>
                  <button
                    onClick={() => setModalLiked(false)}
                    className="flex-1 py-2 font-type text-xs transition-all"
                    style={{
                      border: `1.5px solid ${modalLiked === false ? 'rgba(120,100,80,0.7)' : 'rgba(160,126,20,0.3)'}`,
                      background: modalLiked === false ? 'rgba(60,50,40,0.3)' : 'transparent',
                      color: modalLiked === false ? 'rgba(180,165,140,0.8)' : 'rgba(180,155,110,0.5)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                    aria-pressed={modalLiked === false}
                  >
                    ○ Noted
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={closeModal}
                  className="font-type text-xs px-4 py-2.5 transition-all"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(160,126,20,0.25)',
                    color: 'rgba(180,155,110,0.6)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Stand Down
                </button>
                <button
                  onClick={handleSealCase}
                  className="ticket-btn flex-1 font-type text-xs py-2.5 px-6 transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: 'var(--burgundy)',
                    color: 'var(--cream)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(124,27,44,0.4)',
                  }}
                >
                  Seal the Case
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function QuestCard({ quest, keys, onOpen, onSpendKey }: { quest: Quest; keys: number; onOpen: () => void; onSpendKey: () => void }) {
  const meta = INTEREST_META.find(m => m.id === quest.category)!

  return (
    <div
      className="folder-card relative"
      style={{
        marginTop: 13,
      }}
    >
      {/* Folder tab */}
      <div
        className="folder-tab aged-paper"
        style={{ color: 'var(--ink-mid)', fontWeight: 700 }}
        aria-hidden="true"
      >
        <CategoryIcon cat={quest.category} size={9} />
        <span style={{ marginLeft: 4 }}>{meta.label.toUpperCase()}</span>
      </div>

      {/* Card body */}
      <div
        className="aged-paper relative overflow-hidden"
        style={{
          border: '1px solid rgba(80,55,20,0.3)',
          boxShadow: '2px 4px 18px rgba(0,0,0,0.55)',
          minHeight: 240,
        }}
      >
        {/* Solved overlay */}
        {quest.solved && (
          <div className="stamp-overlay" aria-label="Case solved">
            <div className={`stamp-ring ${quest.justSolved ? 'stamp-animate' : ''}`}>
              <div className="text-center">
                <div className="font-display font-bold" style={{ fontSize: 15, color: 'var(--seal-red)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Solved
                </div>
                <div className="font-type" style={{ fontSize: 8, color: 'var(--seal-red)', letterSpacing: '0.2em', opacity: 0.7 }}>
                  CASE CLOSED
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-5">
          {/* Category stamp */}
          <div className="flex items-center justify-between mb-3">
            <div
              className="flex items-center gap-2 font-type"
              style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-faded)', textTransform: 'uppercase' }}
            >
              <CategoryIcon cat={quest.category} size={12} />
              <span>{meta.code}</span>
            </div>
            {quest.solved && quest.photoUrl && (
              <img
                src={quest.photoUrl}
                alt="Filed evidence"
                className="polaroid"
                style={{ width: 50, height: 50, objectFit: 'cover', padding: 3, transform: 'rotate(4deg)' }}
              />
            )}
          </div>

          {/* Quest title */}
          <h3 className="font-display mb-4" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3, fontStyle: 'italic' }}>
            {quest.title}
          </h3>

          {/* Hints */}
          <div className="space-y-3">
            {quest.hints.map((hint, i) => {
              const unlocked = i < quest.unlockedHints
              const isNew = quest.justUnlocked && i === quest.unlockedHints - 1

              if (unlocked) {
                return (
                  <div key={i} className={`hint-cover revealed ${isNew ? 'new-hint p-2 -mx-1' : ''}`}>
                    <p className="font-type" style={{ fontSize: 11.5, lineHeight: 1.6, color: 'var(--ink-mid)', letterSpacing: '0.02em' }}>
                      <span style={{ color: 'var(--gold-dim)', marginRight: 4 }}>{i + 1}.</span>
                      {hint}
                    </p>
                  </div>
                )
              } else {
                return (
                  <div key={i} className="flex items-start gap-2 py-1">
                    <div style={{ color: 'var(--burgundy)', opacity: 0.7, flexShrink: 0, marginTop: 2 }}>
                      <LockIcon size={11} />
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1">
                      <div className="redacted-bar font-type" style={{ fontSize: 9, padding: '2px 0', width: '85%' }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
                      <div className="redacted-bar font-type" style={{ fontSize: 9, padding: '2px 0', width: '65%' }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
                    </div>
                    <div className="font-type" style={{ fontSize: 8, color: 'var(--burgundy)', letterSpacing: '0.1em', opacity: 0.7, flexShrink: 0, paddingTop: 2 }}>
                      CLASSIFIED
                    </div>
                  </div>
                )
              }
            })}
          </div>

          {/* Key unlock — shown once per card for the next locked hint */}
          {!quest.solved && quest.unlockedHints < quest.hints.length && (
            <button
              onClick={keys > 0 ? onSpendKey : undefined}
              disabled={keys === 0}
              className="mt-3 w-full flex items-center justify-center gap-2 font-type text-xs py-2 transition-all"
              style={{
                background: keys > 0 ? 'rgba(160,126,20,0.1)' : 'rgba(255,255,255,0.03)',
                borderTop: '1px dashed rgba(80,55,20,0.3)',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: 'none',
                color: keys > 0 ? 'var(--gold)' : 'rgba(120,100,60,0.4)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: keys > 0 ? 'pointer' : 'not-allowed',
                opacity: keys > 0 ? 1 : 0.6,
              }}
              aria-label={keys > 0 ? 'Spend a key to unlock the next classified clue' : 'No keys available'}
            >
              <KeyIcon size={12} />
              {keys > 0 ? `Use a Key — Unlock Next Clue` : `No Keys — Clue Classified`}
            </button>
          )}

          {/* Action */}
          {!quest.solved && (
            <button
              onClick={onOpen}
              className="mt-5 w-full font-type text-xs py-2.5 transition-all hover:brightness-110 active:scale-95"
              style={{
                background: 'rgba(124,27,44,0.12)',
                border: '1px solid rgba(124,27,44,0.4)',
                color: 'var(--burgundy-dark)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              I Found It — File Evidence
            </button>
          )}

          {quest.solved && quest.note && (
            <p className="font-type mt-4" style={{ fontSize: 10.5, color: 'var(--ink-faded)', fontStyle: 'italic', lineHeight: 1.6, borderTop: '1px dashed rgba(80,55,20,0.25)', paddingTop: 8 }}>
              "{quest.note}"
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════════ */

function toStoredQuests(items: Quest[]): StoredQuest[] {
  return items.map(({ justUnlocked: _u, justSolved: _s, ...quest }) => quest)
}

function fromStoredTrip(trip: StoredTrip): Quest[] {
  return trip.quests.map(quest => ({
    ...quest,
    category: quest.category as Interest,
    justUnlocked: false,
    justSolved: false,
  }))
}

export default function App() {
  if (CLERK_ENABLED) return <ClerkBackedApp />
  return <AppShell getToken={async () => null} clerkReady />
}

function ClerkBackedApp() {
  const { isLoaded } = useUser()
  const { getToken } = useAuth()
  return <AppShell getToken={getToken} clerkReady={isLoaded} />
}

function AppShell({
  getToken,
  clerkReady,
}: {
  getToken: () => Promise<string | null>
  clerkReady: boolean
}) {
  const [page, setPage] = useState<Page>('route')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [quests, setQuests] = useState<Quest[]>([])
  const [keys, setKeys] = useState(0)
  const [savedTrips, setSavedTrips] = useState<StoredTrip[]>([])
  const hydrated = useRef(false)

  const applyTrip = useCallback((trip: StoredTrip) => {
    setCountry(trip.country)
    setCity(trip.city)
    setKeys(trip.keys)
    setQuests(fromStoredTrip(trip))
    if (trip.quests.length > 0) setPage(current => (current === 'route' ? 'cases' : current))
  }, [])

  useEffect(() => {
    const local = loadTripLocal()
    if (local) applyTrip(local)
  }, [applyTrip])

  useEffect(() => {
    if (!clerkReady) return
    let cancelled = false
    ;(async () => {
      const token = await getToken()
      const [remote, trips] = await Promise.all([loadTripRemote(token), loadAllTripsRemote(token)])
      if (!cancelled && trips.length > 0) setSavedTrips(trips)
      if (!cancelled && remote) applyTrip(remote)
      if (!cancelled) hydrated.current = true
    })()
    return () => {
      cancelled = true
    }
  }, [applyTrip, clerkReady, getToken])

  useEffect(() => {
    if (!hydrated.current || !country || quests.length === 0) return
    const trip: StoredTrip = { country, city, keys, quests: toStoredQuests(quests) }
    setSavedTrips(prev => {
      const next = prev.filter(item => !(item.country === country && item.city === city))
      return [trip, ...next]
    })
    void getToken().then(token => persistTrip(token, trip))
  }, [city, country, getToken, keys, quests])

  const handleBegin = useCallback((c: string, ct: string, interests: Interest[]) => {
    const nextQuests = buildQuests(interests)
    setCountry(c)
    setCity(ct)
    setQuests(nextQuests)
    setKeys(0)
    setPage('cases')
    const trip: StoredTrip = { country: c, city: ct, keys: 0, quests: toStoredQuests(nextQuests) }
    setSavedTrips(prev => {
      const next = prev.filter(item => !(item.country === c && item.city === ct))
      return [trip, ...next]
    })
    void getToken().then(token => persistTrip(token, trip))
  }, [getToken])

  const handleUpdateQuest = useCallback((id: string, update: Partial<Quest>) => {
    setQuests(prev => prev.map(q => q.id === id ? { ...q, ...update } : q))
  }, [])

  const handleEarnKeys = useCallback((n: number) => {
    setKeys(k => k + n)
  }, [])

  const handleSpendKey = useCallback((questId: string) => {
    setKeys(k => Math.max(0, k - 1))
    setQuests(prev => prev.map(q =>
      q.id === questId && q.unlockedHints < q.hints.length
        ? { ...q, unlockedHints: q.unlockedHints + 1, justUnlocked: true }
        : q
    ))
    // Clear justUnlocked flash after animation
    setTimeout(() => {
      setQuests(prev => prev.map(q => q.id === questId ? { ...q, justUnlocked: false } : q))
    }, 2000)
  }, [])

  const navigate = useCallback((p: Page) => {
    if (p === 'route' || p === 'account' || quests.length > 0) setPage(p)
  }, [quests.length])

  const solvedCount = quests.filter(q => q.solved).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', fontFamily: 'Crimson Text, Georgia, serif' }}>
      <NavBar
        page={page}
        city={city}
        country={country}
        questsTotal={quests.length}
        questsSolved={solvedCount}
        onNavigate={navigate}
      />
      {page === 'route' && <RoutePage onBegin={handleBegin} />}
      {page === 'cases' && (
        <CasesPage
          quests={quests}
          city={city}
          country={country}
          keys={keys}
          onUpdateQuest={handleUpdateQuest}
          onEarnKeys={handleEarnKeys}
          onSpendKey={handleSpendKey}
        />
      )}
      {page === 'album' && (
        <AlbumPage
          quests={quests}
          city={city}
          country={country}
          allTrips={savedTrips}
        />
      )}
      {page === 'account' && (
        <div style={{ paddingTop: 56 }}>
          {/* Page header */}
          <div className="px-6 sm:px-10 pt-8 pb-2">
            <div className="flex items-center gap-3 mb-1" aria-hidden="true">
              <div style={{ width: 24, height: 1, background: 'var(--gold-dim)' }} />
              <span className="font-type" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
                Agent Profile
              </span>
            </div>
            <h2 className="font-display" style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', color: 'var(--cream)', fontWeight: 700 }}>
              Your <em style={{ color: 'var(--gold-light)', fontWeight: 400 }}>Dossier</em>
            </h2>
          </div>
          <AccountPage />
        </div>
      )}
    </div>
  )
}
