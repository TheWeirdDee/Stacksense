import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#0D0D0D',
        'bg-surface': '#141414',
        'bg-elevated': '#1C1C1C',
        'bg-border': '#272727',
        'text-primary': '#F0F0F0',
        'text-secondary': '#8A8A8A',
        'text-muted': '#4A4A4A',
        brand: '#E85D04',
        bull: '#22C55E',
        risk: '#F59E0B',
        anom: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
