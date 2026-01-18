import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error("Root element not found. Check your index.html")
}

// Add viewport class to body for global CSS targeting
const updateViewportClass = () => {
  const width = window.innerWidth
  const body = document.body
  
  // Remove existing classes
  body.classList.remove('viewport-4k', 'viewport-1440p', 'viewport-1080p', 'viewport-768p')
  
  // Add appropriate class
  if (width >= 2560) {
    body.classList.add('viewport-4k')
  } else if (width >= 1920) {
    body.classList.add('viewport-1440p')
  } else if (width >= 1366) {
    body.classList.add('viewport-1080p')
  } else {
    body.classList.add('viewport-768p')
  }
}

// Initialize and listen for resize
updateViewportClass()
window.addEventListener('resize', updateViewportClass)

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)