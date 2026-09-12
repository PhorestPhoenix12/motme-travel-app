import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const root = document.getElementById('root')!
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

async function mount() {
  if (publishableKey) {
    const { ClerkProvider } = await import('@clerk/clerk-react')
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <ClerkProvider publishableKey={publishableKey}>
          <App />
        </ClerkProvider>
      </React.StrictMode>,
    )
  } else {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  }
}

mount()
