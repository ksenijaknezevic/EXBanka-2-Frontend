import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1e3a8a',
          color: '#fff',
          borderRadius: '8px',
          fontSize: '14px',
        },
        error: {
          style: {
            background: '#dc2626',
          },
        },
        success: {
          style: {
            background: '#16a34a',
          },
        },
      }}
    />
  </StrictMode>
)
