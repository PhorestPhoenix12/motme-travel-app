import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useUser, useClerk, useAuth, SignIn, SignUp } from '@clerk/clerk-react'
import { loadProfileRemote, saveProfileRemote } from './lib/persist'
import { createCitySession, resolveCity, suggestCities, type CitySuggestion } from './lib/destinations'

/* ─── Interest taxonomy ─────────────────────────────────────────── */

export interface InterestCategory {
  id: string
  label: string
  description: string
  subs: { id: string; label: string }[]
}

export const INTEREST_TAXONOMY: InterestCategory[] = [
  {
    id: 'history',
    label: 'History & Learning',
    description: 'The forces and ideas that shaped every place',
    subs: [
      { id: 'art',        label: 'Art & Aesthetics' },
      { id: 'war',        label: 'War & Military' },
      { id: 'science',    label: 'Science & Technology' },
      { id: 'philosophy', label: 'Philosophy & Thought' },
      { id: 'religion',   label: 'Religion & Spirituality' },
      { id: 'ancient',    label: 'Ancient Civilizations' },
    ],
  },
  {
    id: 'food',
    label: 'Culinary',
    description: 'What a city tastes like, honestly',
    subs: [
      { id: 'local',       label: 'Local & Regional' },
      { id: 'traditional', label: 'Traditional & Heritage' },
      { id: 'street',      label: 'Street Food' },
      { id: 'fine-dining', label: 'Fine Dining' },
      { id: 'markets',     label: 'Markets & Bazaars' },
      { id: 'drinks',      label: 'Wine, Beer & Spirits' },
    ],
  },
  {
    id: 'shops',
    label: 'Shopping',
    description: 'Commerce as a window into culture',
    subs: [
      { id: 'street-style', label: 'Street Style & Vintage' },
      { id: 'luxury',       label: 'High-End & Luxury' },
      { id: 'artisan',      label: 'Artisan & Craft' },
      { id: 'antiques',     label: 'Antiques & Curiosities' },
      { id: 'books',        label: 'Books, Maps & Paper' },
      { id: 'local-brands', label: 'Local & Independent' },
    ],
  },
  {
    id: 'nature',
    label: 'Nature & Outdoors',
    description: 'The living world that persists beneath the city',
    subs: [
      { id: 'parks',     label: 'Parks & Gardens' },
      { id: 'wildlife',  label: 'Wildlife & Ecology' },
      { id: 'mountains', label: 'Mountains & Hiking' },
      { id: 'water',     label: 'Rivers, Coast & Water' },
      { id: 'botanical', label: 'Botanical & Floral' },
    ],
  },
  {
    id: 'culture',
    label: 'Arts & Culture',
    description: 'What a city performs and displays of itself',
    subs: [
      { id: 'museums',      label: 'Museums & Archives' },
      { id: 'galleries',    label: 'Galleries & Exhibitions' },
      { id: 'theatre',      label: 'Theatre & Opera' },
      { id: 'music',        label: 'Music & Nightlife' },
      { id: 'architecture', label: 'Architecture & Design' },
      { id: 'cinema',       label: 'Film & Photography' },
    ],
  },
  {
    id: 'hidden',
    label: 'Hidden Depths',
    description: 'What most visitors never find',
    subs: [
      { id: 'offbeat',       label: 'Off the Beaten Path' },
      { id: 'neighborhoods', label: 'Local Neighbourhoods' },
      { id: 'underground',   label: 'Underground Culture' },
      { id: 'night-markets', label: 'Night Markets' },
      { id: 'secret-spots',  label: 'Unmarked & Secret Spots' },
    ],
  },
]

/* ─── Profile data shape ─────────────────────────────────────────── */

export interface ProfileData {
  firstName: string
  lastName: string
  email: string
  phone: string
  visitedCities: string[]
  interests: Record<string, string[]>
}

const EMPTY_PROFILE: ProfileData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  visitedCities: [],
  interests: {},
}

