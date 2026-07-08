import './lib/api-stub'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import 'highlight.js/styles/atom-one-dark.css'

// Web3 workbench is dark-only. Force the `dark` class before first render
// so any CSS variable lookup (`var(--bg-*)`) resolves to the dark token,
// regardless of system color scheme.
document.documentElement.classList.add('dark')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
