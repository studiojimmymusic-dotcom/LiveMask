/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        accent: '#FF6B00',
        'accent-hover': '#FF8C00',
        surface: '#141414',
        'surface-raised': '#1E1E1E',
        border: '#2A2A2A'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: []
}