/* ─── localStorage helpers ──────────────────────────────────────── */

const LS_KEY = 'motme_profile'

function loadLocal(): ProfileData {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? { ...EMPTY_PROFILE, ...JSON.parse(raw) } : EMPTY_PROFILE
  } catch {
    return EMPTY_PROFILE
  }
}

function saveLocal(data: ProfileData) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

/* ─── Shared UI primitives ──────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div style={{ width: 16, height: 1, background: 'var(--gold-dim)' }} aria-hidden="true" />
      <span className="font-type" style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(160,126,20,0.12)' }} aria-hidden="true" />
    </div>
  )
}

function Field({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="font-type block mb-1.5"
        style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

const baseInput = (focused: boolean): React.CSSProperties => ({
  width: '100%',
  background: 'rgba(11,13,28,0.7)',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: focused ? 'rgba(160,126,20,0.6)' : 'rgba(160,126,20,0.25)',
  color: 'var(--cream)',
  padding: '10px 13px',
  fontFamily: 'Courier Prime, monospace',
  fontSize: 13,
  letterSpacing: '0.04em',
  outline: 'none',
})

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      style={{ ...baseInput(focused), ...props.style }}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

/* ─── City tag input ────────────────────────────────────────────── */

function CityTagInput({ cities, onChange }: { cities: string[]; onChange: (c: string[]) => void }) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const session = useRef(createCitySession())
  const ticket = useRef(0)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const query = input.trim()
    if (query.length < 2) {
      setSuggestions([])
      setBusy(false)
      return
    }
    const controller = new AbortController()
    const handle = window.setTimeout(async () => {
      const id = ++ticket.current
      setBusy(true)
      try {
        const next = await suggestCities({
          query,
          sessionToken: session.current.token,
          signal: controller.signal,
        })
        if (id !== ticket.current) return
        setSuggestions(next)
        setOpen(true)
      } catch {
        if (!controller.signal.aborted && id === ticket.current) setSuggestions([])
      } finally {
        if (id === ticket.current) setBusy(false)
      }
    }, 280)
    return () => {
      controller.abort()
      window.clearTimeout(handle)
    }
  }, [input])

  const addLabel = (label: string) => {
    const t = label.trim()
    if (!t) return
    if (!cities.map(c => c.toLowerCase()).includes(t.toLowerCase())) onChange([...cities, t])
    setInput('')
    setSuggestions([])
    setOpen(false)
    session.current = createCitySession()
  }

  const boardSuggestion = async (suggestion?: CitySuggestion) => {
    const typed = (suggestion?.city || input).trim()
    if (typed.length < 2) return
    setBusy(true)
    const result = await resolveCity({
      query: typed,
      placeId: suggestion?.placeId,
      sessionToken: session.current.token,
    })
    setBusy(false)
    if ('destination' in result) {
      addLabel(`${result.destination.city}, ${result.destination.country}`)
      return
    }
  }

  const removeCity = (city: string) => onChange(cities.filter(c => c !== city))

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const match = suggestions.length === 1
        ? suggestions[0]
        : suggestions.find(item => item.city.toLowerCase() === input.trim().toLowerCase())
      void boardSuggestion(match)
    }
    if (e.key === 'Backspace' && !input && cities.length > 0) removeCity(cities[cities.length - 1])
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative">
      <div
        className="flex flex-wrap gap-2 items-center p-2 cursor-text"
        style={{ border: '1px solid rgba(160,126,20,0.25)', background: 'rgba(11,13,28,0.7)', minHeight: 50 }}
        onClick={() => inputRef.current?.focus()}
      >
        {cities.map(city => (
          <span
            key={city}
            className="flex items-center gap-1.5 font-type"
            style={{
              fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '4px 8px 4px 10px',
              background: 'rgba(124,27,44,0.22)',
              border: '1px solid rgba(124,27,44,0.45)',
              color: 'var(--cream)',
            }}
          >
            {city}
            <button
              onClick={e => { e.stopPropagation(); removeCity(city) }}
              aria-label={`Remove ${city}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(200,160,130,0.65)', fontSize: 14, lineHeight: 1, padding: 0 }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true) }}
          onKeyDown={handleKey}
          onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
          placeholder={cities.length === 0 ? 'Type a recognized city…' : 'Add another…'}
          className="font-type"
          style={{ flex: '1 1 140px', background: 'none', border: 'none', outline: 'none', color: 'var(--cream)', fontSize: 12, letterSpacing: '0.04em', padding: '4px' }}
          aria-label="Add a visited city"
        />
      </div>
      {open && (suggestions.length > 0 || busy) && input.trim().length > 1 && (
        <ul
          className="departure-board absolute left-0 right-0 z-20"
          style={{ top: '100%', marginTop: 2 }}
          role="listbox"
          aria-label="Recognized cities"
        >
          {suggestions.map(item => (
            <li
              key={item.placeId}
              className="departure-row px-4 py-2 cursor-pointer font-type text-sm"
              style={{ color: 'rgba(200,185,145,0.85)', letterSpacing: '0.06em' }}
              onMouseDown={e => e.preventDefault()}
              onClick={() => void boardSuggestion(item)}
              role="option"
              aria-selected={false}
            >
              {item.city}
              {item.secondary && (
                <span style={{ display: 'block', fontSize: 9, color: 'rgba(160,140,100,0.55)' }}>{item.secondary}</span>
              )}
            </li>
          ))}
          {busy && (
            <li className="px-4 py-2 font-type" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--gold-dim)' }}>
              Checking the gazetteer…
            </li>
          )}
          <div className="px-3 py-1.5 flex justify-end" style={{ borderTop: '1px solid rgba(160,126,20,0.12)' }}>
            <span className="font-type" style={{ fontSize: 8, letterSpacing: '0.16em', color: 'rgba(160,140,100,0.45)', textTransform: 'uppercase' }}>
              Powered by Google
            </span>
          </div>
        </ul>
      )}
    </div>
  )
}

/* ─── Interest category panel ───────────────────────────────────── */

function InterestCategoryPanel({
  category, selected, onToggle,
}: { category: InterestCategory; selected: string[]; onToggle: (subId: string) => void }) {
  const [open, setOpen] = useState(true)
  const count = selected.length

  return (
    <div className="folder-card" style={{ marginTop: 12 }}>
      <div className="folder-tab aged-paper" style={{ color: 'var(--ink-mid)', fontWeight: 700 }} aria-hidden="true">
        {category.label.toUpperCase()}
        {count > 0 && <span style={{ marginLeft: 6, color: 'var(--burgundy-dark)' }}>[{count}]</span>}
      </div>
      <div className="aged-paper" style={{ border: '1px solid rgba(80,55,20,0.28)', boxShadow: '1px 2px 10px rgba(0,0,0,0.4)' }}>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          style={{
            background: 'none',
            borderTop: 'none', borderLeft: 'none', borderRight: 'none',
            borderBottom: open ? '1px dashed rgba(80,55,20,0.18)' : '1px solid transparent',
            cursor: 'pointer',
          }}
        >
          <div className="text-left">
            <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontStyle: 'italic' }}>
              {category.label}
            </div>
            <div className="font-type mt-0.5" style={{ fontSize: 10, color: 'var(--ink-faded)', letterSpacing: '0.04em' }}>
              {category.description}
            </div>
          </div>
          <span style={{ color: 'var(--ink-faded)', fontSize: 10, marginLeft: 12, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div className="px-5 py-4 flex flex-wrap gap-2">
            {category.subs.map(sub => {
              const active = selected.includes(sub.id)
              return (
                <button
                  key={sub.id}
                  onClick={() => onToggle(sub.id)}
                  aria-pressed={active}
                  className="font-type transition-all"
                  style={{
                    fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '5px 12px',
                    background: active ? 'var(--burgundy-dark)' : 'rgba(20,14,8,0.08)',
                    border: `1px solid ${active ? 'var(--burgundy-light)' : 'rgba(80,55,20,0.3)'}`,
                    color: active ? '#f0ddc8' : 'var(--ink-faded)',
                    cursor: 'pointer',
                    transform: active ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  {active && <span style={{ marginRight: 5 }}>✓</span>}
                  {sub.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Save status banner ─────────────────────────────────────────── */

function SaveBanner({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle') return null
  const msgs = { saving: 'Filing the dossier…', saved: 'Dossier updated. Your record is current.', error: 'The telegraph line failed. Try again.' }
  const col = status === 'error' ? 'var(--seal-red)' : status === 'saved' ? 'var(--gold-light)' : 'rgba(200,185,145,0.7)'
  return (
    <div className="font-type text-center py-2 px-4" style={{ background: 'rgba(11,13,28,0.9)', border: `1px solid ${col}`, color: col, letterSpacing: '0.1em', fontSize: 11 }} role="status" aria-live="polite">
      {msgs[status]}
    </div>
  )
}

/* ─── Core profile form (pure UI, data-source agnostic) ─────────── */

interface ProfileFormProps {
  initialData: ProfileData
  emailReadonly?: boolean
  avatarUrl?: string
  memberSince?: string
  onSave: (data: ProfileData) => Promise<void>
  onSignOut?: () => void
  isClerk: boolean
}

function ProfileForm({ initialData, emailReadonly, avatarUrl, memberSince, onSave, onSignOut, isClerk }: ProfileFormProps) {
  const [form, setForm] = useState<ProfileData>(initialData)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => { setForm(initialData) }, [initialData.email, initialData.firstName])

  const set = (key: keyof ProfileData, value: ProfileData[keyof ProfileData]) =>
    setForm(f => ({ ...f, [key]: value }))

  const toggleInterest = (catId: string, subId: string) => {
    const current = form.interests[catId] || []
    const next = current.includes(subId) ? current.filter(s => s !== subId) : [...current, subId]
    setForm(f => ({ ...f, interests: { ...f.interests, [catId]: next } }))
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      await onSave(form)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3200)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 4000)
    }
  }

  const totalSelected = Object.values(form.interests).reduce((s, a) => s + a.length, 0)
  const displayName = [form.firstName, form.lastName].filter(Boolean).join(' ') || 'Agent on File'
  const initials = form.firstName ? form.firstName[0].toUpperCase() : '?'

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-24 pt-8">

      {/* Operative identity card */}
      <div className="folder-card mb-8" style={{ marginTop: 12 }}>
        <div className="folder-tab aged-paper" style={{ color: 'var(--ink-mid)', fontWeight: 700 }} aria-hidden="true">
          OPERATIVE FILE
        </div>
        <div
          className="aged-paper px-5 py-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center"
          style={{ border: '1px solid rgba(80,55,20,0.28)', boxShadow: '1px 2px 10px rgba(0,0,0,0.45)' }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center font-display font-bold"
            style={{
              width: 68, height: 68, borderRadius: '50%',
              background: avatarUrl ? 'transparent' : 'var(--burgundy)',
              border: '2px solid rgba(160,126,20,0.45)',
              color: '#f0ddc8', fontSize: 24, overflow: 'hidden',
            }}
            aria-label="Profile photo"
          >
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display" style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', fontStyle: 'italic' }}>
              {displayName}
            </div>
            {form.email && (
              <div className="font-type mt-0.5" style={{ fontSize: 10, color: 'var(--ink-faded)', letterSpacing: '0.07em' }}>{form.email}</div>
            )}
            {memberSince && (
              <div className="font-type mt-1" style={{ fontSize: 9, color: 'var(--ink-faded)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Operative since {memberSince}
              </div>
            )}
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="font-type flex-shrink-0 px-3 py-1.5 transition-all hover:brightness-110"
              style={{
                border: '1px solid rgba(80,55,20,0.35)', background: 'rgba(20,14,8,0.1)',
                color: 'var(--ink-faded)', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontSize: 9,
              }}
            >
              Stand Down
            </button>
          )}
        </div>
      </div>

      {/* Identity */}
      <SectionLabel>Identity</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Field label="Given Name" id="firstName">
          <TextInput id="firstName" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First name…" autoComplete="given-name" />
        </Field>
        <Field label="Family Name" id="lastName">
          <TextInput id="lastName" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Last name…" autoComplete="family-name" />
        </Field>
      </div>

      {/* Contact */}
      <SectionLabel>Contact</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Field label={emailReadonly ? 'Electronic Address — verified' : 'Electronic Address'} id="email">
          <TextInput
            id="email" type="email" value={form.email}
            onChange={e => !emailReadonly && set('email', e.target.value)}
            placeholder="address@domain.com" autoComplete="email" readOnly={emailReadonly}
            style={{ opacity: emailReadonly ? 0.6 : 1, cursor: emailReadonly ? 'default' : 'text' }}
          />
        </Field>
        <Field label="Telegraph Number" id="phone">
          <TextInput id="phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 000 000 0000" autoComplete="tel" />
        </Field>
      </div>

      {/* Visited cities */}
      <SectionLabel>Field Record — Cities Visited</SectionLabel>
      <p className="font-body mb-3" style={{ fontSize: 14, color: 'rgba(200,180,140,0.5)', fontStyle: 'italic', lineHeight: 1.5 }}>
        Every city you have investigated, on record. Search any recognized city; the clerk files only those Google and the ledgers can confirm.
      </p>
      <CityTagInput cities={form.visitedCities} onChange={cities => set('visitedCities', cities)} />
      {form.visitedCities.length > 0 && (
        <div className="font-type mt-2" style={{ fontSize: 9, color: 'var(--gold-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {form.visitedCities.length} {form.visitedCities.length === 1 ? 'city' : 'cities'} on record
        </div>
      )}

      {/* Interests */}
      <div className="mt-8">
        <SectionLabel>Case Specialties</SectionLabel>
        <p className="font-body mb-4" style={{ fontSize: 14, color: 'rgba(200,180,140,0.5)', fontStyle: 'italic', lineHeight: 1.5 }}>
          Select every field that interests you. Your assignments will be tailored accordingly.
          {totalSelected > 0 && (
            <span className="font-type not-italic ml-2" style={{ fontSize: 10, color: 'var(--gold-dim)', letterSpacing: '0.1em' }}>
              — {totalSelected} selected
            </span>
          )}
        </p>
        <div className="space-y-0.5">
          {INTEREST_TAXONOMY.map(cat => (
            <InterestCategoryPanel
              key={cat.id}
              category={cat}
              selected={form.interests[cat.id] || []}
              onToggle={subId => toggleInterest(cat.id, subId)}
            />
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="mt-10">
        <SaveBanner status={saveStatus} />
        <div className="flex justify-center mt-4">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="ticket-btn font-type text-xs px-10 py-4 transition-all hover:brightness-110 active:scale-95"
            style={{
              background: saveStatus === 'saving' ? 'rgba(124,27,44,0.55)' : 'var(--burgundy)',
              color: 'var(--cream)', letterSpacing: '0.16em', textTransform: 'uppercase',
              border: 'none', cursor: saveStatus === 'saving' ? 'default' : 'pointer', fontSize: 11,
              boxShadow: '0 0 28px rgba(124,27,44,0.35)',
            }}
            aria-busy={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? 'Filing…' : 'Update the Dossier'}
          </button>
        </div>
        {!isClerk && (
          <div className="font-type text-center mt-6" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(160,126,20,0.3)', textTransform: 'uppercase' }}>
            Local session — add VITE_CLERK_PUBLISHABLE_KEY to enable cloud sync
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Clerk-backed account page ─────────────────────────────────── */

function ClerkAccountPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const clerk = useClerk()
  const { getToken } = useAuth()
  const [authView, setAuthView] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [remoteProfile, setRemoteProfile] = useState<Partial<ProfileData> | null>(null)

  useEffect(() => {
    if (!isSignedIn) return
    let live = true
    void getToken().then(token => loadProfileRemote(token)).then(row => {
      if (live && row) setRemoteProfile(row)
    })
    return () => {
      live = false
    }
  }, [getToken, isSignedIn])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
        <span className="font-type" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
          Consulting the files…
        </span>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-14">
        <div className="mb-6 text-center">
          <p className="font-type mb-1" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
            Access Restricted
          </p>
          <h2 className="font-display" style={{ fontSize: 22, color: 'var(--cream)', fontWeight: 700, fontStyle: 'italic' }}>
            Identify yourself, agent.
          </h2>
        </div>
        <div className="flex items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setAuthView('sign-in')}
            className="font-type px-3 py-1"
            style={{
              letterSpacing: '0.1em',
              fontSize: 10,
              textTransform: 'uppercase',
              color: authView === 'sign-in' ? 'var(--gold-light)' : 'rgba(200,180,140,0.45)',
              background: 'none',
              border: 'none',
              borderBottom: authView === 'sign-in' ? '1px solid var(--gold-light)' : '1px solid transparent',
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setAuthView('sign-up')}
            className="font-type px-3 py-1"
            style={{
              letterSpacing: '0.1em',
              fontSize: 10,
              textTransform: 'uppercase',
              color: authView === 'sign-up' ? 'var(--gold-light)' : 'rgba(200,180,140,0.45)',
              background: 'none',
              border: 'none',
              borderBottom: authView === 'sign-up' ? '1px solid var(--gold-light)' : '1px solid transparent',
              cursor: 'pointer',
            }}
          >
            Sign Up
          </button>
        </div>
        {authView === 'sign-in' ? <SignIn routing="hash" /> : <SignUp routing="hash" />}
      </div>
    )
  }

  const meta = user.unsafeMetadata as { phone?: string; visitedCities?: string[]; interests?: Record<string, string[]> }

  const initialData: ProfileData = {
    firstName: user.firstName || remoteProfile?.firstName || '',
    lastName: user.lastName || remoteProfile?.lastName || '',
    email: user.primaryEmailAddress?.emailAddress || remoteProfile?.email || '',
    phone: meta?.phone || remoteProfile?.phone || user.primaryPhoneNumber?.phoneNumber || '',
    visitedCities: meta?.visitedCities?.length ? meta.visitedCities : remoteProfile?.visitedCities || [],
    interests: Object.keys(meta?.interests || {}).length ? meta.interests! : remoteProfile?.interests || {},
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : undefined

  const handleSave = async (data: ProfileData) => {
    await user.update({
      firstName: data.firstName || undefined,
      lastName: data.lastName || undefined,
      unsafeMetadata: { phone: data.phone, visitedCities: data.visitedCities, interests: data.interests },
    })
    await saveProfileRemote(await getToken(), data)
  }

  return (
    <ProfileForm
      initialData={initialData}
      emailReadonly
      avatarUrl={user.imageUrl}
      memberSince={memberSince}
      onSave={handleSave}
      onSignOut={() => clerk.signOut()}
      isClerk
    />
  )
}

/* ─── Local (no-Clerk) account page ─────────────────────────────── */

function LocalAccountPage() {
  const [profile, setProfile] = useState<ProfileData>(loadLocal)

  const handleSave = async (data: ProfileData) => {
    saveLocal(data)
    setProfile(data)
  }

  return <ProfileForm initialData={profile} onSave={handleSave} isClerk={false} />
}

/* ─── Exported page (routes to Clerk or local) ───────────────────── */

export default function AccountPage() {
  const hasClerk = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  return hasClerk ? <ClerkAccountPage /> : <LocalAccountPage />
}
