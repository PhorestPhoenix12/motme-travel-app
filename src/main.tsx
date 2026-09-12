import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { loadClerkPublishableKey } from './lib/clerk-config'
import { AuthGateSplash } from './IntroPage'
import './index.css'

const view = ReactDOM.createRoot(document.getElementById('root')!)

view.render(
  <React.StrictMode>
    <AuthGateSplash />
  </React.StrictMode>,
)

async function mount() {
  const clerkPublishableKey = await loadClerkPublishableKey()
  if (!clerkPublishableKey) {
    view.render(
      <React.StrictMode>
        <App clerkEnabled={false} />
      </React.StrictMode>,
    )
    return
  }

  const { ClerkProvider } = await import('@clerk/clerk-react')
  view.render(
    <React.StrictMode>
          <ClerkProvider
            publishableKey={clerkPublishableKey}
            afterSignOutUrl="/"
            signInFallbackRedirectUrl="/"
            signUpFallbackRedirectUrl="/"
            allowedRedirectOrigins={[
              'https://motme.vercel.app',
              typeof window !== 'undefined' ? window.location.origin : '',
            ].filter(Boolean)}
          >
        <App clerkEnabled />
      </ClerkProvider>
    </React.StrictMode>,
  )
}

void mount()
