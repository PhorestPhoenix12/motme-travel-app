import { SignInButton, SignUpButton } from '@clerk/clerk-react'

export function AuthGateSplash() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--navy)', fontFamily: 'Crimson Text, Georgia, serif' }}
    >
      <div className="text-center px-6">
        <div className="font-display flex items-center justify-center gap-2 mb-2" style={{ color: 'var(--gold-light)', letterSpacing: '0.06em' }}>
          <span style={{ fontSize: 11, color: 'var(--gold-dim)', fontFamily: 'Courier Prime, monospace' }}>✦</span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>MotME</span>
          <span style={{ fontSize: 11, color: 'var(--gold-dim)', fontFamily: 'Courier Prime, monospace' }}>✦</span>
        </div>
        <p className="font-type mb-4" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
          Mystery of the Midnight Express
        </p>
        <p className="font-type" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
          Consulting the files…
        </p>
      </div>
    </div>
  )
}

export default function IntroPage() {
  return (
    <div
      className="min-h-screen relative overflow-hidden page-enter"
      style={{ background: 'var(--navy)', fontFamily: 'Crimson Text, Georgia, serif' }}
    >
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <img
          src="https://images.unsplash.com/photo-1770107830481-1dd16d511ac2?w=1600&h=900&fit=crop&auto=format"
          alt=""
          className="w-full h-full object-cover"
          style={{ opacity: 0.16, filter: 'sepia(60%) saturate(60%)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(11,13,28,0.45) 0%, rgba(11,13,28,0.82) 48%, var(--navy) 100%)' }}
        />
      </div>

      <header className="relative z-10 flex flex-col items-center justify-center pt-10 pb-2">
        <div className="font-display flex items-center gap-2 select-none" style={{ color: 'var(--gold-light)', letterSpacing: '0.06em' }}>
          <span style={{ fontSize: 11, color: 'var(--gold-dim)', fontFamily: 'Courier Prime, monospace' }}>✦</span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>MotME</span>
          <span style={{ fontSize: 11, color: 'var(--gold-dim)', fontFamily: 'Courier Prime, monospace' }}>✦</span>
        </div>
        <p className="font-type mt-2" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
          Mystery of the Midnight Express
        </p>
      </header>

      <main className="relative z-10 px-6 pt-8 pb-16 max-w-3xl mx-auto">
        <div className="flex items-center justify-center pb-6" aria-hidden="true">
          <div style={{ width: 180, height: 1, background: 'linear-gradient(to right, transparent, var(--gold-dim), transparent)' }} />
        </div>

        <div className="text-center">
          <p className="font-type mb-3" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'var(--gold)', textTransform: 'uppercase' }}>
            Credentials required
          </p>
          <h1
            className="font-display"
            style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 700, color: 'var(--cream)', lineHeight: 1.1 }}
          >
            All cities have<br />
            <em style={{ color: 'var(--gold-light)', fontStyle: 'italic' }}>secrets worth pursuing.</em>
          </h1>
          <p
            className="font-body mt-5"
            style={{ fontSize: 18, color: 'rgba(220,200,160,0.72)', maxWidth: 520, margin: '1.2rem auto 0', lineHeight: 1.6 }}
          >
            Board the Midnight Express. Follow classified leads through real streets,
            name what you find, and keep a dossier of the cases you close.
            Identify yourself before the night clerk opens the files.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-10">
          <SignInButton mode="modal">
            <button
              type="button"
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
              Sign In — Board the Train
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              type="button"
              className="font-type px-8 py-3.5 text-sm transition-all hover:brightness-110"
              style={{
                background: 'transparent',
                color: 'var(--gold-light)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                border: '1px solid rgba(160,126,20,0.45)',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              Request a Commission
            </button>
          </SignUpButton>
        </div>

        <ul className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              code: 'I',
              title: 'Choose a destination',
              body: 'Pick a city and your fields of inquiry. The clerk prepares a dossier of real places — names sealed until you find them.',
            },
            {
              code: 'II',
              title: 'Follow the leads',
              body: 'Each case opens with a classified clue. Recover keys as you close files, and spend them to unlock the next hint.',
            },
            {
              code: 'III',
              title: 'Keep the album',
              body: 'File photographs and field notes. What you uncover stays in your dossier, yours alone to record.',
            },
          ].map(item => (
            <li
              key={item.code}
              className="px-5 py-5"
              style={{ background: 'rgba(20,22,40,0.72)', border: '1px solid rgba(160,126,20,0.28)' }}
            >
              <div className="font-type mb-2" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
                Brief {item.code}
              </div>
              <h2 className="font-display mb-2" style={{ fontSize: 18, color: 'var(--cream)', fontWeight: 600 }}>
                {item.title}
              </h2>
              <p className="font-body" style={{ fontSize: 15, color: 'rgba(220,200,160,0.65)', lineHeight: 1.55 }}>
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </main>

      <div className="relative z-10 flex items-center justify-center pb-10" aria-hidden="true">
        <div style={{ width: 180, height: 1, background: 'linear-gradient(to right, transparent, var(--gold-dim), transparent)' }} />
      </div>
    </div>
  )
}
