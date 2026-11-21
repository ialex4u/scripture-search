/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        reading: ['Georgia', '"Iowan Old Style"', '"Palatino Linotype"', 'serif'],
        arabic: ['"Noto Sans Arabic"', '"Traditional Arabic"', 'serif'],
        devanagari: ['"Noto Sans Devanagari"', '"Nirmala UI"', 'serif'],
        hebrew: ['"Noto Sans Hebrew"', '"David CLM"', 'serif'],
        gurmukhi: ['"Noto Sans Gurmukhi"', '"Raavi"', 'serif'],
        han: ['"Noto Sans SC"', '"Noto Sans JP"', '"PingFang SC"', '"Hiragino Sans"', 'serif'],
      },
      colors: {
        parchment: {
          50: '#fbf9f5',
          100: '#f5f0e6',
          200: '#e9e0cf',
        },
        ink: {
          900: '#1c1917',
          800: '#292524',
          700: '#44403c',
        },
        accent: {
          DEFAULT: '#0f766e',
          soft: '#ccfbf1',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,25,23,.06), 0 8px 24px -12px rgba(28,25,23,.18)',
      },
      maxWidth: { reader: '46rem' },
    },
  },
  plugins: [],
}
