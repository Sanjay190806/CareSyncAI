/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        command: {
          bg: '#050816',
          surface: '#0A0F1E',
          elevated: '#121A2B',
          muted: '#94A3B8',
          glow: '#22D3EE',
        },
        tier: {
          1: '#00CC66',
          2: '#0EA5E9',
          3: '#FBBF24',
          4: '#F97316',
          5: '#EF4444',
        },
        clinical: {
          bg: '#050816',
          surface: '#0A0F1E',
          elevated: '#121A2B',
          green: '#00CC66',
          teal: '#0EA5E9',
          amber: '#FBBF24',
          orange: '#F97316',
          red: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(34, 211, 238, 0.15)',
        'glow-red': '0 0 24px rgba(239, 68, 68, 0.35)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
