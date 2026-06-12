/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/renderer/src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
        mono: ['SF Mono', 'JetBrains Mono', 'Fira Code', 'monospace']
      },
      colors: {
        'od-sidebar': 'var(--bg-sidebar)',
        'od-content': 'var(--bg-content)',
        'od-input': 'var(--bg-input)',
        'od-border': 'var(--border)',
        'od-accent': 'var(--accent)',
        'od-text': 'var(--text-primary)',
        'od-muted': 'var(--text-muted)'
      },
      borderRadius: {
        'od': '8px'
      }
    }
  },
  plugins: []
}