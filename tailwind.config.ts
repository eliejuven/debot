import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          0: '#0a0a0f',
          1: '#111118',
          2: '#18181f',
          3: '#1e1e27',
          4: '#252530',
        },
        border: {
          DEFAULT: '#2a2a35',
          strong: '#3a3a48',
        },
        accent: {
          blue: '#4f8ef7',
          green: '#3ecf8e',
          yellow: '#f5a623',
          red: '#f44336',
          purple: '#9b59b6',
        },
        text: {
          primary: '#e8e8f0',
          secondary: '#9898a8',
          muted: '#5a5a70',
        },
      },
    },
  },
  plugins: [],
}

export default config
